
/**
 * Paramètres fournis pour initialiser/proposer une session.
 * @property familyId Identifiant famille (contexte obligatoire)
 * @property childIds Liste des participants sélectionnés
 * @property type Mode de session (random ou bundle)
 * @property plannedDurationMin Durée planifiée (ex: 15/30/60) optionnelle
 * @property createdBy Identifiant créateur (si traçabilité requise)
 * @property location Lieu normalisé ou libre ("interieur", "exterieur")
 * @property category Catégorie (ex: "Ludique", "Pédagogique")
 * @property lookbackDays Fenêtre de lookback pour filtrage des défis (ex: 30 jours)
 */
export interface SessionConfig {
  familyId: number;
  childIds: number[];
  type: "random" | "bundle";
  plannedDurationMin?: number;
  createdBy?: string;
  location?: string;
  category?: string;
  lookbackDays?: number;
}