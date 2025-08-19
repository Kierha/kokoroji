
/**
 * Teste le composant InputEmail pour valider l'affichage, la gestion des erreurs et les interactions utilisateur.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import InputEmail from "../src/components/InputField";

describe("InputEmail", () => {
    /**
     * Vérifie l'affichage de la valeur saisie dans le champ email.
     */
    it("affiche la valeur passée en prop", () => {
        const { getByDisplayValue } = render(
            <InputEmail value="test@mail.com" onChangeText={() => { }} />
        );
        expect(getByDisplayValue("test@mail.com")).toBeTruthy();
    });

    /**
     * Vérifie l'affichage du placeholder pour guider l'utilisateur.
     */
    it("affiche le placeholder", () => {
        const { getByPlaceholderText } = render(
            <InputEmail value="" onChangeText={() => { }} placeholder="Votre email" />
        );
        expect(getByPlaceholderText("Votre email")).toBeTruthy();
    });

    /**
     * Vérifie l'affichage du message d'erreur en cas de saisie invalide.
     */
    it("affiche le message d'erreur", () => {
        const { getByText } = render(
            <InputEmail value="" onChangeText={() => { }} error="Erreur" />
        );
        expect(getByText("Erreur")).toBeTruthy();
    });

    /**
     * Vérifie que la fonction onChangeText est appelée lors d'une modification de la saisie.
     */
    it("déclenche onChangeText", () => {
        const onChangeText = jest.fn();
        const { getByPlaceholderText } = render(
            <InputEmail value="" onChangeText={onChangeText} placeholder="Votre email" />
        );
        fireEvent.changeText(getByPlaceholderText("Votre email"), "nouveau@mail.com");
        expect(onChangeText).toHaveBeenCalledWith("nouveau@mail.com");
    });
});