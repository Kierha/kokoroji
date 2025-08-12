export type Defi = {
  id: string | number;      // string (UUID Supabase) ou number (autoincr local)
  family_id?: number;       // présent uniquement pour les défis custom locaux
  title: string;
  description: string;
  category: string;         // "Ludique" | "Pédagogique" ou autre
  location: string;         // "Maison" | "Extérieur" ou autre
  duration_min?: number;    // durée en minutes (
  points_default?: number;  // nombre de points par défaut 
  photo_required?: string;  // "true" | "false" ou booléen à convertir si besoin
  age_min?: number;         // âge minimum recommandé
  age_max?: number;         // âge maximum recommandé
  created_by?: string;      // seulement pour les défis custom locaux
  created_at?: string;
  updated_at?: string;
  is_synced?: number;       // 0 = non synchronisé, 1 = synchronisé
};
