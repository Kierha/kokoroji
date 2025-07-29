
/**
 * Teste la fonction mapMagicLinkError qui traduit les erreurs techniques Supabase
 * en messages utilisateur en français.
 */
import { mapMagicLinkError } from "../src/utils/errorMessages";

describe("mapMagicLinkError", () => {
    /**
     * Vérifie la traduction d'une erreur technique précise en message utilisateur compréhensible.
     * Permet d'améliorer l'expérience utilisateur en affichant un message adapté.
     */
    it("traduit l'erreur Supabase en français", () => {
        expect(
            mapMagicLinkError("Unable to validate email address: invalid format")
        ).toBe("Adresse email invalide. Merci de corriger.");
    });

    /**
     * Vérifie la gestion d'une erreur inconnue pour garantir un retour générique mais informatif.
     */
    it("gère une erreur inconnue", () => {
        expect(mapMagicLinkError("Unknown error")).toBe(
            "Erreur lors de l'envoi du lien magique. Réessaie plus tard."
        );
    });
});
