// src/utils/text.ts
/**
 * Normalise une chaîne pour la recherche client-side :
 * - minuscules
 * - suppression des accents (NFD)
 */
export const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Libellé "propre" pour l’affichage des filtres (majuscule + accents usuels).
 * Les valeurs internes (id) ne changent pas, seul le label est formaté.
 */
export const labelize = (s?: string) => {
  if (!s) return "";
  const key = s.toLowerCase();
  const dict: Record<string, string> = {
    ludique: "Ludique",
    peda: "Péda",
    "péda": "Péda",
    interieur: "Intérieur",
    "intérieur": "Intérieur",
    exterieur: "Extérieur",
    "extérieur": "Extérieur",
  };
  return dict[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
};
