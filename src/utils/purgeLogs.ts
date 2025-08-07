import { getDatabaseAsync } from "../database/db";
import { purgeOldLogs } from "../services/logService";

const PURGE_FLAG_KEY = "last_purge_date";

/**
 * Récupère la valeur d’un flag dans la table app_flags.
 *
 * @param key - Clé du flag.
 * @returns Valeur associée ou null si non trouvée.
 */
async function getFlag(key: string): Promise<string | null> {
  const db = await getDatabaseAsync();
  const result = await db.getFirstAsync(`SELECT value FROM app_flags WHERE key = ?;`, [key]);
  return result?.value ?? null;
}

/**
 * Enregistre une valeur de flag dans la table app_flags.
 *
 * @param key - Clé du flag.
 * @param value - Valeur à enregistrer.
 */
async function setFlag(key: string, value: string): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [key, value]
  );
}

/**
 * Vérifie si une purge des logs est nécessaire pour la journée en cours,
 * et lance la purge des logs plus anciens que 'days' si besoin.
 *
 * @param days - Nombre de jours au-delà desquels les logs sont purgés (défaut 30).
 */
export async function checkAndPurgeLogs(days = 30): Promise<void> {
  const lastPurge = await getFlag(PURGE_FLAG_KEY);
  const now = new Date();

  if (!lastPurge || new Date(lastPurge).toDateString() !== now.toDateString()) {
    await purgeOldLogs(days);
    await setFlag(PURGE_FLAG_KEY, now.toISOString());
    console.log("Purge journalière effectuée.");
  } else {
    console.log("Purge déjà effectuée aujourd’hui.");
  }
}
