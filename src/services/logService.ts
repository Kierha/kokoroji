import { getDatabaseAsync } from "../database/db";

export type LogLevel = "info" | "warning" | "error" | "critical";
export type LogType =
  | "session"
  | "defi"
  | "reward"
  | "profile"
  | "sync"
  | "error"
  | "debug"
  | "system";

export interface AppLog {
  id?: number;
  timestamp: string;         // Date/heure au format ISO 8601
  family_id?: string;
  child_ids: string;         // JSON.stringify tableau d'IDs enfants
  log_type: LogType;
  level: LogLevel;
  context: string;
  details?: string;          // JSON.stringify objet de détails supplémentaires
  ref_id?: string;
  is_synced?: number;        // 0 = non synchronisé, 1 = synchronisé
  device_info?: string;
}

/**
 * Ajoute un log dans la table app_logs.
 *
 * @param log - Objet log à insérer.
 * @returns Promise<void>
 */
export async function addLog(log: AppLog): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT INTO app_logs
      (timestamp, family_id, child_ids, log_type, level, context, details, ref_id, is_synced, device_info)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.timestamp,
      log.family_id ?? null,
      log.child_ids ?? "[]",
      log.log_type,
      log.level,
      log.context,
      log.details ?? null,
      log.ref_id ?? null,
      log.is_synced ?? 0,
      log.device_info ?? null,
    ]
  );
}

/**
 * Récupère les logs selon des critères de filtrage optionnels.
 *
 * @param filter - Objet partiel de filtres (log_type, child_id, is_synced).
 * @returns Promise<AppLog[]> - Liste des logs correspondants.
 */
export async function getLogs(filter: Partial<{ log_type: LogType; child_id: string; is_synced: number }> = {}): Promise<AppLog[]> {
  const db = await getDatabaseAsync();
  let sql = `SELECT * FROM app_logs WHERE 1=1`;
  const params: any[] = [];

  if (filter.log_type) {
    sql += " AND log_type = ?";
    params.push(filter.log_type);
  }
  if (filter.child_id) {
    sql += " AND child_ids LIKE ?";
    params.push(`%${filter.child_id}%`);
  }
  if (filter.is_synced !== undefined) {
    sql += " AND is_synced = ?";
    params.push(filter.is_synced);
  }

  const rows = await db.getAllAsync(sql, params);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Récupère tous les logs non synchronisés (is_synced = 0).
 *
 * @returns Promise<AppLog[]>
 */
export async function getPendingLogs(): Promise<AppLog[]> {
  return getLogs({ is_synced: 0 });
}

/**
 * Marque un log comme synchronisé.
 *
 * @param id - Identifiant du log à mettre à jour.
 * @returns Promise<void>
 */
export async function markLogAsSynced(id: number): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(`UPDATE app_logs SET is_synced = 1 WHERE id = ?`, [id]);
}

/**
 * Marque plusieurs logs comme synchronisés.
 *
 * @param ids - Tableau d’identifiants de logs.
 * @returns Promise<void>
 */
export async function markLogsAsSynced(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => "?").join(",");
  await db.runAsync(`UPDATE app_logs SET is_synced = 1 WHERE id IN (${placeholders})`, ids);
}

/**
 * Supprime les logs antérieurs à un nombre de jours donné.
 *
 * @param days - Nombre de jours (par défaut 30).
 * @returns Promise<void>
 */
export async function purgeOldLogs(days: number = 30): Promise<void> {
  const db = await getDatabaseAsync();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  await db.runAsync(`DELETE FROM app_logs WHERE timestamp < ?`, [cutoffDate]);
  console.log(`[LOGS] Purge des logs avant le ${cutoffDate} effectuée.`);
}

/**
 * Supprime tous les logs (fonction utilitaire debug/dev).
 *
 * @returns Promise<void>
 */
export async function clearLogs(): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(`DELETE FROM app_logs`);
}
