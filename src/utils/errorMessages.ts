/**
 * Utilitaire de mapping des messages d’erreur techniques vers des messages utilisateur compréhensibles.
 * Permet d’améliorer l’expérience utilisateur en affichant des retours adaptés et francisés.
 */
/**
 * Traduit/Mappe les messages d’erreur connus pour affichage UX.
 */
export function mapMagicLinkError(error: string | null): string {
  if (!error) return "";
  if (error.includes("Unable to validate email address")) {
    return "Adresse email invalide. Merci de corriger.";
  }
  // Autres mappings personnalisés
  return "Erreur lors de l'envoi du lien magique. Réessaie plus tard.";
}
