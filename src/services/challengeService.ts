import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";
import { Defi } from "../models/defi";

/**
 * Récupère tous les défis personnalisés pour une famille donnée.
 * @param family_id - Identifiant de la famille.
 * @returns Liste des défis.
 */
export async function getAllChallenges(family_id: number): Promise<Defi[]> {
  const db = await getDatabaseAsync();
  const results = await db.getAllAsync(
    `SELECT * FROM defi_custom WHERE family_id = ? ORDER BY created_at DESC;`,
    [String(family_id)]
  );
  return (results ?? []) as Defi[];
}

/**
 * Ajoute un nouveau défi personnalisé.
 * @param defi - Données du défi à insérer (sans id ni dates).
 * @returns ID du défi inséré.
 */
export async function addChallenge(
  defi: Omit<Defi, "id" | "created_at" | "updated_at">
): Promise<number> {
  const db = await getDatabaseAsync();
  const result = await db.runAsync(
    `INSERT INTO defi_custom (
      family_id, title, description, category, location,
      duration_min, points_default, photo_required, age_min, age_max,
      created_by, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [
      String(defi.family_id),
      defi.title,
      defi.description ?? "",
      defi.category ?? "",
      defi.location ?? "",
      defi.duration_min ?? null,
      defi.points_default ?? null,
      defi.photo_required ?? null,
      defi.age_min ?? null,
      defi.age_max ?? null,
      defi.created_by ?? "",
    ]
  );

  await addLog({
    timestamp: new Date().toISOString(),
    family_id: String(defi.family_id),
    child_ids: "[]",
    log_type: "defi",
    level: "info",
    context: "Ajout d'un défi personnalisé",
    details: JSON.stringify({ defi }),
  });

  return result?.lastInsertRowId;
}

/**
 * Met à jour un défi existant.
 * @param defi - Données complètes du défi (avec id).
 */
export async function updateChallenge(defi: Defi): Promise<void> {
  if (!defi.id) throw new Error("ID du défi requis pour la mise à jour");
  const db = await getDatabaseAsync();
  await db.runAsync(
    `UPDATE defi_custom
     SET title = ?, description = ?, category = ?, location = ?,
         duration_min = ?, points_default = ?, photo_required = ?, age_min = ?, age_max = ?,
         updated_at = CURRENT_TIMESTAMP, is_synced = 0
     WHERE id = ? AND family_id = ?;`,
    [
      defi.title,
      defi.description ?? "",
      defi.category ?? "",
      defi.location ?? "",
      defi.duration_min ?? null,
      defi.points_default ?? null,
      defi.photo_required ?? null,
      defi.age_min ?? null,
      defi.age_max ?? null,
      defi.id,
      String(defi.family_id),
    ]
  );

  await addLog({
    timestamp: new Date().toISOString(),
    family_id: String(defi.family_id),
    child_ids: "[]",
    log_type: "defi",
    level: "info",
    context: "Modification d'un défi",
    details: JSON.stringify({ defi }),
  });
}

/**
 * Supprime un défi par ID et famille.
 * @param id - Identifiant du défi.
 * @param family_id - Identifiant de la famille.
 */
export async function deleteChallenge(id: number, family_id: number): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `DELETE FROM defi_custom WHERE id = ? AND family_id = ?;`,
    [id, String(family_id)]
  );

  await addLog({
    timestamp: new Date().toISOString(),
    family_id: String(family_id),
    child_ids: "[]",
    log_type: "defi",
    level: "info",
    context: "Suppression d'un défi personnalisé",
    details: JSON.stringify({ id }),
  });
}

/**
 * Recherche des défis par titre, catégorie ou lieu.
 * @param family_id - Identifiant de la famille.
 * @param query - Chaîne de recherche.
 * @returns Liste des défis correspondants.
 */
export async function searchChallenges(family_id: number, query: string): Promise<Defi[]> {
  const db = await getDatabaseAsync();
  const results = await db.getAllAsync(
    `SELECT * FROM defi_custom
     WHERE family_id = ?
       AND (title LIKE ? OR category LIKE ? OR location LIKE ?)
     ORDER BY created_at DESC;`,
    [String(family_id), `%${query}%`, `%${query}%`, `%${query}%`]
  );
  return (results ?? []) as Defi[];
}

/**
 * Importe en base locale une liste de défis par défaut.
 * @param family_id - Identifiant de la famille.
 * @param challenges - Liste des défis à insérer.
 */
export async function importDefaultChallenges(
  family_id: number,
  challenges: Partial<Defi>[]
): Promise<void> {
  const ts = () => new Date().toISOString().slice(11, 23);
  const db = await getDatabaseAsync();

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    for (const ch of challenges) {
      await db.runAsync(
        `INSERT INTO defi_custom (
          family_id, title, description, category, location,
          duration_min, points_default, photo_required, age_min, age_max,
          is_synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          String(family_id),
          ch.title ?? "",
          ch.description ?? "",
          ch.category ?? "",
          ch.location ?? "",
          ch.duration_min ?? null,
          ch.points_default ?? null,
          ch.photo_required ?? null,
          ch.age_min ?? null,
          ch.age_max ?? null,
        ]
      );
    }

    await db.execAsync("COMMIT;");
  } catch (err) {
    await db.execAsync("ROLLBACK;");
    throw err;
  }

  await addLog({
    timestamp: new Date().toISOString(),
    family_id: String(family_id),
    child_ids: "[]",
    log_type: "defi",
    level: "info",
    context: "Import des défis par défaut",
    details: JSON.stringify({ count: challenges.length }),
  });
}

/**
 * Réactive un ou plusieurs défis (suppression dans l’historique).
 * @param family_id - Identifiant de la famille.
 * @param defiIds - Liste des identifiants de défis à réactiver.
 */
export async function reactivateChallenges(
  family_id: number,
  defiIds: number[]
): Promise<void> {
  if (defiIds.length === 0) return;
  const db = await getDatabaseAsync();

  const placeholders = defiIds.map(() => "?").join(",");
  await db.runAsync(
    `DELETE FROM defi_history
     WHERE family_id = ?
       AND defi_id IN (${placeholders});`,
    [String(family_id), ...defiIds.map(String)]
  );

  await addLog({
    timestamp: new Date().toISOString(),
    family_id: String(family_id),
    child_ids: "[]",
    log_type: "defi",
    level: "info",
    context: "Réactivation de défi(s)",
    details: JSON.stringify({ defiIds }),
  });
}
