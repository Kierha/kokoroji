export type SessionType = "random" | "bundle";

/**
 * Ligne brute de la table des sessions (format persistance).
 * @property id Identifiant interne autoincrémenté
 * @property family_id Identifiant famille propriétaire
 * @property children_ids Tableau JSON sérialisé des participants (ex: "[1,2]")
 * @property started_at Horodatage ISO de début
 * @property ended_at Horodatage ISO de fin ou null si session en cours
 * @property created_by Identifiant créateur (optionnel)
 * @property is_synced 1 si synchronisé, 0 sinon
 * @property session_type Type de session (random|bundle)
 * @property category Catégorie normalisée ("pedagogique" | "ludique" ...)
 * @property location Lieu normalisé ("interieur" | "exterieur" ...)
 * @property planned_duration_min Durée planifiée en minutes
 * @property total_defis_completed Nombre total de défis complétés (compteur agrégé)
 * @property total_korocoins_awarded Somme totale de Korocoins attribués
 */
export interface DBSessionRow {
  id: number;
  family_id: number;
  children_ids: string;
  started_at: string;
  ended_at?: string | null;
  created_by?: string | null;
  is_synced: number;
  session_type?: SessionType | null;
  category?: string | null;
  location?: string | null;
  planned_duration_min?: number | null;
  total_defis_completed: number;
  total_korocoins_awarded: number;
}

/**
 * Représentation métier adaptée à l'UI / logique applicative.
 * Conversion typique depuis DBSessionRow :
 *  - children_ids (JSON string) -> childIds (number[])
 *  - started_at / ended_at -> Date
 *  - agrégats total_* regroupés dans totals
 */
export interface Session {
  id: number;
  familyId: number;
  childIds: number[];
  startedAt: Date;
  endedAt?: Date;
  createdBy?: string;
  type?: SessionType;
  category?: string | null;
  location?: string;
  plannedDurationMin?: number;
  totals: {
    defisCompleted: number;
    korocoinsAwarded: number;
  };
  isSynced: boolean;
}
