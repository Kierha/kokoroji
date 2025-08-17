import { getDatabaseAsync } from "../database/db";

const ACTIVE_SESSION_ID_KEY = "active_session_id";
const ACTIVE_SESSION_RESUME_KEY = "active_session_resume"; // JSON: { sessionId: number, snoozeUntil: string }
const ACTIVE_SESSION_RUNTIME_KEY = "active_session_runtime"; // JSON: ActiveRuntime

export type SelectableDefi = {
  id: string | number;
  family_id: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  duration_min?: number | null;
  points_default?: number | null;
  photo_required?: string | null;
  age_min?: number | null;
  age_max?: number | null;
};

export type ActiveRuntime = {
  sessionId: number;
  sessionType: "random" | "bundle";
  randomDefi?: SelectableDefi | null;
  bundle?: SelectableDefi[] | null;
  bundleIndex?: number | null;
  challengeStartISO?: string | null;
  currentPhotoCount?: number | null;
  updatedAt: string;
};

/**
 * Renvoie l’ID de session ouverte, ou null si absent.
 */
export async function getOpenSessionId(): Promise<number | null> {
  const db = await getDatabaseAsync();
  const r = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [ACTIVE_SESSION_ID_KEY]
  );
  const v = r?.value;
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Définit l’ID de session ouverte (ou le supprime si null).
 * @param sessionId ID de session ou null.
 */
export async function setOpenSessionId(sessionId: number | null): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [ACTIVE_SESSION_ID_KEY, sessionId == null ? null : String(sessionId)]
  );
}

/**
 * Efface l’ID de session ouverte.
 */
export async function clearOpenSessionId(): Promise<void> {
  await setOpenSessionId(null);
}

type ResumeState = { sessionId: number | null; snoozeUntil: string | null };

/**
 * Renvoie l’état de reprise différée de la session.
 */
export async function getResumePromptState(): Promise<ResumeState> {
  const db = await getDatabaseAsync();
  const r = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [ACTIVE_SESSION_RESUME_KEY]
  );
  if (!r?.value) return { sessionId: null, snoozeUntil: null };
  try {
    const obj = JSON.parse(String(r.value));
    const sessionId = Number(obj?.sessionId);
    const snoozeUntil = typeof obj?.snoozeUntil === "string" ? obj.snoozeUntil : null;
    return {
      sessionId: Number.isFinite(sessionId) ? sessionId : null,
      snoozeUntil,
    };
  } catch {
    return { sessionId: null, snoozeUntil: null };
  }
}

/**
 * Diffère l’affichage de la reprise de session.
 * @param sessionId ID de la session concernée.
 * @param minutes Durée du report en minutes (défaut 360).
 */
export async function snoozeResumePrompt(sessionId: number, minutes = 360): Promise<void> {
  const db = await getDatabaseAsync();
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const payload = JSON.stringify({ sessionId, snoozeUntil: until });
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [ACTIVE_SESSION_RESUME_KEY, payload]
  );
}

/**
 * Réinitialise l’état de reprise différée.
 */
export async function clearResumePromptState(): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [ACTIVE_SESSION_RESUME_KEY, null]
  );
}

/**
 * Renvoie l’état runtime persistant, ou null si absent.
 */
export async function getRuntimeState(): Promise<ActiveRuntime | null> {
  const db = await getDatabaseAsync();
  const r = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [ACTIVE_SESSION_RUNTIME_KEY]
  );
  const v = r?.value;
  if (!v) return null;
  try {
    const obj = JSON.parse(String(v));
    if (obj && typeof obj === "object" && typeof obj.sessionId === "number") {
      return obj as ActiveRuntime;
    }
  } catch {}
  return null;
}

/**
 * Écrit l’état runtime persistant (ou le supprime si null).
 * @param state État à persister ou null.
 */
export async function setRuntimeState(state: ActiveRuntime | null): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [
      ACTIVE_SESSION_RUNTIME_KEY,
      state
        ? JSON.stringify({
            ...state,
            updatedAt: new Date(Date.now()).toISOString(),
          })
        : null,
    ]
  );
}

/**
 * Met à jour partiellement l’état runtime persistant.
 * @param patch Attributs à fusionner. `sessionId` requis si aucun état existant.
 */
export async function updateRuntimeState(
  patch: Partial<ActiveRuntime> & { sessionId?: number }
): Promise<void> {
  const prev = await getRuntimeState();

  const merged: ActiveRuntime | null = prev
    ? {
        ...prev,
        ...patch,
        sessionId: patch.sessionId != null ? patch.sessionId : prev.sessionId,
        updatedAt: new Date(Date.now()).toISOString(),
      }
    : patch.sessionId != null
    ? ({
        sessionId: patch.sessionId,
        sessionType: (patch.sessionType ?? "random") as "random" | "bundle",
        randomDefi: patch.randomDefi ?? null,
        bundle: patch.bundle ?? null,
        bundleIndex: patch.bundleIndex ?? (patch.bundle ? 0 : null),
        challengeStartISO: patch.challengeStartISO ?? null,
        currentPhotoCount: patch.currentPhotoCount ?? 0,
        updatedAt: new Date(Date.now()).toISOString(),
      } as ActiveRuntime)
    : null;

  await setRuntimeState(merged);
}

/**
 * Supprime l’état runtime persistant.
 */
export async function clearRuntimeState(): Promise<void> {
  await setRuntimeState(null);
}
