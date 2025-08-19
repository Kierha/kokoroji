/**
 * Tests unitaires pour le service sessionService.
 * Vérifie la création, la récupération, la clôture et le résumé de session,
 * ainsi que l’historisation des défis, l’attribution de Koro-Coins et l’attache de médias.
 * Les accès SQLite et le service de logs sont mockés.
 */

import {
  startSession,
  getActiveSession,
  endSession,
  getSessionById,
  getSessionsHistory,
  getSessionSummary,
  completeDefiInSession,
  awardCoinsForChildren,
  attachMediaToSession,
} from "../src/services/sessionService";
import { getDatabaseAsync } from "../src/database/db";
import { addLog } from "../src/services/logService";

jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
  addLog: jest.fn(),
}));

describe("sessionService", () => {
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
   * Vérifie la création d’une session, son insertion, sa relecture et la journalisation.
   */
  it("startSession insère une session, relit la ligne et journalise la création", async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([]) // aucune session active
      .mockResolvedValueOnce([
        {
          id: 99,
          family_id: "1",
          children_ids: JSON.stringify([10, 11]),
          started_at: "2025-08-17T12:00:00.000Z",
          ended_at: null,
          session_type: "random",
          location: "interieur",
          category: "ludique",
          planned_duration_min: 30,
          total_defis_completed: 0,
          total_korocoins_awarded: 0,
          is_synced: 0,
        },
      ]);
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 99 });

    const session = await startSession({
      familyId: 1,
      childIds: [10, 11],
      type: "random",
      location: "interieur",
      plannedDurationMin: 30,
      category: "ludique",
      createdBy: "parent@demo",
      lookbackDays: 30,
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT\s+INTO\s+session/i),
      expect.arrayContaining(["1", JSON.stringify([10, 11]), expect.any(String), "parent@demo", "random", "interieur", 30, "ludique"])
    );
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "session", level: "info", context: "Session créée", ref_id: "99" }));
    expect(session?.id).toBe(99);
  });

  /**
   * Vérifie que la création échoue si une session active existe déjà.
   */
  it("startSession lève une erreur s’il existe déjà une session active", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 1 }]);
    await expect(startSession({ familyId: 1, childIds: [10], type: "random", lookbackDays: 30 } as any)).rejects.toThrow("Une session active existe déjà pour cette famille.");
  });

  /**
   * Vérifie la journalisation en cas d’incohérence après insertion.
   */
  it("startSession journalise une incohérence si la session relue est introuvable", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 101 });

    await expect(startSession({ familyId: 1, childIds: [], type: "random", lookbackDays: 30 } as any)).rejects.toThrow("Session introuvable après insertion.");

    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "error", level: "error", context: "Incohérence post-insert session" }));
  });

  /**
   * Vérifie la récupération de la session active.
   */
  it("getActiveSession renvoie la dernière session non terminée", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 7, family_id: "1", ended_at: null }]);
    const s = await getActiveSession(1);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringMatching(/ended_at\s+IS\s+NULL/i), ["1"]);
    expect(s?.id).toBe(7);
  });

  /**
   * Vérifie l’idempotence de la clôture si la session est déjà terminée.
   */
  it("endSession est idempotent si la session est déjà terminée", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 5, family_id: "1", children_ids: "[]", ended_at: "2025-08-16T10:00:00.000Z" }]);
    const s = await endSession(5);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
    expect(s.ended_at).toBe("2025-08-16T10:00:00.000Z");
  });

  /**
   * Vérifie la clôture complète avec calcul des totaux et journalisation.
   */
  it("endSession calcule les totaux, met à jour et journalise la fin", async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([{ id: 6, family_id: "1", children_ids: "[1,2]", ended_at: null }])
      .mockResolvedValueOnce([{ c: 3 }])
      .mockResolvedValueOnce([{ s: 120 }])
      .mockResolvedValueOnce([{ id: 6, family_id: "1", children_ids: "[1,2]", ended_at: "2025-08-17T12:00:00.000Z", total_defis_completed: 3, total_korocoins_awarded: 120 }]);
    mockDb.runAsync.mockResolvedValueOnce(undefined);

    const updated = await endSession(6);

    expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringMatching(/UPDATE\s+session/i), [expect.any(String), 3, 120, 6]);
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "session", level: "info", context: "Fin de session", ref_id: "6" }));
    expect(updated.total_defis_completed).toBe(3);
    expect(updated.total_korocoins_awarded).toBe(120);
  });

  /**
   * Vérifie la gestion des erreurs en clôture.
   */
  it("endSession lève une erreur si la session est introuvable", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    await expect(endSession(123)).rejects.toThrow("Session introuvable.");
  });

  it("endSession lève une erreur si la relecture post-mise à jour échoue", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 8, family_id: "1", children_ids: "[]", ended_at: null }]).mockResolvedValueOnce([{ c: 0 }]).mockResolvedValueOnce([{ s: 0 }]).mockResolvedValueOnce([]);
    mockDb.runAsync.mockResolvedValueOnce(undefined);

    await expect(endSession(8)).rejects.toThrow("Session mise à jour introuvable.");
  });

  /**
   * Vérifie la récupération d’une session par ID.
   */
  it("getSessionById relit la session par identifiant", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 44, family_id: "1" }]);
    const s = await getSessionById(44);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringMatching(/WHERE\s+id/i), [44]);
    expect(s?.id).toBe(44);
  });

  /**
   * Vérifie l’historique des sessions avec tri et limite.
   */
  it("getSessionsHistory renvoie les sessions triées et limitées", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const rows = await getSessionsHistory(1, 50);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringMatching(/ORDER\s+BY\s+started_at\s+DESC/i), ["1", 50]);
    expect(rows.length).toBe(2);
  });

  /**
   * Vérifie le résumé : cas sans résultat ou session non terminée.
   */
  it("getSessionSummary renvoie undefined si la session n’existe pas ou n’est pas terminée", async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    expect(await getSessionSummary(1)).toBeUndefined();

    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 2, ended_at: null }]);
    expect(await getSessionSummary(2)).toBeUndefined();
  });

  /**
   * Vérifie le calcul du résumé pour une session terminée.
   */
  it("getSessionSummary calcule le résumé pour une session terminée", async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([{ id: 3, started_at: "2025-08-16T10:00:00.000Z", ended_at: "2025-08-16T11:00:00.000Z", children_ids: JSON.stringify([10, 11]) }])
      .mockResolvedValueOnce([{ c: 5 }])
      .mockResolvedValueOnce([{ s: 200 }]);

    const sum = await getSessionSummary(3);

    expect(sum).toEqual({
      sessionId: 3,
      startedAt: new Date("2025-08-16T10:00:00.000Z"),
      endedAt: new Date("2025-08-16T11:00:00.000Z"),
      participants: [{ id: 10, name: "" }, { id: 11, name: "" }],
      defisCompleted: 5,
      korocoinsAwarded: 200,
    });
  });

  /**
   * Vérifie l’historisation et la journalisation d’un défi validé.
   */
  it("completeDefiInSession insère l’historique, incrémente le compteur et journalise", async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 777 });
    mockDb.runAsync.mockResolvedValueOnce(undefined);

    const id = await completeDefiInSession({ sessionId: 9, familyId: 1, defiId: "abc", childIds: [10, 11], completedBy: "parent" });

    expect(mockDb.runAsync).toHaveBeenNthCalledWith(1, expect.stringMatching(/INSERT\s+INTO\s+defi_history/i), expect.arrayContaining(["abc", "1", JSON.stringify([10, 11]), 9, expect.any(String), "parent"]));
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(2, expect.stringMatching(/UPDATE\s+session/i), [9]);
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "defi", level: "info", context: "Défi validé en session", ref_id: "777" }));
    expect(id).toBe(777);
  });

  /**
   * Vérifie que l’attribution de coins est ignorée si montant nul ou aucun enfant.
   */
  it("awardCoinsForChildren ne fait rien si le montant est nul ou sans enfant", async () => {
    await awardCoinsForChildren({ sessionId: 1, familyId: 1, childIds: [], amountPerChild: 5 });
    await awardCoinsForChildren({ sessionId: 1, familyId: 1, childIds: [10], amountPerChild: 0 });
    expect(mockDb.runAsync).not.toHaveBeenCalled();
    expect(addLog).not.toHaveBeenCalled();
  });

  /**
   * Vérifie l’attribution de coins avec mise à jour du solde et journalisation.
   */
  it("awardCoinsForChildren crée un mouvement par enfant, met à jour le solde et journalise", async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    await awardCoinsForChildren({ sessionId: 2, familyId: 1, childIds: [10, 11], defiId: "d1", amountPerChild: 30, reason: "Défi validé", createdBy: "parent" });

    expect(mockDb.runAsync).toHaveBeenNthCalledWith(1, expect.stringMatching(/INSERT\s+INTO\s+coins_history/i), ["1", 10, 2, "d1", 30, "Défi validé", expect.any(String), "parent"]);
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(3, expect.stringMatching(/INSERT\s+INTO\s+coins_history/i), ["1", 11, 2, "d1", 30, "Défi validé", expect.any(String), "parent"]);
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "session", level: "info", context: "Crédit Koro-Coins", ref_id: "2" }));
  });

  /**
   * Vérifie l’attache d’un média en session.
   */
  it("attachMediaToSession insère un média et journalise", async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 555 });

    const mediaId = await attachMediaToSession({ sessionId: 3, familyId: 1, childIds: [10], fileUri: "file:///tmp/photo.jpg", mediaType: "photo", metadata: { w: 800, h: 600 } });

    expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringMatching(/INSERT\s+INTO\s+session_media/i), expect.arrayContaining([3, "1", JSON.stringify([10]), "file:///tmp/photo.jpg", "photo", expect.any(String), JSON.stringify({ w: 800, h: 600 })]));
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({ log_type: "session", level: "info", context: "Média attaché à la session", ref_id: "3" }));
    expect(mediaId).toBe(555);
  });
});