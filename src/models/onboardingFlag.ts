/**
 * Modèle OnboardingFlag : stocke les flags d'état de l'application (ex : onboarding_done).
 * @property key Clé du flag ('onboarding_done', etc.)
 * @property value Valeur du flag (booléen, string ou number)
 */
export interface OnboardingFlag {
  key: string;
  value: boolean | string | number;
}
