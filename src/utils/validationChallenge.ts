export type ChallengeFormValues = {
  title: string;
  category: string;
  location: string;
  photo_required: string; // "Oui" | "Non"
  duration_min: string;    // Saisie utilisateur (en minutes, chaîne)
  points_default: string;  // Saisie utilisateur (Koro-Coins, chaîne)
  age_min: string;         // Saisie utilisateur (chaîne)
  age_max: string;         // Saisie utilisateur (chaîne)
  description: string;
};

export type FieldErrors = Partial<Record<
  | "title"
  | "category"
  | "location"
  | "photo_required"
  | "duration_min"
  | "points_default"
  | "age_min"
  | "age_max"
  | "description",
  string
>>;

/** Constantes de validation */
export const TITLE_MAX = 60;
export const DESC_MAX = 240;
export const AGE_MAX_VAL = 120;   // Limite haute réaliste pour l'âge
export const DURATION_MAX = 1440; // Durée max en minutes (24h)
export const COINS_MAX = 100000;

/** Utilitaires de chaîne */
export const trim = (s: string) => (s ?? "").trim();
export const clampLen = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

/** Utilitaires numériques pour saisie texte */
export const numericOnly = (txt: string) => txt.replace(/[^0-9]/g, "");
const isNonEmpty = (s: string) => trim(s).length > 0;
const isUInt = (s: string) => /^([0-9]|[1-9]\d+)$/.test(s); // entier ≥ 0
const isPosInt = (s: string) => /^[1-9]\d*$/.test(s);       // entier > 0

/**
 * Vérifie si tous les champs obligatoires du formulaire sont remplis
 * (ne fait pas de validation approfondie).
 */
export function isDefiFormReady(v: ChallengeFormValues): boolean {
  return (
    isNonEmpty(v.title) &&
    isNonEmpty(v.category) &&
    isNonEmpty(v.location) &&
    isNonEmpty(v.photo_required) &&
    isNonEmpty(v.duration_min) &&
    isNonEmpty(v.points_default) &&
    isNonEmpty(v.age_min) &&
    isNonEmpty(v.age_max) &&
    isNonEmpty(v.description)
  );
}

/**
 * Validation complète lors de la soumission :
 * - Champs obligatoires
 * - Contraintes numériques
 * - Cohérence âge min / âge max
 * @param v - Valeurs saisies dans le formulaire.
 * @returns Objet { ok, errors } avec les messages d'erreur éventuels.
 */
export function validateDefi(v: ChallengeFormValues): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const title = trim(clampLen(v.title, TITLE_MAX));
  const description = trim(clampLen(v.description, DESC_MAX));

  if (!isNonEmpty(title)) errors.title = "Titre requis.";
  if (!isNonEmpty(v.category)) errors.category = "Catégorie requise.";
  if (!isNonEmpty(v.location)) errors.location = "Lieu requis.";
  if (!isNonEmpty(v.photo_required)) errors.photo_required = "Réponse requise.";

  // Durée : entier positif, limite max
  if (!isNonEmpty(v.duration_min)) {
    errors.duration_min = "Durée requise.";
  } else if (!isPosInt(v.duration_min)) {
    errors.duration_min = "Durée invalide (minutes).";
  } else if (Number(v.duration_min) > DURATION_MAX) {
    errors.duration_min = `Max ${DURATION_MAX} min.`;
  }

  // Koro-Coins : entier ≥ 0, limite max
  if (!isNonEmpty(v.points_default)) {
    errors.points_default = "Montant requis.";
  } else if (!isUInt(v.points_default)) {
    errors.points_default = "Montant invalide.";
  } else if (Number(v.points_default) > COINS_MAX) {
    errors.points_default = `Max ${COINS_MAX}.`;
  }

  // Âge minimum
  if (!isNonEmpty(v.age_min)) {
    errors.age_min = "Âge min requis.";
  } else if (!isUInt(v.age_min)) {
    errors.age_min = "Âge min invalide.";
  } else if (Number(v.age_min) > AGE_MAX_VAL) {
    errors.age_min = `Max ${AGE_MAX_VAL}.`;
  }

  // Âge maximum
  if (!isNonEmpty(v.age_max)) {
    errors.age_max = "Âge max requis.";
  } else if (!isUInt(v.age_max)) {
    errors.age_max = "Âge max invalide.";
  } else if (Number(v.age_max) > AGE_MAX_VAL) {
    errors.age_max = `Max ${AGE_MAX_VAL}.`;
  }

  // Cohérence entre âges
  if (
    isNonEmpty(v.age_min) &&
    isNonEmpty(v.age_max) &&
    isUInt(v.age_min) &&
    isUInt(v.age_max) &&
    Number(v.age_min) > Number(v.age_max)
  ) {
    errors.age_min = "Âge min ≤ Âge max.";
    errors.age_max = "Âge max ≥ Âge min.";
  }

  if (!isNonEmpty(description)) errors.description = "Description requise.";

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Convertit les valeurs saisies (chaînes) en types adaptés à l'enregistrement
 * en base ou à l'appel du service.
 */
export function coerceDefi(v: ChallengeFormValues) {
  return {
    title: trim(clampLen(v.title, TITLE_MAX)),
    category: trim(v.category),
    location: trim(v.location),
    description: trim(clampLen(v.description, DESC_MAX)),
    duration_min: Number(v.duration_min),
    points_default: Number(v.points_default),
    photo_required: v.photo_required, // "Oui" | "Non"
    age_min: Number(v.age_min),
    age_max: Number(v.age_max),
  };
}
