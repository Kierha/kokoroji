
/**
 * Teste le composant ErrorMessage pour valider l'affichage du message d'erreur utilisateur.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import ErrorMessage from "../src/components/CompErrorMessage";

describe("ErrorMessage", () => {
    /**
     * Vérifie que le message transmis en propriété est bien affiché à l'utilisateur.
     * Permet de garantir la visibilité des erreurs dans l'UI.
     */
    it("affiche le message passé en prop", () => {
        const { getByText } = render(<ErrorMessage message="Erreur test" />);
        expect(getByText("Erreur test")).toBeTruthy();
    });
});
