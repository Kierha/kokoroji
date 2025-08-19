import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";
import type { SessionHistoryEntry } from "../models/sessionHistory";

/**
 * Convertit une date YYYY-MM-DD en borne ISO début de journée (UTC).
 * @param day Date au format YYYY-MM-DD
 * @returns Chaîne ISO ou undefined si non fourni
 */
function toIsoStart(day?: string): string | undefined {
  if (!day) return undefined;
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

/**
 * Convertit une date YYYY-MM-DD en borne ISO fin de journée (UTC).
 * @param day Date au format YYYY-MM-DD
 * @returns Chaîne ISO ou undefined si non fourni
 */
function toIsoEnd(day?: string): string | undefined {
  if (!day) return undefined;
  return new Date(`${day}T23:59:59.999Z`).toISOString();
}

/**
 * Récupère l'historique des sessions d'une famille.
 * - Recherche plein-texte (session_type, location, created_by, id).
 * - Filtre par bornes de dates (started_at).
 * - Ajoute des agrégats : nb défis, somme coins, nb médias.
 *
 * @param familyId Identifiant de la famille
 * @param filters Filtres optionnels : { search?: string; startDate?: string; endDate?: string }
 * @returns Liste des entrées d’historique de session
 */
export async function getSessionHistory(
  familyId: number,
  filters: { search?: string; startDate?: string; endDate?: string } = {}
): Promise<SessionHistoryEntry[]> {
  const db = await getDatabaseAsync();

  const where: string[] = ["s.family_id = ?"];
  const params: (string | number)[] = [String(familyId)];

  const startIso = toIsoStart(filters.startDate);
  const endIso = toIsoEnd(filters.endDate);

  if (startIso) {
    where.push("s.started_at >= ?");
    params.push(startIso);
  }
  if (endIso) {
    where.push("s.started_at <= ?");
    params.push(endIso);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const q = `%${filters.search.trim().toLowerCase()}%`;
    where.push(`
      (
        LOWER(COALESCE(s.session_type, '')) LIKE ?
        OR LOWER(COALESCE(s.location, '')) LIKE ?
        OR LOWER(COALESCE(s.created_by, '')) LIKE ?
        OR CAST(s.id AS TEXT) LIKE ?
      )
    `);
    params.push(q, q, q, `%${filters.search.trim()}%`);
  }

  try {
    const rows = await db.getAllAsync(
      `
      SELECT
        s.id,
        s.family_id,
        s.started_at,
        s.ended_at,
        s.session_type,
        s.location,
        s.planned_duration_min,
        s.children_ids,
        COALESCE((SELECT COUNT(*) FROM defi_history dh WHERE dh.session_id = s.id), 0) AS defis_count,
        COALESCE((SELECT SUM(amount) FROM coins_history ch WHERE ch.session_id = s.id), 0) AS coins_sum,
        COALESCE((SELECT COUNT(*) FROM session_media sm WHERE sm.session_id = s.id), 0) AS media_count
      FROM session s
      WHERE ${where.join(" AND ")}
      ORDER BY s.started_at DESC;
      `,
      params
    );

    const list: SessionHistoryEntry[] = (rows ?? []).map((r: Record<string, unknown>) => {
      let participants: number[] = [];
      try {
        const raw = typeof (r as any).children_ids === 'string' ? (r as any).children_ids : '[]';
        const parsed = JSON.parse(raw);
        participants = Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'number').map(Number) : [];
      } catch {
        participants = [];
      }
      return {
        id: Number((r as any).id),
        family_id: Number((r as any).family_id),
        started_at: String((r as any).started_at),
        ended_at: (r as any).ended_at ? String((r as any).ended_at) : null,
        session_type: (r as any).session_type ?? null,
        location: (r as any).location ?? null,
        planned_duration_min: (r as any).planned_duration_min !== null ? Number((r as any).planned_duration_min) : null,
        participants,
        defis_count: Number((r as any).defis_count ?? 0),
        coins_sum: Number((r as any).coins_sum ?? 0),
        media_count: Number((r as any).media_count ?? 0),
      };
    });

    return list;
  } catch (err: any) {
    await addLog({
      timestamp: new Date().toISOString(),
      family_id: String(familyId),
      child_ids: "[]",
      log_type: "system",
      level: "error",
      context: "Erreur getSessionHistory",
      details: JSON.stringify({ message: err?.message, filters }),
      ref_id: undefined,
      device_info: undefined,
    });
    throw err;
  }
}
