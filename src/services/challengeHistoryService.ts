import { getDatabaseAsync } from "../database/db";
import { DefiHistory } from "../models/challengeHistory";

/**
 * Récupère l'historique des défis réalisés pour une famille,
 * avec possibilité de filtrer par texte (champ completed_by) et/ou plage de dates.
 *
 * @param family_id Identifiant de la famille (number)
 * @param filter Filtres facultatifs { search, startDate, endDate }
 * @returns Liste d’entrées d’historique (DefiHistory[])
 */
export async function getDefiHistory(
    family_id: number,
    filter?: { search?: string; startDate?: string; endDate?: string }
): Promise<DefiHistory[]> {
    const db = await getDatabaseAsync();
    let query = `SELECT * FROM defi_history WHERE family_id = ?`;
    const params: any[] = [String(family_id)];

    if (filter?.search) {
        query += ` AND (completed_by LIKE ?)`;
        params.push(`%${filter.search}%`);
    }
    if (filter?.startDate) {
        query += ` AND completed_at >= ?`;
        params.push(filter.startDate);
    }
    if (filter?.endDate) {
        query += ` AND completed_at <= ?`;
        params.push(filter.endDate);
    }
    query += ` ORDER BY completed_at DESC`;

    const results = await db.getAllAsync(query, params);

    // Conversion des champs pour garantir le typage (string[] pour children_ids)
    return (results ?? []).map((row: any) => ({
        ...row,
        defi_id: isNaN(Number(row.defi_id)) ? row.defi_id : Number(row.defi_id),
        family_id: Number(row.family_id),
        children_ids: row.children_ids ? JSON.parse(row.children_ids) : [],
        session_id: row.session_id !== undefined ? row.session_id : undefined,
        completed_at: row.completed_at,
        completed_by: row.completed_by ?? undefined,
        is_synced: row.is_synced,
    })) as DefiHistory[];
}

/**
 * Ajoute une entrée d'historique lors de la validation d’un défi.
 *
 * @param data Données d’historique à insérer (hors id et is_synced)
 * @returns Identifiant de l’entrée insérée
 */
export async function addDefiHistory(
    data: Omit<DefiHistory, "id" | "is_synced">
): Promise<number> {
    const db = await getDatabaseAsync();
    const result = await db.runAsync(
        `INSERT INTO defi_history (
            defi_id, family_id, children_ids, session_id, completed_at, completed_by, is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, 0);`,
        [
            typeof data.defi_id === "number" ? String(data.defi_id) : data.defi_id,
            String(data.family_id),
            JSON.stringify(data.children_ids),
            data.session_id ?? null,
            data.completed_at,
            data.completed_by ?? null,
        ]
    );
    return result?.lastInsertRowId;
}

/**
 * Supprime une entrée d’historique de défi (optionnel).
 *
 * @param id Identifiant de l’entrée à supprimer
 */
export async function deleteDefiHistory(id: number): Promise<void> {
    const db = await getDatabaseAsync();
    await db.runAsync(
        `DELETE FROM defi_history WHERE id = ?;`,
        [id]
    );
}
