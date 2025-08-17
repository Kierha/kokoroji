import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";
import type { DBSessionRow } from "../models/session";
import type { SessionConfig } from "../models/sessionConfig";
import type { SessionSummary } from "../models/sessionSummary";

const nowIso = () => new Date().toISOString();

const safeJson = (v: unknown) => {
  try {
    return JSON.stringify(v);
  } catch {
    return "{}";
  }
};

async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync(sql, params);
  return (rows && rows[0]) as T | undefined;
}

async function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync(sql, params);
  return (rows ?? []) as T[];
}

/** Journalise un événement applicatif au niveau "info". */
async function logInfo(params: {
  context: string;
  details?: unknown;
  familyId?: string | number;
  childIdsJson?: string;
  refId?: string | number;
  timestamp?: string;
}) {
  await addLog({
    timestamp: params.timestamp ?? nowIso(),
    family_id: params.familyId != null ? String(params.familyId) : undefined,
    child_ids: params.childIdsJson ?? "[]",
    log_type: "session",
    level: "info",
    context: params.context,
    details: params.details != null ? safeJson(params.details) : undefined,
    ref_id: params.refId != null ? String(params.refId) : undefined,
    device_info: undefined,
  });
}

/** Journalise une erreur système/fonctionnelle. */
async function logError(params: {
  context: string;
  details?: unknown;
  familyId?: string | number;
  childIdsJson?: string;
  refId?: string | number;
  timestamp?: string;
  logType?: "error" | "system" | "session" | "defi";
}) {
  await addLog({
    timestamp: params.timestamp ?? nowIso(),
    family_id: params.familyId != null ? String(params.familyId) : undefined,
    child_ids: params.childIdsJson ?? "[]",
    log_type: params.logType ?? "error",
    level: "error",
    context: params.context,
    details: params.details != null ? safeJson(params.details) : undefined,
    ref_id: params.refId != null ? String(params.refId) : undefined,
    device_info: undefined,
  });
}

/**
 * Crée et démarre une nouvelle session (une seule session active par famille).
 * @param config Configuration de la session
 * @returns Session créée
 */
export async function startSession(config: SessionConfig): Promise<DBSessionRow> {
  const db = await getDatabaseAsync();

  const existing = await getOne<{ id: number }>(
    `SELECT id FROM session WHERE family_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1;`,
    [String(config.familyId)]
  );
  if (existing) {
    throw new Error("Une session active existe déjà pour cette famille.");
  }

  const startedAt = nowIso();
  const childrenJson = JSON.stringify(config.childIds ?? []);
  const result = await db.runAsync(
    `INSERT INTO session (
        family_id, children_ids, started_at, ended_at, created_by, is_synced,
        session_type, location, planned_duration_min, category,
        total_defis_completed, total_korocoins_awarded
      ) VALUES (?, ?, ?, NULL, ?, 0, ?, ?, ?, ?, 0, 0);`,
    [
      String(config.familyId),
      childrenJson,
      startedAt,
      config.createdBy ?? "",
      config.type ?? "random",
      config.location ?? "",
      typeof config.plannedDurationMin === "number" ? config.plannedDurationMin : null,
      config.category ?? "",
    ]
  );
  const sessionId: number = result?.lastInsertRowId;

  const session = await getOne<DBSessionRow>(`SELECT * FROM session WHERE id = ?;`, [sessionId]);
  if (!session) {
    await logError({
      context: "Incohérence post-insert session",
      details: { sessionId, config },
      familyId: config.familyId,
      childIdsJson: childrenJson,
      logType: "error",
    });
    throw new Error("Session introuvable après insertion.");
  }

  await logInfo({
    context: "Session créée",
    details: {
      session_id: session.id,
      session_type: (session as any).session_type,
      location: (session as any).location,
      category: (session as any).category ?? "",
      planned_duration_min: (session as any).planned_duration_min,
    },
    familyId: session.family_id,
    childIdsJson: session.children_ids,
    refId: session.id,
  });

  return session;
}

/**
 * Récupère la session active d’une famille.
 * @param familyId Identifiant famille
 * @returns Session active ou undefined
 */
export async function getActiveSession(familyId: number): Promise<DBSessionRow | undefined> {
  return getOne<DBSessionRow>(
    `SELECT * FROM session
     WHERE family_id = ? AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1;`,
    [String(familyId)]
  );
}

/**
 * Termine une session et met à jour les totaux calculés (défis et Koro-Coins).
 * @param sessionId Identifiant de la session
 * @returns Session mise à jour
 */
export async function endSession(sessionId: number): Promise<DBSessionRow> {
  const db = await getDatabaseAsync();

  const current = await getOne<DBSessionRow>(`SELECT * FROM session WHERE id = ?;`, [sessionId]);
  if (!current) throw new Error("Session introuvable.");
  if (current.ended_at) return current;

  const defisCountRow = await getOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM defi_history WHERE session_id = ?;`,
    [sessionId]
  );
  const totalDefis = Number(defisCountRow?.c ?? 0);

  const coinsSumRow = await getOne<{ s: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM coins_history WHERE session_id = ?;`,
    [sessionId]
  );
  const totalCoins = Number(coinsSumRow?.s ?? 0);

  const endedAt = nowIso();

  await db.runAsync(
    `UPDATE session SET
       ended_at = ?, total_defis_completed = ?, total_korocoins_awarded = ?, is_synced = 0
     WHERE id = ?;`,
    [endedAt, totalDefis, totalCoins, sessionId]
  );

  const updated = await getOne<DBSessionRow>(`SELECT * FROM session WHERE id = ?;`, [sessionId]);

  await logInfo({
    context: "Fin de session",
    timestamp: endedAt,
    details: { session_id: sessionId, totalDefis, totalCoins },
    familyId: updated ? updated.family_id : undefined,
    childIdsJson: updated?.children_ids ?? "[]",
    refId: sessionId,
  });

  if (!updated) throw new Error("Session mise à jour introuvable.");
  return updated;
}

/**
 * Récupère une session par son identifiant.
 * @param sessionId Identifiant de la session
 * @returns Session ou undefined
 */
export async function getSessionById(sessionId: number): Promise<DBSessionRow | undefined> {
  return getOne<DBSessionRow>(`SELECT * FROM session WHERE id = ?;`, [sessionId]);
}

/**
 * Récupère l’historique des sessions d’une famille.
 * @param familyId Identifiant famille
 * @param limit Nombre maximal de sessions retournées
 * @returns Liste des sessions
 */
export async function getSessionsHistory(
  familyId: number,
  limit: number = 20
): Promise<DBSessionRow[]> {
  return getAll<DBSessionRow>(
    `SELECT * FROM session
     WHERE family_id = ?
     ORDER BY started_at DESC
     LIMIT ?;`,
    [String(familyId), limit]
  );
}

/**
 * Construit un résumé minimal d’une session terminée.
 * @param sessionId Identifiant de la session
 * @returns Résumé ou undefined
 */
export async function getSessionSummary(sessionId: number): Promise<SessionSummary | undefined> {
  const s = await getOne<DBSessionRow>(`SELECT * FROM session WHERE id = ?;`, [sessionId]);
  if (!s || !s.ended_at) return undefined;

  const defisCountRow = await getOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM defi_history WHERE session_id = ?;`,
    [sessionId]
  );
  const coinsSumRow = await getOne<{ s: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS s FROM coins_history WHERE session_id = ?;`,
    [sessionId]
  );

  const participants: number[] = s.children_ids ? JSON.parse(s.children_ids) : [];

  return {
    sessionId: s.id,
    startedAt: new Date(s.started_at),
    endedAt: new Date(s.ended_at),
    participants: participants.map((id) => ({ id, name: "" })),
    defisCompleted: Number(defisCountRow?.c ?? 0),
    korocoinsAwarded: Number(coinsSumRow?.s ?? 0),
  };
}

/**
 * Enregistre la complétion d’un défi pour une session.
 * @returns Identifiant de la ligne insérée dans `defi_history`
 */
export async function completeDefiInSession(params: {
  sessionId: number;
  familyId: number;
  defiId: string;
  childIds: number[];
  completedBy?: string;
  completedAt?: string;
}): Promise<number> {
  const db = await getDatabaseAsync();

  const completedAt = params.completedAt ?? nowIso();
  const childrenJson = JSON.stringify(params.childIds ?? []);

  const res = await db.runAsync(
    `INSERT INTO defi_history(
       defi_id, family_id, children_ids, session_id, completed_at, completed_by, is_synced
     ) VALUES (?, ?, ?, ?, ?, ?, 0);`,
    [
      String(params.defiId),
      String(params.familyId),
      childrenJson,
      params.sessionId,
      completedAt,
      params.completedBy ?? "",
    ]
  );

  const historyId: number = res?.lastInsertRowId;

  await db.runAsync(
    `UPDATE session
     SET total_defis_completed = total_defis_completed + 1, is_synced = 0
     WHERE id = ?;`,
    [params.sessionId]
  );

  await addLog({
    timestamp: completedAt,
    family_id: String(params.familyId),
    child_ids: childrenJson,
    log_type: "defi",
    level: "info",
    context: "Défi validé en session",
    details: safeJson({
      session_id: params.sessionId,
      defi_id: params.defiId,
      completed_by: params.completedBy ?? undefined,
    }),
    ref_id: String(historyId),
    device_info: undefined,
  });

  return historyId;
}

/**
 * Crédite des Koro-Coins aux enfants et historise l’opération.
 * @param params Détails du crédit
 */
export async function awardCoinsForChildren(params: {
  sessionId: number;
  familyId: number;
  childIds: number[];
  defiId?: string;
  amountPerChild: number;
  reason?: string;
  createdBy?: string;
}): Promise<void> {
  const db = await getDatabaseAsync();
  const now = nowIso();

  const amount = Number(params.amountPerChild) || 0;
  if (!amount || !params.childIds?.length) return;

  for (const childId of params.childIds) {
    await db.runAsync(
      `INSERT INTO coins_history
         (family_id, child_id, session_id, defi_id, amount, reason, created_at, created_by, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        String(params.familyId),
        childId,
        params.sessionId,
        params.defiId ?? null,
        amount,
        params.reason ?? null,
        now,
        params.createdBy ?? "",
      ]
    );

    await db.runAsync(
      `UPDATE children
         SET korocoins = COALESCE(korocoins, 0) + ?
       WHERE id = ? AND family_id = ?;`,
      [amount, childId, String(params.familyId)]
    );
  }

  await logInfo({
    context: "Crédit Koro-Coins",
    timestamp: now,
    details: {
      session_id: params.sessionId,
      defi_id: params.defiId ?? null,
      amount_per_child: amount,
      total: amount * params.childIds.length,
    },
    familyId: params.familyId,
    childIdsJson: JSON.stringify(params.childIds),
    refId: params.sessionId,
  });
}

/**
 * Attache un média (photo/vidéo) à une session.
 * @param params Détails du média
 * @returns Identifiant du média inséré
 */
export async function attachMediaToSession(params: {
  sessionId: number;
  familyId: number;
  childIds?: number[];
  fileUri: string;
  mediaType?: "photo" | "video";
  metadata?: Record<string, any>;
}): Promise<number> {
  const db = await getDatabaseAsync();

  const takenAt = nowIso();
  const childJson = JSON.stringify(params.childIds ?? []);
  const metaJson = JSON.stringify(params.metadata ?? {});

  const res = await db.runAsync(
    `INSERT INTO session_media(
       session_id, family_id, child_ids, file_uri, media_type, taken_at, metadata, is_synced
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    [
      params.sessionId,
      String(params.familyId),
      childJson,
      params.fileUri,
      params.mediaType ?? "photo",
      takenAt,
      metaJson,
    ]
  );

  const mediaId: number = res?.lastInsertRowId;

  await logInfo({
    context: "Média attaché à la session",
    timestamp: takenAt,
    details: {
      session_id: params.sessionId,
      media_id: mediaId,
      file_uri: params.fileUri,
      media_type: params.mediaType ?? "photo",
    },
    familyId: params.familyId,
    childIdsJson: childJson,
    refId: params.sessionId,
  });

  return mediaId;
}
