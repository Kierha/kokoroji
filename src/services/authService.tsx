/**
 * Service d’authentification : gestion de l’envoi du Magic Link via Supabase.
 * Permet à l’utilisateur de se connecter sans mot de passe dans l’application Kokoroji.
 */
import { supabase } from "./supabaseClient";

/**
 * Envoie un Magic Link à l’email spécifié via Supabase.
 * UX : permet à l'utilisateur de se connecter sans mot de passe.
 * @param email Email de l’utilisateur
 * @returns {{ error: string | null }} Objet contenant un message d'erreur ou null si succès
 */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    // Appel à l'API Supabase pour l'envoi du lien magique
    const { error } = await supabase.auth.signInWithOtp({ email });
    // Retourne le message d'erreur si présent, sinon null
    return { error: error ? error.message : null };
}
