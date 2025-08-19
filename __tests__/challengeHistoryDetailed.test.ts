/**
 * Tests unitaires pour getDefiHistoryDetailed.
 * Vérifie ordre DESC, jointure titre, résolution/fallback noms enfants et filtres (search, dates).
 */
import { getDefiHistoryDetailed } from "../src/services/challengeHistoryService";
import { getDatabaseAsync } from "../src/database/db";

jest.mock("../src/database/db", () => ({ getDatabaseAsync: jest.fn() }));

describe("getDefiHistoryDetailed", () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = { getAllAsync: jest.fn() };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  it("renvoie résultats triés (DESC) + participant_names résolus + titre joint", async () => {
    // Première requête: defi_history + defi_custom join
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { id: 2, defi_id: 7, family_id: 1, children_ids: "[5]", session_id: null, completed_at: "2025-08-11T10:00:00Z", completed_by: "Parent", is_synced: 0, defi_title: "Défi 7" },
        { id: 1, defi_id: 5, family_id: 1, children_ids: "[3,4]", session_id: null, completed_at: "2025-08-10T09:00:00Z", completed_by: null, is_synced: 0, defi_title: null },
      ])
      // Deuxième requête: children names
      .mockResolvedValueOnce([
        { id: 3, name: "Alice" },
        { id: 4, name: "Bob" },
        { id: 5, name: "Charlie" },
      ]);

    const res = await getDefiHistoryDetailed(1);
    expect(res.map(r => r.id)).toEqual([2,1]);
    const h2 = res[0];
    expect(h2.title).toBe("Défi 7");
    expect(h2.participant_names).toEqual(["Charlie"]);
    const h1 = res[1];
    expect(h1.title).toBeUndefined();
    expect(h1.participant_names).toEqual(["Alice","Bob"]);
  });

  /**
   * Vérifie l'application des filtres (search + bornes) et le fallback de nom d'enfant absent (Enfant X).
   */
  it("applique filtres search / dates (vérif SQL) et fallback nom enfant", async () => {
    // Premier appel: une ligne + aucun enfant résolu
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { id: 3, defi_id: 9, family_id: 1, children_ids: "[42]", session_id: null, completed_at: "2025-08-12T12:00:00Z", completed_by: "Parent", is_synced: 0, defi_title: null }
      ])
      .mockResolvedValueOnce([])
      // Deuxième appel (sans dates) même ligne
      .mockResolvedValueOnce([
        { id: 4, defi_id: 11, family_id: 1, children_ids: "[77]", session_id: null, completed_at: "2025-08-13T09:00:00Z", completed_by: "X", is_synced: 0, defi_title: null }
      ])
      .mockResolvedValueOnce([]);

    await getDefiHistoryDetailed(1, { search: "abc", startDate: "2025-08-01", endDate: "2025-08-31" });
    const firstCallArgs = mockDb.getAllAsync.mock.calls[0];
    expect(firstCallArgs[0]).toContain("LOWER(COALESCE(h.completed_by");
    expect(firstCallArgs[1]).toEqual(["1","2025-08-01","2025-08-31","%abc%","%abc%","%abc%"]);

    const res2 = await getDefiHistoryDetailed(1, { search: "abc" });
    expect(res2[0].participant_names[0]).toBe("Enfant 77");
  });
});
