/**
 * Tests unitaires pour le service defiHistoryService.
 * Vérifie la récupération et le filtrage de l’historique des défis,
 * l’insertion d’une nouvelle entrée,
 * et la suppression par identifiant.
 * Les appels à la base SQLite sont mockés.
 */

import {
  getDefiHistory,
  addDefiHistory,
  deleteDefiHistory,
} from "../src/services/challengeHistoryService";
import { getDatabaseAsync } from "../src/database/db";
import type { DefiHistory } from "../src/models/challengeHistory";

// Mocks des dépendances
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));

describe("defiHistoryService", () => {
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
   * Vérifie la conversion des champs récupérés depuis la base en types corrects.
   */
  it("getDefiHistory renvoie les résultats convertis correctement", async () => {
    const fakeRows = [
      {
        id: 1,
        defi_id: "10",
        family_id: "1",
        children_ids: "[1,2]",
        session_id: "abc",
        completed_at: "2025-08-10T12:00:00Z",
        completed_by: "Parent",
        is_synced: 0,
      },
    ];
    mockDb.getAllAsync.mockResolvedValue(fakeRows);

    const result = await getDefiHistory(1);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      `SELECT * FROM defi_history WHERE family_id = ? ORDER BY completed_at DESC`,
      ["1"]
    );
    expect(result).toEqual([
      {
        id: 1,
        defi_id: 10,
        family_id: 1,
        children_ids: [1, 2],
        session_id: "abc",
        completed_at: "2025-08-10T12:00:00Z",
        completed_by: "Parent",
        is_synced: 0,
      },
    ]);
  });

  /**
   * Vérifie l’application correcte des filtres de recherche et de dates.
   */
  it("getDefiHistory applique correctement les filtres search, startDate et endDate", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getDefiHistory(1, {
      search: "Jean",
      startDate: "2025-08-01",
      endDate: "2025-08-31",
    });

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("completed_by LIKE ?"),
      ["1", "%Jean%", "2025-08-01", "2025-08-31"]
    );
  });

  /**
   * Vérifie que les valeurs nulles de children_ids sont transformées en tableau vide.
   */
  it("getDefiHistory gère le cas children_ids vide ou null", async () => {
    mockDb.getAllAsync.mockResolvedValue([
      {
        defi_id: "5",
        family_id: "1",
        children_ids: null,
        completed_at: "2025-08-10",
        is_synced: 0,
      },
    ]);

    const result = await getDefiHistory(1);
    expect(result[0].children_ids).toEqual([]);
  });

  /**
   * Vérifie l’insertion d’une nouvelle entrée et le retour de son identifiant.
   */
  it("addDefiHistory insère une entrée et retourne l'id", async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 99 });

    const newHistory: Omit<DefiHistory, "id" | "is_synced"> = {
      defi_id: 10,
      family_id: 1,
      children_ids: [1, 2],
      session_id: 123,
      completed_at: "2025-08-10",
      completed_by: "Parent",
    };

    const id = await addDefiHistory(newHistory);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO defi_history"),
      [
        "10",
        "1",
        JSON.stringify([1, 2]),
        123,
        "2025-08-10",
        "Parent",
      ]
    );
    expect(id).toBe(99);
  });

  /**
   * Vérifie la suppression d’une entrée par identifiant.
   */
  it("deleteDefiHistory supprime une entrée par id", async () => {
    await deleteDefiHistory(5);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      `DELETE FROM defi_history WHERE id = ?;`,
      [5]
    );
  });
});
