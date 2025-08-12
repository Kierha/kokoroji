// models/defiHistory.ts

export type DefiHistory = {
  id: number;                  // Autoincrement local
  defi_id: string | number;    // UUID Supabase ou autoincrement local
  family_id: number;           // number partout (cohérence avec la table family/enfant/défis)
  children_ids: number[];      // Tableau d’IDs enfants dans l’app (stocké sous forme de string JSON en BDD)
  session_id?: number;         // Permet de relier à une session/groupement d’actions
  completed_at: string;        // ISO string (date/heure de validation)
  completed_by?: string;       // Nom du validateur ou user
  is_synced: number;           // 0 = non synchro, 1 = synchro
};
