/**
 * Service d’authentification : gestion de l’envoi du Magic Link via Supabase.
 * Permet à l’utilisateur de se connecter sans mot de passe dans l’application Kokoroji.
 */

import { supabase } from "./supabaseClient";

/**
 * Envoie un Magic Link à l’email spécifié via Supabase.
 * Permet la connexion sans mot de passe.
 *
 * @param email - Email de l’utilisateur.
 * @returns Objet contenant un message d’erreur (string) ou null si succès.
 */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error ? error.message : null };
}

/**
 * Connexion via email et mot de passe.
 *
 * @param email - Email de l’utilisateur.
 * @param password - Mot de passe de l’utilisateur.
 * @returns Résultat de l’appel Supabase avec possible erreur.
 */
export async function signInWithEmailPassword(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
}
