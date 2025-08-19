/**
 * Entrée d'historique de session (projection agrégée pour affichage).
 * @property id Identifiant de session
 * @property family_id Famille concernée
 * @property started_at Date/heure ISO de début
 * @property ended_at Date/heure ISO de fin ou null
 * @property session_type Type (random | bundle | ...)
 * @property location Lieu (interieur | exterieur | ...)
 * @property planned_duration_min Durée planifiée
 * @property participants Liste d'identifiants participants
 * @property defis_count Nombre de défis réalisés
 * @property coins_sum Somme des Korocoins attribués
 * @property media_count Nombre de médias attachés
 */
export interface SessionHistoryEntry {
  id: number;
  family_id: number;
  started_at: string;
  ended_at: string | null;
  session_type: string | null;
  location: string | null;
  planned_duration_min: number | null;
  participants: number[];
  defis_count: number;
  coins_sum: number;
  media_count: number;
}