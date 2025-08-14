/**
 * Modèle RewardHistoryEntry : entrée d’historique d’attribution d’une récompense.
 * Correspond à la table locale SQLite "reward_history".
 * @property id Identifiant historique
 * @property reward_id Référence à la récompense attribuée
 * @property family_id Référence à la famille
 * @property children_ids Tableau d’identifiants enfants concernés (stocké sous forme de string JSON en BDD)
 * @property session_id Référence à la session liée (optionnelle)
 * @property received_at Date et heure d’attribution (ISO)
 * @property received_by Nom ou identifiant du parent ayant validé (optionnel)
 * @property is_synced Statut de synchronisation (0 = non synchronisé, 1 = synchronisé)
 * @property title Titre de la récompense (jointure, optionnel)
 * @property description Description de la récompense (jointure, optionnelle)
 * @property cost Coût de la récompense (jointure, optionnel)
 */
export interface RewardHistoryEntry {
    id: number;
    reward_id: number;
    family_id: number;
    children_ids: number[];
    session_id?: number;
    received_at: string;
    received_by: string;
    is_synced: number;

    // Champs additionnels (via jointure)
    title?: string;
    description?: string;
    cost?: number;
}
