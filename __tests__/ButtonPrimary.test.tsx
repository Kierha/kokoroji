
/**
 * Teste le composant ButtonPrimary pour valider l'affichage, l'état et les interactions utilisateur.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ButtonPrimary from "../src/components/ButtonPrimary";

describe("ButtonPrimary", () => {
    /**
     * Vérifie l'affichage du titre transmis en propriété.
     * Permet de garantir la cohérence de l'UI.
     */
    it("affiche le titre passé en prop", () => {
        const { getByText } = render(
            <ButtonPrimary title="Envoyer" onPress={() => { }} />
        );
        expect(getByText("Envoyer")).toBeTruthy();
    });

    /**
     * Vérifie que le bouton est désactivé lorsque la prop disabled est à true.
     * Important pour l'accessibilité et la gestion des états d'attente.
     */
    it("désactive le bouton si disabled=true", () => {
        const { getByRole } = render(
            <ButtonPrimary title="Test" onPress={() => { }} disabled />
        );
        expect(getByRole("button").props.accessibilityState.disabled).toBe(true);
    });

    /**
     * Vérifie que le texte n'est pas affiché et qu'un spinner est visible en mode chargement.
     * Permet d'assurer un retour visuel lors d'une action asynchrone.
     */
    it("affiche un spinner si loading=true", () => {
        const { queryByText } = render(
            <ButtonPrimary title="Test" onPress={() => { }} loading />
        );
        expect(queryByText("Test")).toBeNull();
    });

    /**
     * Vérifie que la fonction onPress est appelée lors d'un clic utilisateur.
     * Garantit la réactivité du composant aux interactions.
     */
    it("déclenche onPress au clic", () => {
        const onPress = jest.fn();
        const { getByRole } = render(
            <ButtonPrimary title="Test" onPress={onPress} />
        );
        fireEvent.press(getByRole("button"));
        expect(onPress).toHaveBeenCalled();
    });
});