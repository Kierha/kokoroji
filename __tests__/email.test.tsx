
/**
 * Teste la fonction utilitaire isValidEmail pour valider la conformité des adresses email saisies.
 */
import { isValidEmail } from "../src/utils/email";

describe("isValidEmail", () => {
    /**
     * Vérifie qu'un email au format standard est accepté.
     */
    it("valide un email simple", () => {
        expect(isValidEmail("test@mail.com")).toBe(true);
    });
    /**
     * Vérifie le rejet d'un email sans caractère @.
     */
    it("refuse un email sans @", () => {
        expect(isValidEmail("testmail.com")).toBe(false);
    });
    /**
     * Vérifie le rejet d'un email sans domaine après le @.
     */
    it("refuse un email sans domaine", () => {
        expect(isValidEmail("test@")).toBe(false);
    });
});
