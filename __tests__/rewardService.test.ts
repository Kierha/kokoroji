/**
 * Tests unitaires pour le service rewardService.
 * Vérifie les opérations CRUD sur les récompenses personnalisées.
 * Les accès à la base SQLite et au logService sont mockés.
 */

import {
  getAllRewards,
  addReward,
  updateReward,
  deleteReward,
} from "../src/services/rewardService";
import { getDatabaseAsync } from "../src/database/db";
import { addLog } from "../src/services/logService";
import type { Reward } from "../src/models/reward";

// Mocks des dépendances
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
  addLog: jest.fn(),
}));

describe("rewardService", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  /**
   * Vérifie la récupération de toutes les récompenses d'une famille, triées par date de création.
   */
  it("getAllRewards renvoie les récompenses triées par date", async () => {
    const fakeRewards: Reward[] = [{ id: 1, family_id: 123, title: "Test" } as any];
    mockDb.getAllAsync.mockResolvedValue(fakeRewards);

    const result = await getAllRewards(123);

    expect(getDatabaseAsync).toHaveBeenCalled();
    // Utilise stringMatching pour ignorer les différences d'indentation et de lignes
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT \* FROM reward_custom[\s\S]*WHERE family_id = \?[\s\S]*ORDER BY created_at DESC;/),
      ["123"]
    );
    expect(result).toEqual(fakeRewards);
  });

  /**
   * Vérifie l'insertion d'une récompense personnalisée et l'enregistrement du log correspondant.
   */
  it("addReward insère une récompense et journalise l'action", async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42 });

    const reward = { family_id: 1, title: "Nouvelle récompense" } as any;
    const id = await addReward(reward);

    expect(mockDb.runAsync).toHaveBeenCalled();
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Ajout d'une récompense personnalisée",
      })
    );
    expect(id).toBe(42);
  });

  /**
   * Vérifie la mise à jour d'une récompense et l'enregistrement du log correspondant.
   */
  it("updateReward met à jour une récompense et journalise", async () => {
    const reward = { id: 10, family_id: 1, title: "Modifiée" } as any;
    await updateReward(reward);

    expect(mockDb.runAsync).toHaveBeenCalled();
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Modification d'une récompense",
      })
    );
  });

  /**
   * Doit lever une erreur si l'identifiant de la récompense est manquant lors de la mise à jour.
   */
  it("updateReward lève une erreur si id manquant", async () => {
    await expect(updateReward({ family_id: 1, title: "Sans ID" } as any)).rejects.toThrow(
      "ID de la récompense requis pour la mise à jour"
    );
  });

  /**
   * Vérifie la suppression d'une récompense et l'enregistrement du log correspondant.
   */
  it("deleteReward supprime une récompense et journalise", async () => {
    await deleteReward(5, 1);

    // Utilise stringMatching pour ignorer les différences d'indentation et de lignes
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM reward_custom[\s\S]*WHERE id = \? AND family_id = \?;/),
      [5, "1"]
    );
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Suppression d'une récompense personnalisée",
      })
    );
  });
});
