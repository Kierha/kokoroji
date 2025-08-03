/**
 * Initialisation du client Supabase pour l’application Kokoroji.
 * Permet d’effectuer des requêtes d’authentification et de données côté client.
 */
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_KEY as string
);
