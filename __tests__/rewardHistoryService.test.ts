/**
 * Tests unitaires pour le service rewardHistoryService.
 * Vérifie la récupération de l'historique des récompenses
 * avec filtres par texte, dates et identifiant,
 * ainsi que le parsing robuste des IDs enfants.
 * Les accès à la base SQLite sont mockés.
 */

import { getRewardHistory } from "../src/services/rewardHistoryService";
import { getDatabaseAsync } from "../src/database/db";

jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));

describe("rewardHistoryService", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  /**
   * Vérifie la récupération simple de l'historique sans filtre.
   */
  it("renvoie l'historique complet trié par date", async () => {
    const fakeRows = [
      {
        reward_id: "10",
        family_id: "1",
        children_ids: "[1,2]",
        session_id: 5,
        received_at: "2025-08-10",
        received_by: "Parent",
        is_synced: 1,
        title: "Récompense",
        description: "Desc",
        cost: 50,
      },
    ];
    mockDb.getAllAsync.mockResolvedValue(fakeRows);

    const results = await getRewardHistory(1);

    expect(getDatabaseAsync).toHaveBeenCalled();
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY h.received_at DESC"),
      ["1"]
    );
    expect(results[0]).toMatchObject({
      reward_id: 10,
      family_id: 1,
      children_ids: [1, 2],
      title: "Récompense",
      cost: 50,
    });
  });

  /**
   * Vérifie l'application du filtre par rewardId.
   */
  it("applique le filtre rewardId", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getRewardHistory(1, { rewardId: 5 });

    const [query, params] = mockDb.getAllAsync.mock.calls[0];
    expect(query).toContain("h.reward_id = ?");
    expect(params).toContain("5");
  });

  /**
   * Vérifie l'application du filtre par texte (search).
   */
  it("applique le filtre search sur received_by et title", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getRewardHistory(1, { search: "test" });

    const [query, params] = mockDb.getAllAsync.mock.calls[0];
    expect(query).toContain("h.received_by LIKE ?");
    expect(query).toContain("r.title LIKE ?");
    expect(params).toContain("%test%");
  });

  /**
   * Vérifie l'application des filtres startDate et endDate.
   */
  it("applique les filtres de dates", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getRewardHistory(1, { startDate: "2025-01-01", endDate: "2025-01-31" });

    const [query, params] = mockDb.getAllAsync.mock.calls[0];
    expect(query).toContain("h.received_at >= ?");
    expect(query).toContain("h.received_at <= ?");
    expect(params).toContain("2025-01-01");
    expect(params).toContain("2025-01-31");
  });

  /**
   * Vérifie le parsing robuste d'IDs enfants invalides.
   */
  it("parse correctement children_ids invalides", async () => {
    const fakeRows = [
      {
        reward_id: "1",
        family_id: "1",
        children_ids: "invalid-json",
        session_id: undefined,
        received_at: "2025-08-10",
        received_by: null,
        is_synced: 1,
        title: "Récompense",
        description: "",
        cost: 10,
      },
    ];
    mockDb.getAllAsync.mockResolvedValue(fakeRows);

    const results = await getRewardHistory(1);
    expect(results[0].children_ids).toEqual([]);
  });
});
