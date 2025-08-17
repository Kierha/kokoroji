/**
 * Tests unitaires pour le service appFlagsActiveSession.
 * Vérifie la gestion de l’ID de session ouverte, l’état de reprise (snooze) et l’état runtime persistant (lecture, écriture, merge, reset).
 * Les accès SQLite sont mockés. Le temps est figé pour contrôler updatedAt/snoozeUntil.
 */

import {
  getOpenSessionId,
  setOpenSessionId,
  clearOpenSessionId,
  getResumePromptState,
  snoozeResumePrompt,
  clearResumePromptState,
  getRuntimeState,
  setRuntimeState,
  updateRuntimeState,
  clearRuntimeState,
} from "../src/services/appFlagsActiveSession";
import { getDatabaseAsync } from "../src/database/db";

jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));

describe("appFlagsActiveSession", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

    // Date fixe: 2025-08-17T12:00:00.000Z
    jest.useFakeTimers().setSystemTime(new Date("2025-08-17T12:00:00.000Z"));
    jest.spyOn(Date, "now").mockReturnValue(1723896000000);
  });

  afterEach(() => {
    (Date.now as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  /**
   * Gestion de l’ID de session ouverte.
   */
  it("getOpenSessionId renvoie l’ID si valeur numérique, sinon null", async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: "42" });
    expect(await getOpenSessionId()).toBe(42);

    mockDb.getFirstAsync.mockResolvedValueOnce({ value: "abc" });
    expect(await getOpenSessionId()).toBeNull();

    mockDb.getFirstAsync.mockResolvedValueOnce({ value: null });
    expect(await getOpenSessionId()).toBeNull();
  });

  it("setOpenSessionId écrit la valeur (string) ou null et clearOpenSessionId la remet à null", async () => {
    await setOpenSessionId(123);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_id", "123"]
    );

    await clearOpenSessionId();
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_id", null]
    );
  });

  /**
   * État de reprise (snooze).
   */
  it("getResumePromptState parse un JSON valide et tolère les valeurs invalides", async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({
      value: JSON.stringify({ sessionId: 9, snoozeUntil: "2025-08-18T10:00:00.000Z" }),
    });
    expect(await getResumePromptState()).toEqual({
      sessionId: 9,
      snoozeUntil: "2025-08-18T10:00:00.000Z",
    });

    mockDb.getFirstAsync.mockResolvedValueOnce({ value: "{" }); // JSON invalide
    expect(await getResumePromptState()).toEqual({ sessionId: null, snoozeUntil: null });

    mockDb.getFirstAsync.mockResolvedValueOnce({ value: null }); // absent
    expect(await getResumePromptState()).toEqual({ sessionId: null, snoozeUntil: null });
  });

  it("snoozeResumePrompt écrit un until = now + minutes et clearResumePromptState remet à null", async () => {
    await snoozeResumePrompt(7, 30);
    const call = mockDb.runAsync.mock.calls[0];
    expect(call[0]).toMatch(/INSERT OR REPLACE INTO app_flags/i);
    expect(call[1][0]).toBe("active_session_resume");
    const payload = JSON.parse(call[1][1]);
    expect(payload.sessionId).toBe(7);
    expect(payload.snoozeUntil).toBe(new Date(1723896000000 + 30 * 60 * 1000).toISOString());

    await clearResumePromptState();
    expect(mockDb.runAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_resume", null]
    );
  });

  /**
   * État runtime (lecture/écriture).
   */
  it("getRuntimeState renvoie null si value falsy, parse sinon, et renvoie null si JSON invalide ou sessionId absent", async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: null });
    expect(await getRuntimeState()).toBeNull();

    mockDb.getFirstAsync.mockResolvedValueOnce({
      value: JSON.stringify({ sessionId: 5, sessionType: "random", updatedAt: "x" }),
    });
    expect(await getRuntimeState()).toEqual({ sessionId: 5, sessionType: "random", updatedAt: "x" });

    mockDb.getFirstAsync.mockResolvedValueOnce({ value: "{" }); // invalide
    expect(await getRuntimeState()).toBeNull();

    mockDb.getFirstAsync.mockResolvedValueOnce({
      value: JSON.stringify({ sessionType: "bundle", updatedAt: "x" }), // pas de sessionId
    });
    expect(await getRuntimeState()).toBeNull();
  });

  it("setRuntimeState écrit un JSON avec updatedAt = now quand state non nul, sinon met la valeur à null", async () => {
    await setRuntimeState({
      sessionId: 10,
      sessionType: "random",
      randomDefi: null,
      updatedAt: "will-be-overridden",
    });
    const call1 = mockDb.runAsync.mock.calls[0];
    expect(call1[1][0]).toBe("active_session_runtime");
    const written1 = JSON.parse(call1[1][1]);
    expect(written1.sessionId).toBe(10);
    expect(written1.updatedAt).toBe(new Date(1723896000000).toISOString());

    await setRuntimeState(null);
    expect(mockDb.runAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_runtime", null]
    );
  });

  /**
   * updateRuntimeState : merge avec un état existant.
   */
  it("updateRuntimeState fusionne avec l’état existant et rafraîchit updatedAt", async () => {
    // État existant renvoyé par getRuntimeState() -> via DB
    const existing = {
      sessionId: 20,
      sessionType: "bundle",
      bundle: [{ id: 1, family_id: 1, title: "A" }],
      bundleIndex: 0,
      challengeStartISO: "2025-08-17T11:00:00.000Z",
      currentPhotoCount: 2,
      updatedAt: "old",
    };
    mockDb.getFirstAsync.mockResolvedValueOnce({
      value: JSON.stringify(existing),
    });

    await updateRuntimeState({
      sessionId: 21, // override
      bundleIndex: 1,
      currentPhotoCount: 3,
    });

    const call = mockDb.runAsync.mock.calls[0]; 
    expect(call[1][0]).toBe("active_session_runtime");
    const saved = JSON.parse(call[1][1]);
    expect(saved.sessionId).toBe(21);
    expect(saved.bundleIndex).toBe(1);
    expect(saved.currentPhotoCount).toBe(3);
    expect(saved.updatedAt).toBe(new Date(1723896000000).toISOString());
    // Propriétés non patchées conservées
    expect(saved.sessionType).toBe("bundle");
    expect(saved.bundle).toEqual(existing.bundle);
    expect(saved.challengeStartISO).toBe(existing.challengeStartISO);
  });

  /**
   * updateRuntimeState : création d’un nouvel état si absent et sessionId fourni (défauts bundleIndex/currentPhotoCount).
   */
  it("updateRuntimeState crée un nouvel état si aucun existant et sessionId fourni (avec défauts)", async () => {
    // Aucune valeur en BDD pour runtime
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: null });

    await updateRuntimeState({
      sessionId: 30,
      sessionType: "bundle",
      bundle: [{ id: "d1", family_id: 1, title: "X", duration_min: 5 }],
    });

    const call = mockDb.runAsync.mock.calls[0];
    expect(call[1][0]).toBe("active_session_runtime");
    const saved = JSON.parse(call[1][1]);
    expect(saved.sessionId).toBe(30);
    expect(saved.sessionType).toBe("bundle");
    expect(saved.bundle).toHaveLength(1);
    expect(saved.bundleIndex).toBe(0); // défaut quand bundle présent
    expect(saved.currentPhotoCount).toBe(0); // défaut
    expect(saved.updatedAt).toBe(new Date(1723896000000).toISOString());
    expect(saved.randomDefi).toBeNull();
    expect(saved.challengeStartISO).toBeNull();
  });

  /**
   * updateRuntimeState : si pas d’état existant et pas de sessionId dans le patch, il n’écrit rien (setRuntimeState(null)).
   */
  it("updateRuntimeState n’écrit rien si pas d’existant et patch sans sessionId", async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: null });

    await updateRuntimeState({ bundleIndex: 2 });

    // setRuntimeState(null) -> INSERT OR REPLACE avec null
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_runtime", null]
    );
  });

  /**
   * clearRuntimeState : reset à null.
   */
  it("clearRuntimeState remet l’état runtime à null", async () => {
    await clearRuntimeState();
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT OR REPLACE INTO app_flags/i),
      ["active_session_runtime", null]
    );
  });
});