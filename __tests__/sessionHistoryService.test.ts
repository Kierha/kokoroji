/**
 * Tests unitaires pour le service sessionHistoryService.
 * Vérifie le chargement de l’historique avec filtres (dates, recherche), le mapping des participants, l’ordre par date, et la journalisation en cas d’erreur.
 * Les accès SQLite et le service de logs sont mockés.
 */

import { getSessionHistory } from "../src/services/sessionHistoryService";
import { getDatabaseAsync } from "../src/database/db";
import { addLog } from "../src/services/logService";

jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
  addLog: jest.fn(),
}));

describe("sessionHistoryService", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    jest.useFakeTimers().setSystemTime(new Date("2025-08-17T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Vérifie le chargement sans filtres et l’ordre décroissant sur started_at.
   */
  it("retourne l’historique sans filtres, trié par started_at DESC", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        id: 1,
        family_id: "1",
        started_at: "2025-08-10T10:00:00.000Z",
        ended_at: null,
        session_type: "random",
        location: "interieur",
        planned_duration_min: 30,
        children_ids: "[10,11]",
        defis_count: 2,
        coins_sum: 40,
        media_count: 1,
      },
    ]);

    const rows = await getSessionHistory(1);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/FROM\s+session\s+s[\s\S]*WHERE\s+s\.family_id\s*=\s*\?[\s\S]*ORDER\s+BY\s+s\.started_at\s+DESC;/i),
      ["1"]
    );

    expect(rows).toEqual([
      {
        id: 1,
        family_id: 1,
        started_at: "2025-08-10T10:00:00.000Z",
        ended_at: null,
        session_type: "random",
        location: "interieur",
        planned_duration_min: 30,
        participants: [10, 11],
        defis_count: 2,
        coins_sum: 40,
        media_count: 1,
      },
    ]);
  });

  /**
   * Vérifie l’application des filtres de dates (YYYY-MM-DD) converties en bornes ISO.
   */
  it("applique les bornes startDate/endDate converties en ISO", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    const start = "2025-08-01";
    const end = "2025-08-16";
    const expectedStartIso = "2025-08-01T00:00:00.000Z";
    const expectedEndIso = "2025-08-16T23:59:59.999Z";

    await getSessionHistory(1, { startDate: start, endDate: end });

    const call = mockDb.getAllAsync.mock.calls[0];
    const params = call[1];

    expect(call[0]).toMatch(/s\.started_at\s*>=\s*\?/i);
    expect(call[0]).toMatch(/s\.started_at\s*<=\s*\?/i);
    expect(params).toEqual(["1", expectedStartIso, expectedEndIso]);
  });

  /**
   * Vérifie la recherche plein-texte sur session_type, location, created_by et l’ID casté en texte.
   */
  it("applique le filtre search sur type, location, created_by et id", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    const search = "Pédago";

    await getSessionHistory(2, { search });

    const call = mockDb.getAllAsync.mock.calls[0];
    const sql = call[0] as string;
    const params = call[1] as any[];

    expect(sql).toMatch(/LOWER\(COALESCE\(s\.session_type,[^)]+\)\)\s+LIKE\s+\?/i);
    expect(sql).toMatch(/LOWER\(COALESCE\(s\.location,[^)]+\)\)\s+LIKE\s+\?/i);
    expect(sql).toMatch(/LOWER\(COALESCE\(s\.created_by,[^)]+\)\)\s+LIKE\s+\?/i);
    expect(sql).toMatch(/CAST\(s\.id\s+AS\s+TEXT\)\s+LIKE\s+\?/i);

    // famille + 3 LIKE en minuscule + LIKE sur id en texte non transformé
    expect(params[0]).toBe("2");
    expect(params.slice(-4, -1)).toEqual([
      `%${search.toLowerCase()}%`,
      `%${search.toLowerCase()}%`,
      `%${search.toLowerCase()}%`,
    ]);
    expect(params.at(-1)).toBe(`%${search}%`);
  });

  /**
   * Vérifie la robustesse du parsing des participants lorsque children_ids est invalide.
   */
  it("gère un children_ids invalide en renvoyant un tableau vide", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        id: 3,
        family_id: "1",
        started_at: "2025-08-12T09:00:00.000Z",
        ended_at: "2025-08-12T09:30:00.000Z",
        session_type: "bundle",
        location: "exterieur",
        planned_duration_min: 25,
        children_ids: "{not-json}",
        defis_count: 1,
        coins_sum: 15,
        media_count: 0,
      },
    ]);

    const rows = await getSessionHistory(1);

    expect(rows[0].participants).toEqual([]);
  });

  /**
   * Vérifie la journalisation et la remontée d’erreur si la requête SQL échoue.
   */
  it("journalise et relance l’erreur en cas d’échec BDD", async () => {
    mockDb.getAllAsync.mockRejectedValueOnce(new Error("SQL failed"));

    await expect(getSessionHistory(1, { search: "x" })).rejects.toThrow("SQL failed");

    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_type: "system",
        level: "error",
        context: "Erreur getSessionHistory",
      })
    );
  });
});