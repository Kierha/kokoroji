/**
 * Modèle Defi : représente un défi (challenge) dans la base locale ou distante.
 * @property id Identifiant unique (UUID Supabase ou auto-incrément local)
 * @property family_id Référence à la famille (présent uniquement pour les défis personnalisés locaux)
 * @property title Titre du défi
 * @property description Description du défi
 * @property category Catégorie du défi (ex : "Ludique", "Pédagogique")
 * @property location Lieu du défi (ex : "Intérieur", "Extérieur")
 * @property duration_min Durée estimée en minutes (optionnel)
 * @property points_default Nombre de points attribués par défaut (optionnel)
 * @property photo_required Photo requise ("true", "false" ou booléen à convertir si besoin, optionnel)
 * @property age_min Âge minimum recommandé (optionnel)
 * @property age_max Âge maximum recommandé (optionnel)
 * @property created_by Créateur du défi (optionnel, seulement pour les défis locaux)
 * @property created_at Date de création (ISO, optionnelle)
 * @property updated_at Date de mise à jour (ISO, optionnelle)
 * @property is_synced Statut de synchronisation (0 = non synchronisé, 1 = synchronisé, optionnel)
 */
export type Defi = {
  id: string | number;
  family_id?: number;
  title: string;
  description: string;
  category: string;
  location: string;
  duration_min?: number;
  points_default?: number;
  photo_required?: string;
  age_min?: number;
  age_max?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  is_synced?: number;
};
