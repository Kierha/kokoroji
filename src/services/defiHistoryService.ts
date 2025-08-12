import { getDatabaseAsync } from "../database/db";
import { DefiHistory } from "../models/defiHistory";

/**
 * Récupère l'historique des défis réalisés, filtré par texte et/ou dates.
 * @param family_id - ID famille (user id, **number**)
 * @param filter - { search, startDate, endDate }
 * @returns Liste filtrée d'historique de défis
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

  // Conversion JSON string → array pour children_ids (robuste si le champ est vide)
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
 * Ajoute une entrée d'historique lorsqu'un défi est validé.
 * @param data - données de l'historique à ajouter (hors id, is_synced par défaut à 0)
 */
export async function addDefiHistory(data: Omit<DefiHistory, "id" | "is_synced">): Promise<number> {
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
 * (Optionnel) Supprime une entrée d'historique (si jamais besoin)
 * @param id - id de l'entrée à supprimer
 */
export async function deleteDefiHistory(id: number): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `DELETE FROM defi_history WHERE id = ?;`,
    [id]
  );
}
