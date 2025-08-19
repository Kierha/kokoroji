/**
 * Utilitaire de validation d’email pour l’application Kokoroji.
 * Permet de vérifier côté client la conformité du format avant tout appel serveur.
 */
/**
 * Vérifie si une chaîne est une adresse email valide.
 * UX : permet d'éviter les requêtes inutiles côté serveur.
 * @param email Adresse email à valider
 * @returns true si l'email est au format standard, false sinon
 */
export function isValidEmail(email: string): boolean {
    // Regex simple pas de backtracking catastrophique (Sonar S5852)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
