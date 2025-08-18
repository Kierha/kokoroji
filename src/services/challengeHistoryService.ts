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

// =============================================================
// VERSION ENRICHIE POUR L'UI (titre du défi + noms des enfants)
// =============================================================

export interface DefiHistoryDetailed extends DefiHistory {
    title?: string;                 // Titre du défi si retrouvé dans defi_custom
    participant_names: string[];    // Noms des enfants participants
}

/**
 * Récupère l'historique enrichi des défis réalisés :
 *  - jointure (LEFT JOIN) sur defi_custom pour récupérer le titre
 *  - résolution des noms des enfants via table children
 *  - filtres optionnels (search sur titre / completed_by / id défi, bornes dates)
 * Ne modifie pas la fonction existante getDefiHistory afin de ne pas casser les tests existants.
 */
export async function getDefiHistoryDetailed(
    family_id: number,
    filter?: { search?: string; startDate?: string; endDate?: string }
): Promise<DefiHistoryDetailed[]> {
    const db = await getDatabaseAsync();

    const where: string[] = ["h.family_id = ?"]; // alias h = defi_history
    const params: any[] = [String(family_id)];

    if (filter?.startDate) {
        where.push("h.completed_at >= ?");
        params.push(filter.startDate);
    }
    if (filter?.endDate) {
        where.push("h.completed_at <= ?");
        params.push(filter.endDate);
    }
    if (filter?.search && filter.search.trim().length) {
        const q = `%${filter.search.trim().toLowerCase()}%`;
        where.push(`(
            LOWER(COALESCE(h.completed_by, '')) LIKE ?
            OR LOWER(COALESCE(dc.title, '')) LIKE ?
            OR CAST(h.defi_id AS TEXT) LIKE ?
        )`);
        params.push(q, q, `%${filter.search.trim()}%`); // pour l'id on garde casse d'origine
    }

    const sql = `SELECT
            h.*, 
            dc.title AS defi_title
        FROM defi_history h
        LEFT JOIN defi_custom dc ON dc.id = CAST(h.defi_id AS INTEGER) AND dc.family_id = h.family_id
        WHERE ${where.join(" AND ")}
        ORDER BY h.completed_at DESC`;

    const rows = await db.getAllAsync(sql, params);

    // Agrège tous les IDs enfants à résoudre en une seule requête
    const allChildIds = new Set<number>();
    for (const r of rows ?? []) {
        if (r.children_ids) {
            try {
                const arr = JSON.parse(r.children_ids);
                if (Array.isArray(arr)) arr.forEach((id: any) => { const n = Number(id); if (!isNaN(n)) allChildIds.add(n); });
            } catch { /* ignore */ }
        }
    }

    let childNameMap = new Map<number, string>();
    if (allChildIds.size > 0) {
        const placeholders = Array.from(allChildIds).map(() => "?").join(",");
        const childrenRows = await db.getAllAsync(
            `SELECT id, name FROM children WHERE id IN (${placeholders});`,
            Array.from(allChildIds).map(String)
        );
        childNameMap = new Map(
            (childrenRows ?? []).map((c: any) => [Number(c.id), c.name as string])
        );
    }

    return (rows ?? []).map((row: any) => {
        let childrenIds: number[] = [];
        if (row.children_ids) {
            try {
                const parsed = JSON.parse(row.children_ids);
                if (Array.isArray(parsed)) {
                    childrenIds = parsed.map((x: any) => Number(x)).filter((x: number) => !isNaN(x));
                }
            } catch { /* ignore */ }
        }
        const participant_names = childrenIds.map(id => childNameMap.get(id) || `Enfant ${id}`);
        return {
            id: Number(row.id),
            defi_id: isNaN(Number(row.defi_id)) ? row.defi_id : Number(row.defi_id),
            family_id: Number(row.family_id),
            children_ids: childrenIds,
            session_id: row.session_id !== undefined ? row.session_id : undefined,
            completed_at: row.completed_at,
            completed_by: row.completed_by ?? undefined,
            is_synced: row.is_synced,
            title: row.defi_title ?? undefined,
            participant_names,
        } as DefiHistoryDetailed;
    });
}
