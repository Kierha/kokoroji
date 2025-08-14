/**
 * Modèle DefiHistory : représente un historique de validation de défi.
 * @property id Identifiant unique (auto-incrément local)
 * @property defi_id Référence au défi (UUID Supabase ou auto-incrément local)
 * @property family_id Référence à la famille (number)
 * @property children_ids Tableau d’identifiants enfants concernés (stocké sous forme de string JSON en BDD)
 * @property session_id Référence à une session/groupement d’actions (optionnel)
 * @property completed_at Date et heure de validation (format ISO)
 * @property completed_by Utilisateur ayant validé le défi (optionnel)
 * @property is_synced Statut de synchronisation (0 = non synchronisé, 1 = synchronisé)
 */
export type DefiHistory = {
  id: number;
  defi_id: string | number;
  family_id: number;
  children_ids: number[];
  session_id?: number;
  completed_at: string;
  completed_by?: string;
  is_synced: number;
};
