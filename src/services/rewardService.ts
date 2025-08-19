import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";
import type { Reward } from "../models/reward";

/**
 * Récupère toutes les récompenses personnalisées d’une famille.
 * @param family_id Identifiant de la famille
 * @returns Liste des récompenses (array)
 */
export async function getAllRewards(family_id: number): Promise<Reward[]> {
    const db = await getDatabaseAsync();
    const results = await db.getAllAsync(
        `SELECT * FROM reward_custom 
         WHERE family_id = ? 
         ORDER BY created_at DESC;`,
        [String(family_id)]
    );
    return (results ?? []) as Reward[];
}

/**
 * Ajoute une nouvelle récompense personnalisée.
 * @param reward Données minimales de la récompense à insérer
 * @returns Identifiant de la récompense insérée
 */
export async function addReward(
    reward: Omit<Reward, "id" | "created_at" | "updated_at" | "is_synced">
): Promise<number> {
    const db = await getDatabaseAsync();
    const result = await db.runAsync(
        `INSERT INTO reward_custom (
            family_id, title, description, cost, created_by, is_synced
        ) VALUES (?, ?, ?, ?, ?, 0);`,
        [
            String(reward.family_id),
            reward.title,
            reward.description ?? "",
            reward.cost ?? 0,
            reward.created_by ?? "",
        ]
    );

    await addLog({
        timestamp: new Date().toISOString(),
        family_id: String(reward.family_id),
        child_ids: "[]",
        log_type: "reward_created",
        level: "info",
        context: "Ajout d'une récompense personnalisée",
        details: JSON.stringify({ reward }),
    });

    return result?.lastInsertRowId;
}

/**
 * Met à jour une récompense existante.
 * @param reward Données de la récompense à mettre à jour (doit contenir un id)
 * @throws Erreur si l'id est manquant
 */
export type RewardUpdate = Pick<Reward, "id" | "family_id" | "title" | "description" | "cost">;

export async function updateReward(reward: RewardUpdate): Promise<void> {
    if (!reward.id) throw new Error("ID de la récompense requis pour la mise à jour");
    const db = await getDatabaseAsync();
    await db.runAsync(
        `UPDATE reward_custom
         SET title = ?, description = ?, cost = ?,
             updated_at = CURRENT_TIMESTAMP, is_synced = 0
         WHERE id = ? AND family_id = ?;`,
        [
            reward.title,
            reward.description ?? "",
            reward.cost ?? 0,
            reward.id,
            String(reward.family_id),
        ]
    );

    await addLog({
        timestamp: new Date().toISOString(),
        family_id: String(reward.family_id),
        child_ids: "[]",
        log_type: "reward",
        level: "info",
        context: "Modification d'une récompense",
        details: JSON.stringify({ reward }),
    });
}

/**
 * Supprime une récompense personnalisée selon son ID et la famille.
 * @param id Identifiant de la récompense
 * @param family_id Identifiant de la famille
 */
export async function deleteReward(id: number, family_id: number): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
        `DELETE FROM reward_custom 
         WHERE id = ? AND family_id = ?;`,
        [id, String(family_id)]
    );

    await addLog({
        timestamp: new Date().toISOString(),
        family_id: String(family_id),
        child_ids: "[]",
        log_type: "reward",
        level: "info",
        context: "Suppression d'une récompense personnalisée",
        details: JSON.stringify({ id }),
    });
}
