/**
 * Modèle Child : représente un enfant dans la base locale.
 * @property id Identifiant unique
 * @property familyId Référence à la famille parente
 * @property name Prénom de l'enfant
 * @property birthdate Date de naissance (format ISO 'YYYY-MM-DD')
 * @property avatar Emoji ou image d'avatar
 * @property createdAt Date de création (optionnelle)
 * @property updatedAt Date de mise à jour (optionnelle)
 */
export interface Child {
  id: number;
  familyId: number;
  name: string;
  birthdate: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}
