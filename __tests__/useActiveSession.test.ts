/**
 * Tests unitaires pour le hook useActiveSession.
 * Vérifie la gestion du cycle de vie d’une session (lecture, création, fin),
 * la proposition de défis (aléatoire ou bundle), la validation et l’attache média,
 * ainsi que la persistance, restauration et réinitialisation des suggestions.
 * Les services sessionService, sessionSelectionService et appFlagsActiveSession sont mockés.
 */

import { renderHook, act } from "@testing-library/react";
import { useActiveSession } from "../src/hooks/useActiveSession";
import {
  startSession,
  getActiveSession as svcGetActiveSession,
  endSession as svcEndSession,
  completeDefiInSession,
  attachMediaToSession,
} from "../src/services/sessionService";
import {
  pickRandomEligibleDefi,
  buildEligibleBundle,
} from "../src/services/sessionSelectionService";
import {
  getRuntimeState,
  updateRuntimeState,
  clearRuntimeState,
} from "../src/services/appFlagsActiveSession";

jest.mock("../src/services/sessionService", () => ({
  startSession: jest.fn(),
  getActiveSession: jest.fn(),
  endSession: jest.fn(),
  completeDefiInSession: jest.fn(),
  attachMediaToSession: jest.fn(),
}));
jest.mock("../src/services/sessionSelectionService", () => ({
  pickRandomEligibleDefi: jest.fn(),
  buildEligibleBundle: jest.fn(),
}));
jest.mock("../src/services/appFlagsActiveSession", () => ({
  getRuntimeState: jest.fn(),
  updateRuntimeState: jest.fn(),
  clearRuntimeState: jest.fn(),
}));



describe("useActiveSession", () => {
  const familyId = 1;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  /**
   * Vérifie le rafraîchissement initial et l’exposition de hasActive.
   */
  it("rafraîchit la session active au montage et expose hasActive", async () => {
    (svcGetActiveSession as jest.Mock).mockResolvedValue({
      id: 10,
      family_id: familyId,
      started_at: "2025-08-17T12:00:00.000Z",
      ended_at: null,
    });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    expect(svcGetActiveSession).toHaveBeenCalledWith(familyId);
    expect(result.current.activeSession?.id).toBe(10);
    expect(result.current.hasActive).toBe(true);
  });

  /**
   * Vérifie qu’une session existante est réutilisée.
   */
  it("ensureSession retourne la session existante s’il y en a une", async () => {
    (svcGetActiveSession as jest.Mock)
      .mockResolvedValueOnce({ id: 99, family_id: familyId, started_at: "2025-08-16T10:00:00.000Z", ended_at: null })
      .mockResolvedValueOnce({ id: 99, family_id: familyId, started_at: "2025-08-16T10:00:00.000Z", ended_at: null });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    let s: any;
    await act(async () => {
      s = await result.current.ensureSession({ familyId, childIds: [10], createdBy: "parent@demo", type: "random" });
    });

    expect(s.id).toBe(99);
    expect(result.current.activeSession?.id).toBe(99);
  });

  /**
   * Vérifie la création d’une nouvelle session si aucune n’est active.
   */
  it("ensureSession crée une session si aucune n’est active", async () => {
    (svcGetActiveSession as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    (startSession as jest.Mock).mockResolvedValue({ id: 101, family_id: familyId, started_at: "2025-08-17T12:00:00.000Z", ended_at: null });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    let created: any;
    await act(async () => {
      created = await result.current.ensureSession({ familyId, childIds: [10, 11], createdBy: "parent@demo", type: "bundle", location: "interieur", plannedDurationMin: 30, category: "ludique" });
    });

    expect(startSession).toHaveBeenCalled();
    expect(created.id).toBe(101);
    expect(result.current.activeSession?.id).toBe(101);
  });

  /**
   * Vérifie la proposition d’un défi aléatoire.
   */
  it("proposeRandomDefi renseigne pendingDefi", async () => {
    (pickRandomEligibleDefi as jest.Mock).mockResolvedValue({ id: "D-1", family_id: familyId, title: "Défi A" });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => {
      await result.current.proposeRandomDefi({ familyId, childIds: [10], type: "random", location: "interieur", plannedDurationMin: 20 });
    });

    expect(pickRandomEligibleDefi).toHaveBeenCalled();
    expect(result.current.pendingDefi?.id).toBe("D-1");
  });

  /**
   * Vérifie la proposition d’un bundle de défis.
   */
  it("proposeBundle renseigne bundle avec la liste retournée", async () => {
    (buildEligibleBundle as jest.Mock).mockResolvedValue([{ id: "X", family_id: familyId, title: "1", duration_min: 10 }, { id: "Y", family_id: familyId, title: "2", duration_min: 15 }]);

    const { result } = renderHook(() => useActiveSession({ familyId }));
    let list: any[] = [];
    await act(async () => {
      list = await result.current.proposeBundle({ familyId, childIds: [10, 11], type: "bundle", plannedDurationMin: 30, location: "exterieur" }, 12);
    });

    expect(buildEligibleBundle).toHaveBeenCalled();
    expect(list).toHaveLength(2);
    expect(result.current.bundle.map((d) => d.id)).toEqual(["X", "Y"]);
  });

  /**
   * Vérifie la validation d’un défi et le rafraîchissement de la session.
   */
  it("validateDefi complète un défi et rafraîchit la session", async () => {
    (completeDefiInSession as jest.Mock).mockResolvedValue(777);
    (svcGetActiveSession as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 201, family_id: familyId, started_at: "2025-08-17T12:00:00.000Z", ended_at: null, total_defis_completed: 3 });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => {
      const id = await result.current.validateDefi({ sessionId: 201, defiId: "D1", childIds: [10], completedBy: "parent@demo" });
      expect(id).toBe(777);
    });

    expect(completeDefiInSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 201, familyId, defiId: "D1" }));
    expect(svcGetActiveSession).toHaveBeenLastCalledWith(familyId);
    expect(result.current.activeSession?.id).toBe(201);
  });

  /**
   * Vérifie l’attache d’un média.
   */
  it("addMedia attache un média à la session et retourne l’id", async () => {
    (attachMediaToSession as jest.Mock).mockResolvedValue(909);

    const { result } = renderHook(() => useActiveSession({ familyId }));
    let id: number | null = null;
    await act(async () => {
      id = await result.current.addMedia({ sessionId: 300, childIds: [10], fileUri: "file:///app-docs/Kokoroji/p.jpg", mediaType: "photo", metadata: { note: "ok" } });
    });

    expect(attachMediaToSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 300, familyId, fileUri: "file:///app-docs/Kokoroji/p.jpg", mediaType: "photo" }));
    expect(id).toBe(909);
  });

  /**
   * Vérifie la clôture d’une session active.
   */
  it("endActiveSession clôture la session et met à jour activeSession", async () => {
    (svcEndSession as jest.Mock).mockResolvedValue({ id: 400, family_id: familyId, started_at: "2025-08-17T10:00:00.000Z", ended_at: "2025-08-17T11:00:00.000Z", total_defis_completed: 4, total_korocoins_awarded: 30 });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => {
      const updated = await result.current.endActiveSession(400);
      expect(updated.ended_at).toBe("2025-08-17T11:00:00.000Z");
    });

    expect(svcEndSession).toHaveBeenCalledWith(400);
    expect(result.current.activeSession?.ended_at).toBe("2025-08-17T11:00:00.000Z");
    expect(result.current.hasActive).toBe(false);
  });

  /**
   * Vérifie la réinitialisation des suggestions.
   */
  it("resetSuggestions remet pendingDefi à null et vide bundle", async () => {
    (pickRandomEligibleDefi as jest.Mock).mockResolvedValue({ id: "D", family_id: familyId, title: "T" });
    (buildEligibleBundle as jest.Mock).mockResolvedValue([{ id: "B1", title: "x" }]);

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => {
      await result.current.proposeRandomDefi({ familyId, childIds: [10], type: "random" });
      await result.current.proposeBundle({ familyId, childIds: [10, 11], type: "bundle" });
    });

    expect(result.current.pendingDefi).not.toBeNull();
    expect(result.current.bundle.length).toBe(1);

    act(() => {
      result.current.resetSuggestions();
    });

    expect(result.current.pendingDefi).toBeNull();
    expect(result.current.bundle.length).toBe(0);
  });

  /**
   * Vérifie les proxys vers loadRuntime, updateRuntime et clearRuntime.
   */
  it("expose loadRuntime/updateRuntime/clearRuntime (proxy services)", async () => {
    (getRuntimeState as jest.Mock).mockResolvedValue({ sessionId: 10, sessionType: "random" });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => {
      const rt = await result.current.loadRuntime();
      expect(rt).toEqual({ sessionId: 10, sessionType: "random" });

      await result.current.updateRuntime({ sessionId: 10, currentPhotoCount: 3 });
      expect(updateRuntimeState).toHaveBeenCalledWith({ sessionId: 10, currentPhotoCount: 3 });

      await result.current.clearRuntime();
      expect(clearRuntimeState).toHaveBeenCalled();
    });
  });

  /**
   * Vérifie la restauration d’un état runtime de type random.
   */
  it("restoreFromRuntimeIfPossible restaure un état random valide", async () => {
    (svcGetActiveSession as jest.Mock).mockResolvedValueOnce({ id: 700, family_id: familyId, started_at: "2025-08-17T12:00:00.000Z", ended_at: null });
    (getRuntimeState as jest.Mock).mockResolvedValue({ sessionId: 700, sessionType: "random", randomDefi: { id: "R1", title: "R" }, challengeStartISO: "2025-08-17T12:10:00.000Z", currentPhotoCount: 2, updatedAt: "2025-08-17T12:11:00.000Z" });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    let out: any;
    await act(async () => {
      out = await result.current.restoreFromRuntimeIfPossible();
    });

    expect(out).toEqual({ restored: true, challengeStartISO: "2025-08-17T12:10:00.000Z", bundleIndex: undefined, currentPhotoCount: 2 });
    expect(result.current.pendingDefi?.id).toBe("R1");
    expect(result.current.bundle.length).toBe(0);
  });

  /**
   * Vérifie la restauration d’un état runtime de type bundle.
   */
  it("restoreFromRuntimeIfPossible restaure un état bundle valide", async () => {
    (svcGetActiveSession as jest.Mock).mockResolvedValueOnce({ id: 701, family_id: familyId, started_at: "2025-08-17T12:00:00.000Z", ended_at: null });
    (getRuntimeState as jest.Mock).mockResolvedValue({ sessionId: 701, sessionType: "bundle", bundle: [{ id: "B1", title: "X" }, { id: "B2", title: "Y" }], bundleIndex: 1, challengeStartISO: "2025-08-17T12:20:00.000Z", currentPhotoCount: 5, updatedAt: "2025-08-17T12:21:00.000Z" });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    let out: any;
    await act(async () => {
      out = await result.current.restoreFromRuntimeIfPossible();
    });

    expect(out).toEqual({ restored: true, challengeStartISO: "2025-08-17T12:20:00.000Z", bundleIndex: 1, currentPhotoCount: 5 });
    expect(result.current.pendingDefi).toBeNull();
    expect(result.current.bundle.map((d) => d.id)).toEqual(["B1", "B2"]);
  });

  /**
   * Vérifie qu’aucune restauration n’a lieu si l’ID de session ne correspond pas.
   */
  it("restoreFromRuntimeIfPossible ne restaure pas si la session ne correspond pas", async () => {
    (svcGetActiveSession as jest.Mock).mockResolvedValueOnce({ id: 800, family_id: familyId, started_at: "2025-08-17T12:00:00.000Z", ended_at: null });
    (getRuntimeState as jest.Mock).mockResolvedValue({ sessionId: 999, sessionType: "random", randomDefi: { id: "R", title: "T" } });

    const { result } = renderHook(() => useActiveSession({ familyId }));
    await act(async () => Promise.resolve());

    let out: any;
    await act(async () => {
      out = await result.current.restoreFromRuntimeIfPossible();
    });

    expect(out).toEqual({ restored: false });
    expect(result.current.pendingDefi).toBeNull();
    expect(result.current.bundle.length).toBe(0);
  });
});