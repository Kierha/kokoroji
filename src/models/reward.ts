/**
 * Modèle Reward : représente une récompense personnalisée Kokoroji.
 * Correspond à la table locale SQLite "reward_custom" et à la synchronisation Supabase.
 * @property id Identifiant interne SQLite
 * @property family_id Référence à la famille propriétaire
 * @property title Nom de la récompense
 * @property description Description facultative de la récompense
 * @property cost Coût en KoroCoins
 * @property created_by Créateur de la récompense ("system" ou utilisateur)
 * @property created_at Date de création (ISO)
 * @property updated_at Date de mise à jour (ISO)
 * @property is_synced Statut de synchronisation (0 = non synchronisé, 1 = synchronisé)
 */
export interface Reward {
    id: number;
    family_id: number;
    title: string;
    description?: string;
    cost: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_synced: number;
}

/**
 * Modèle RewardPayload : utilitaire pour la création/mise à jour d'une récompense.
 * @property title Nom de la récompense
 * @property description Description facultative
 * @property cost Coût en KoroCoins
 */
export interface RewardPayload {
    title: string;
    description?: string;
    cost: number;
}
