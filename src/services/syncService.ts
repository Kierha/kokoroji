import { supabase } from "./supabaseClient";
import { getPendingLogs, markLogsAsSynced } from "./logService";

/**
 * Synchronise les logs en attente (non synchronisés) vers le cloud Supabase.
 * - Récupère les logs locaux en attente.
 * - Les insère en batch dans la table cloud "app_logs".
 * - Marque les logs synchronisés localement.
 *
 * @throws En cas d’erreur lors de l’insertion ou de la mise à jour des logs.
 */
export async function syncLogsToCloud(): Promise<void> {
  const pendingLogs = await getPendingLogs();
  if (pendingLogs.length === 0) {
    console.log("[SYNC] Aucun log à synchroniser.");
    return;
  }

  try {
    // Prépare les logs au format attendu par Supabase
    const logsToInsert = pendingLogs.map((log) => ({
      timestamp: log.timestamp,
      family_id: log.family_id,
      child_ids: log.child_ids,
      log_type: log.log_type,
      level: log.level,
      context: log.context,
      details: log.details,
      ref_id: log.ref_id,
      device_info: log.device_info,
    }));

    // Envoi batch vers Supabase
    const { error } = await supabase.from("app_logs").insert(logsToInsert);

    if (error) {
      console.error("[SYNC] Erreur lors de la synchro logs:", error);
      throw error;
    }

    // Mise à jour locale pour marquer les logs comme synchronisés
    await markLogsAsSynced(pendingLogs.map((log) => log.id!));

    console.log(`[SYNC] ${pendingLogs.length} logs synchronisés vers le cloud.`);
  } catch (error) {
    console.error("[SYNC] Erreur dans syncLogsToCloud:", error);
    // Logs restent en attente pour tentative future
    throw error;
  }
}
