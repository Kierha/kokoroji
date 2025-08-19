import { useCallback, useEffect, useMemo, useState } from "react";
import type { DBSessionRow } from "../models/session";
import type { SessionConfig } from "../models/sessionConfig";
import {
  startSession,
  getActiveSession as svcGetActiveSession,
  endSession as svcEndSession,
  completeDefiInSession,
  attachMediaToSession,
} from "../services/sessionService";
import {
  pickRandomEligibleDefi,
  buildEligibleBundle,
} from "../services/sessionSelectionService";
import {
  getRuntimeState,
  updateRuntimeState,
  clearRuntimeState,
  type ActiveRuntime,
  type SelectableDefi,
} from "../services/appFlagsActiveSession";

type UseActiveSessionOptions = { familyId: number };

/**
 * Hook de gestion d'une session active (aléatoire ou bundle) :
 * - récupération / démarrage / clôture de session
 * - proposition d'un défi ou d'un ensemble (bundle)
 * - validation de défi et attache de médias
 * - persistance / restauration d'un état "runtime" (progression, photos...)
 * Retourne l'état courant, des indicateurs (hasActive, loading, error) et les actions.
 */

export function useActiveSession(opts: UseActiveSessionOptions) {
  const { familyId } = opts;

  const [activeSession, setActiveSession] = useState<DBSessionRow | undefined>(undefined);
  const [pendingDefi, setPendingDefi] = useState<SelectableDefi | null>(null);
  const [bundle, setBundle] = useState<SelectableDefi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dérivés simples
  const hasActive = useMemo(() => Boolean(activeSession && !activeSession.ended_at), [activeSession]);

  /** Rafraîchit la session active depuis la BDD */
  const refreshActive = useCallback(async () => {
    try {
      const s = await svcGetActiveSession(familyId);
      setActiveSession(s ?? undefined);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement de la session active");
    }
  }, [familyId]);

  /** Démarre une session si aucune n’est active */
  const ensureSession = useCallback(
    async (config: SessionConfig) => {
      setLoading(true);
      setError(null);
      try {
        const existing = await svcGetActiveSession(familyId);
        if (existing) {
          setActiveSession(existing);
          return existing;
        }
        const created = await startSession(config);
        setActiveSession(created);
        return created;
      } catch (e: any) {
        setError(e?.message ?? "Impossible de démarrer la session");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  /** Propose un défi aléatoire éligible */
  const proposeRandomDefi = useCallback(
    async (config: SessionConfig) => {
      const cfg: SessionConfig = { ...config, familyId: config.familyId || familyId };
      setLoading(true);
      setError(null);
      try {
        const d = await pickRandomEligibleDefi(cfg);
        setPendingDefi((d ?? null) as SelectableDefi | null);
        return (d ?? null) as SelectableDefi | null;
      } catch (e: any) {
        setError(e?.message ?? "Impossible de proposer un défi");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  /** Construit un bundle de défis éligibles */
  const proposeBundle = useCallback(
    async (config: SessionConfig, limit?: number) => {
      const cfg: SessionConfig = { ...config, familyId: config.familyId || familyId };
      setLoading(true);
      setError(null);
      try {
        const list =
          typeof limit === "number"
            ? await buildEligibleBundle(cfg, limit)
            : await buildEligibleBundle(cfg);
        setBundle(list as SelectableDefi[]);
        return list as SelectableDefi[];
      } catch (e: any) {
        setError(e?.message ?? "Impossible de générer le bundle");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  /** Valide un défi dans la session en cours */
  const validateDefi = useCallback(
    async (params: {
      sessionId: number;
      defiId: string | number;
      childIds: number[];
      completedBy?: string;
      completedAt?: string; // ISO
    }) => {
      setLoading(true);
      setError(null);
      try {
        const id = await completeDefiInSession({
          sessionId: params.sessionId,
          familyId,
          defiId: String(params.defiId),
          childIds: params.childIds,
          completedBy: params.completedBy,
          completedAt: params.completedAt,
        });
        await refreshActive();
        return id;
      } catch (e: any) {
        setError(e?.message ?? "Impossible de valider le défi");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [familyId, refreshActive]
  );

  /** Attache un média (photo/vidéo) */
  const addMedia = useCallback(
    async (params: {
      sessionId: number;
      childIds?: number[];
      fileUri: string;
      mediaType?: "photo" | "video";
      metadata?: Record<string, any>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const id = await attachMediaToSession({
          sessionId: params.sessionId,
          familyId,
          childIds: params.childIds,
          fileUri: params.fileUri,
          mediaType: params.mediaType,
          metadata: params.metadata,
        });
        return id;
      } catch (e: any) {
        setError(e?.message ?? "Impossible d’attacher le média");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  /** Termine la session en cours */
  const endActiveSession = useCallback(
    async (sessionId: number) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await svcEndSession(sessionId);
        setActiveSession(updated);
        return updated;
      } catch (e: any) {
        setError(e?.message ?? "Impossible de clôturer la session");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** Réinitialise les propositions en cours */
  const resetSuggestions = useCallback(() => {
    setPendingDefi(null);
    setBundle([]);
  }, []);

  // Helpers persistance runtime
  const loadRuntime = useCallback(async (): Promise<ActiveRuntime | null> => {
    return await getRuntimeState();
  }, []);

  const updateRuntime = useCallback(
    async (patch: Partial<ActiveRuntime> & { sessionId?: number }) => {
      await updateRuntimeState(patch);
    },
    []
  );

  const clearRuntime = useCallback(async () => {
    await clearRuntimeState();
  }, []);

  /**
   * Restaure depuis l'état runtime persisté si lié à la session active.
   * - random : réinjecte pendingDefi
   * - bundle : réinjecte bundle et son index
   * Renvoie flags pour permettre à l'UI de reprendre l'affichage (timer, photos...).
   */
  const restoreFromRuntimeIfPossible = useCallback(async () => {
    const rt = await getRuntimeState();
    if (!rt || !rt.sessionId || !activeSession?.id || rt.sessionId !== activeSession.id) {
      return { restored: false as const };
    }

    if (rt.sessionType === "random" && rt.randomDefi) {
      setPendingDefi(rt.randomDefi);
      setBundle([]);
      return {
        restored: true as const,
        challengeStartISO: rt.challengeStartISO ?? undefined,
        bundleIndex: undefined,
        currentPhotoCount: rt.currentPhotoCount ?? 0,
      };
    }

    if (rt.sessionType === "bundle" && Array.isArray(rt.bundle) && rt.bundle.length) {
      setPendingDefi(null);
      setBundle(rt.bundle);
      return {
        restored: true as const,
        challengeStartISO: rt.challengeStartISO ?? undefined,
        bundleIndex: typeof rt.bundleIndex === "number" ? rt.bundleIndex : 0,
        currentPhotoCount: rt.currentPhotoCount ?? 0,
      };
    }

    return { restored: false as const };
  }, [activeSession?.id]);

  useEffect(() => {
    refreshActive();
  }, [refreshActive]);

  return {
    // state
    activeSession,
    hasActive,
    pendingDefi,
    bundle,
    loading,
    error,
    // actions
    refreshActive,
    ensureSession,
    proposeRandomDefi,
    proposeBundle,
    validateDefi,
    addMedia,
    endActiveSession,
    resetSuggestions,
    // runtime
    loadRuntime,
    updateRuntime,
    clearRuntime,
    restoreFromRuntimeIfPossible,
  };
}

export default useActiveSession;
