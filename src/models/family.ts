/**
 * Modèle Family : représente une famille dans la base locale.
 * @property id Identifiant unique
 * @property name Nom du foyer
 * @property parentName Prénom du parent référent
 * @property createdAt Date de création (optionnelle)
 * @property updatedAt Date de mise à jour (optionnelle)
 */
export interface Family {
  id: number;
  name: string;
  parentName: string;
  createdAt?: string;
  updatedAt?: string;
}
