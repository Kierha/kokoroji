import { getDatabaseAsync } from "../database/db";

// Clés utilisées dans la table app_flags pour les paramètres de synchronisation
const SYNC_ENABLED_KEY = "sync_enabled";
const SYNC_STATE_KEY = "sync_state";
const LAST_SYNC_KEY = "last_sync";
const LAST_MANUAL_SYNC_KEY = "last_manual_sync";

/**
 * Récupère l'état d'activation de la synchronisation.
 * @returns true si activée, false sinon
 */
export async function getSyncEnabled(): Promise<boolean> {
  const db = await getDatabaseAsync();
  const result = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [SYNC_ENABLED_KEY]
  );
  return result?.value === "1";
}

/**
 * Définit l'état d'activation de la synchronisation.
 * @param enabled - true pour activer, false pour désactiver
 */
export async function setSyncEnabled(enabled: boolean): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [SYNC_ENABLED_KEY, enabled ? "1" : "0"]
  );
}

export type SyncState = "never" | "idle" | "syncing" | "pending";

/**
 * Récupère l'état actuel de la synchronisation.
 * @returns L'état de synchronisation ou "never" par défaut
 */
export async function getSyncState(): Promise<SyncState> {
  const db = await getDatabaseAsync();
  const result = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [SYNC_STATE_KEY]
  );
  const v = result?.value;
  if (v === "idle" || v === "syncing" || v === "pending" || v === "never") return v;
  return "never";
}

/**
 * Met à jour l'état de la synchronisation.
 * @param state Nouvel état de synchronisation
 */
export async function setSyncState(state: SyncState): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [SYNC_STATE_KEY, state]
  );
}

/**
 * Récupère la date de la dernière synchronisation.
 * @returns Date ou null si aucune date enregistrée
 */
export async function getLastSync(): Promise<Date | null> {
  const db = await getDatabaseAsync();
  const result = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [LAST_SYNC_KEY]
  );
  return result?.value ? new Date(result.value) : null;
}

/**
 * Enregistre la date de la dernière synchronisation.
 * @param date Date à enregistrer ou null pour effacer
 */
export async function setLastSync(date: Date | null): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [LAST_SYNC_KEY, date ? date.toISOString() : null]
  );
}

/**
 * Récupère le timestamp de la dernière synchronisation manuelle.
 * @returns Timestamp en millisecondes ou null si non défini
 */
export async function getLastManualSync(): Promise<number | null> {
  const db = await getDatabaseAsync();
  const result = await db.getFirstAsync(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [LAST_MANUAL_SYNC_KEY]
  );
  return result?.value ? parseInt(result.value, 10) : null;
}

/**
 * Enregistre le timestamp de la dernière synchronisation manuelle.
 * @param ts Timestamp en millisecondes
 */
export async function setLastManualSync(ts: number): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [LAST_MANUAL_SYNC_KEY, ts.toString()]
  );
}
