/**
 * Initialisation du client Supabase pour l’application Kokoroji.
 * Permet d’effectuer des opérations d’authentification et de gestion des données côté client.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Instance Supabase configurée avec stockage local asynchrone,
 * gestion automatique du rafraîchissement des tokens,
 * et persistance de la session.
 */
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  process.env.EXPO_PUBLIC_SUPABASE_KEY as string,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Désactive la détection automatique dans l’URL 
    }
  }
);
