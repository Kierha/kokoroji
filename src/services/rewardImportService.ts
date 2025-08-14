import { getDatabaseAsync } from "../database/db";
import { supabase } from "./supabaseClient";
import { getRewardsImportedFlag, setRewardsImportedFlag } from "./settingsFlagsService";
import { Reward } from "../models/reward";

/**
 * Renvoie l'heure courante au format HH:MM:SS.mmm.
 * Utilisé pour tracer les logs dans la console.
 */
const ts = () => new Date().toISOString().slice(11, 23);

/**
 * Récupère la liste des récompenses par défaut depuis Supabase.
 * @returns Tableau de récompenses partielles (formaté pour l’import local).
 */
export async function fetchDefaultRewardsFromSupabase(): Promise<Partial<Reward>[]> {
    const { data, error } = await supabase
        .from("rewards_default")
        .select(`title, description, points_required, category`);

    if (error) {
        console.error(`[${ts()}] [Import Reward] Supabase error:`, error);
        return [];
    }

    // Conversion au format attendu localement (points_required -> cost)
    return (data ?? []).map((r: any) => ({
        title: r.title ?? "",
        description: r.description ?? "",
        cost: r.points_required ?? 0,
        category: r.category ?? "",
        created_by: "system",
    })) as Partial<Reward>[];
}

/**
 * Importe une liste de récompenses par défaut dans la base locale.
 * @param family_id Identifiant de la famille
 * @param rewards Liste des récompenses à insérer (issues du cloud)
 */
export async function importDefaultRewards(
    family_id: number,
    rewards: Partial<Reward>[]
): Promise<void> {
    const db = await getDatabaseAsync();

    await db.execAsync("BEGIN TRANSACTION;");

    try {
        for (const r of rewards) {
            await db.runAsync(
                `INSERT INTO reward_custom (
                    family_id, title, description, cost, created_by, is_synced
                ) VALUES (?, ?, ?, ?, ?, 1);`,
                [
                    String(family_id),
                    r.title ?? "",
                    r.description ?? "",
                    r.cost ?? 0,
                    r.created_by ?? "system",
                ]
            );
        }
        await db.execAsync("COMMIT;");
    } catch (err) {
        await db.execAsync("ROLLBACK;");
        throw err;
    }
}

/**
 * Orchestration : propose l’import des récompenses par défaut puis réalise l’import si accepté.
 * Gère les callbacks pour l’UI (état de l’import).
 *
 * @param family_id Identifiant de la famille
 * @param callbacks Callbacks optionnels pour notifier l’UI (début, succès, annulation)
 * @returns true si import réalisé, false sinon
 */
export async function proposeAndImportDefaultRewardsCloud(
    family_id: number,
    {
        onImportStart,
        onImportSuccess,
        onImportCancel,
    }: {
        onImportStart?: () => void;
        onImportSuccess?: () => void;
        onImportCancel?: () => void;
    } = {}
): Promise<boolean> {
    if (await getRewardsImportedFlag()) {
        return false;
    }

    onImportStart?.();

    try {
        const defaultRewards = await fetchDefaultRewardsFromSupabase();

        if (defaultRewards.length === 0) {
            await setRewardsImportedFlag(true);
            onImportCancel?.();
            return false;
        }

        await importDefaultRewards(family_id, defaultRewards);

        await setRewardsImportedFlag(true);
        onImportSuccess?.();
        return true;
    } catch (err) {
        console.error(`[${ts()}] [Import Reward] ERROR:`, err);
        onImportCancel?.();
        return false;
    }
}
