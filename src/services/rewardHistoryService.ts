import { getDatabaseAsync } from "../database/db";
import { RewardHistoryEntry } from "../models/rewardHistory";

/**
 * Récupère l'historique des récompenses attribuées à une famille,
 * avec possibilité de filtrer par texte, dates ou identifiant de récompense.
 *
 * @param family_id Identifiant de la famille (number)
 * @param filter Filtres optionnels : search, startDate, endDate, rewardId
 * @returns Liste d’entrées d’historique de récompense (RewardHistoryEntry[])
 */
export async function getRewardHistory(
    family_id: number,
    filter?: { search?: string; startDate?: string; endDate?: string; rewardId?: number }
): Promise<RewardHistoryEntry[]> {
    const db = await getDatabaseAsync();

    let query = `
        SELECT
            h.*,
            r.title,
            r.description,
            r.cost
        FROM reward_history h
        JOIN reward_custom r ON r.id = h.reward_id
        WHERE h.family_id = ?
    `;
    const params: (string | number)[] = [String(family_id)];

    if (filter?.rewardId !== undefined) {
        query += ` AND h.reward_id = ?`;
        params.push(String(filter.rewardId));
    }
    if (filter?.search) {
        query += ` AND (h.received_by LIKE ? OR r.title LIKE ?)`;
        params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter?.startDate) {
        query += ` AND h.received_at >= ?`;
        params.push(filter.startDate);
    }
    if (filter?.endDate) {
        query += ` AND h.received_at <= ?`;
        params.push(filter.endDate);
    }

    query += ` ORDER BY h.received_at DESC`;

    const results = await db.getAllAsync(query, params);

    // Transformation : parsing robuste des tableaux, conversion des types
    return (results ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        reward_id: isNaN(Number(row.reward_id)) ? row.reward_id : Number(row.reward_id),
        family_id: Number(row.family_id),
        children_ids: safeParseIds(row.children_ids),
        session_id: row.session_id !== undefined ? row.session_id : undefined,
        received_at: row.received_at,
        received_by: row.received_by ?? undefined,
        is_synced: row.is_synced,
        title: row.title,
        description: row.description,
        cost: row.cost,
    })) as RewardHistoryEntry[];
}

/**
 * Parse robuste d’un champ JSON d’IDs enfants en number[].
 * Garantit un tableau de nombres même en cas d’anomalie.
 *
 * @param v Valeur à parser (string JSON ou tableau)
 * @returns Tableau d’entiers
 */
function safeParseIds(v: unknown): number[] {
    try {
        const arr = typeof v === "string" ? JSON.parse(v) : Array.isArray(v) ? v : [];
        if (!Array.isArray(arr)) return [];
        return arr
            .map((x) => (typeof x === "number" ? x : Number(x)))
            .filter((n) => !isNaN(n));
    } catch {
        return [];
    }
}
