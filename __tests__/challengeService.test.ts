/**
 * Tests unitaires pour le service challengeService.
 * Vérifie les opérations CRUD sur les défis personnalisés,
 * la recherche avec filtres,
 * l’importation des défis par défaut avec gestion de transaction,
 * et la réactivation des défis complétés.
 * Les accès à la base SQLite et au logService sont mockés.
 */

import {
  getAllChallenges,
  addChallenge,
  updateChallenge,
  deleteChallenge,
  searchChallenges,
  importDefaultChallenges,
  reactivateChallenges,
} from "../src/services/challengeService";
import { getDatabaseAsync } from "../src/database/db";
import { addLog } from "../src/services/logService";
import type { Defi } from "../src/models/defi";

// Mocks des dépendances
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
  addLog: jest.fn(),
}));

describe("challengeService", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
      execAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  /**
   * Vérifie la récupération de tous les défis d'une famille, triés par date de création.
   */
  it("getAllChallenges renvoie les défis triés par date", async () => {
    const fakeChallenges: Defi[] = [{ id: 1, family_id: 123, title: "Test" } as any];
    mockDb.getAllAsync.mockResolvedValue(fakeChallenges);

    const result = await getAllChallenges(123);

    expect(getDatabaseAsync).toHaveBeenCalled();
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      `SELECT * FROM defi_custom WHERE family_id = ? ORDER BY created_at DESC;`,
      ["123"]
    );
    expect(result).toEqual(fakeChallenges);
  });

  /**
   * Vérifie l'insertion d'un défi personnalisé et l'enregistrement du log correspondant.
   */
  it("addChallenge insère un défi et journalise l'action", async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42 });

    const defi = { family_id: 1, title: "Nouveau défi" } as any;
    const id = await addChallenge(defi);

    expect(mockDb.runAsync).toHaveBeenCalled();
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Ajout d'un défi personnalisé",
      })
    );
    expect(id).toBe(42);
  });

  /**
   * Vérifie la mise à jour d'un défi et l'enregistrement du log correspondant.
   */
  it("updateChallenge met à jour un défi et journalise", async () => {
    const defi = { id: 10, family_id: 1, title: "Modifié" } as any;
    await updateChallenge(defi);

    expect(mockDb.runAsync).toHaveBeenCalled();
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Modification d'un défi",
      })
    );
  });

  /**
   * Doit lever une erreur si l'identifiant du défi est manquant lors de la mise à jour.
   */
  it("updateChallenge lève une erreur si id manquant", async () => {
    await expect(updateChallenge({ family_id: 1, title: "Sans ID" } as any)).rejects.toThrow(
      "ID du défi requis pour la mise à jour"
    );
  });

  /**
   * Vérifie la suppression d'un défi et l'enregistrement du log correspondant.
   */
  it("deleteChallenge supprime un défi et journalise", async () => {
    await deleteChallenge(5, 1);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `DELETE FROM defi_custom WHERE id = ? AND family_id = ?;`,
      [5, "1"]
    );
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Suppression d'un défi personnalisé",
      })
    );
  });

  /**
   * Vérifie que la recherche effectue bien un LIKE sur le titre, la catégorie et le lieu.
   */
  it("searchChallenges exécute la requête avec LIKE sur titre, catégorie, lieu", async () => {
    mockDb.getAllAsync.mockResolvedValue([{ id: 1, title: "abc" }]);
    const results = await searchChallenges(1, "abc");

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("title LIKE ?"),
      ["1", "%abc%", "%abc%", "%abc%"]
    );
    expect(results).toEqual([{ id: 1, title: "abc" }]);
  });

  describe("importDefaultChallenges", () => {
    let originalLog: any;
    let originalError: any;

    beforeEach(() => {
      originalLog = console.log;
      originalError = console.error;
      console.log = jest.fn();
      console.error = jest.fn();
    });

    afterEach(() => {
      console.log = originalLog;
      console.error = originalError;
    });

    /**
     * Vérifie l'insertion des défis par défaut et la validation de la transaction.
     */
    it("insère les défis et commit la transaction", async () => {
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      await importDefaultChallenges(1, [{ title: "Défi" }]);

      expect(mockDb.execAsync).toHaveBeenCalledWith("BEGIN TRANSACTION;");
      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(mockDb.execAsync).toHaveBeenCalledWith("COMMIT;");
      expect(addLog).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "Import des défis par défaut",
          details: JSON.stringify({ count: 1 }),
        })
      );
    });

    /**
     * Vérifie qu'un rollback est effectué si une erreur survient.
     */
    it("fait un rollback si erreur", async () => {
      mockDb.runAsync.mockRejectedValue(new Error("fail"));

      await expect(importDefaultChallenges(1, [{ title: "Défi" }])).rejects.toThrow("fail");
      expect(mockDb.execAsync).toHaveBeenCalledWith("ROLLBACK;");
    });
  });

  /**
   * Vérifie la réactivation de défis : suppression de l'historique et log.
   */
  it("reactivateChallenges supprime les entrées defi_history et journalise", async () => {
    await reactivateChallenges(1, [10, 20]);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM defi_history"),
      ["1", "10", "20"]
    );
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Réactivation de défi(s)",
      })
    );
  });

  /**
   * Vérifie qu'aucune action n'est faite si la liste de défis est vide.
   */
  it("reactivateChallenges ne fait rien si defiIds est vide", async () => {
    await reactivateChallenges(1, []);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
    expect(addLog).not.toHaveBeenCalled();
  });
});
