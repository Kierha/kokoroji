/**
 * Tests unitaires pour l'écran OnboardingChildren (flow d'ajout des enfants).
 * Vérifie l'affichage des champs, la gestion de la liste d'enfants et la soumission finale.
 * Les appels à Supabase sont mockés.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import OnboardingChildren from "../src/screens/onboarding/OnboardingChildren";

// Mock des services utilisés dans l'écran
jest.mock("../src/services/onboardingService", () => ({
    createFamily: jest.fn(() => Promise.resolve(1)),
    addChild: jest.fn(() => Promise.resolve(1)),
    setOnboardingDone: jest.fn(() => Promise.resolve()),
}));

// Mock du composant DateTimePicker pour éviter les problèmes de test natif
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");

// Mock de Ionicons si besoin (sinon warning non bloquant)
jest.mock("@expo/vector-icons", () => ({
    Ionicons: "Ionicons",
}));

const defaultProps = {
    route: {
        key: "route-key-children",
        name: "OnboardingChildren",
        params: { familyName: "Famille Test", parentName: "Alice" },
    },
    navigation: { goBack: jest.fn() } as any,
    onOnboardingDone: jest.fn(),
};

describe("OnboardingChildren", () => {
    /**
     * Vérifie l'affichage initial des champs et de la liste vide.
     */
    it("affiche les champs et la liste vide au départ", () => {
        const { getByPlaceholderText, getByText, queryByText } = render(
            <OnboardingChildren {...(defaultProps as any)} />
        );
        expect(getByPlaceholderText("Prénom de l'enfant")).toBeTruthy();
        expect(getByText(/Ajoutez vos enfants/i)).toBeTruthy();
        expect(getByText("Ajouter")).toBeTruthy();
        expect(queryByText("Terminer")).toBeNull();
    });

    /**
     * Vérifie l'ajout d'un enfant et l'affichage de la liste et du bouton Terminer.
     */
    it("ajoute un enfant, la liste et le bouton Terminer s'affichent", async () => {
        const { getByPlaceholderText, getByText, queryByText, getByLabelText, getByTestId } = render(
            <OnboardingChildren {...(defaultProps as any)} />
        );
        fireEvent.changeText(getByPlaceholderText("Prénom de l'enfant"), "Léo");
        fireEvent.press(getByLabelText("Ouvrir le calendrier"));
        fireEvent(getByTestId("date-time-picker"), "onChange", null, new Date("2020-05-05"));
        fireEvent.press(getByText("Ajouter"));
        await waitFor(() => {
            expect(queryByText("1 enfant ajouté")).toBeTruthy();
            expect(getByText("Terminer")).toBeTruthy();
        });
    });

    /**
     * Vérifie la soumission de la famille et des enfants, puis l'appel de la callback.
     */
    it("soumet la famille + enfants et appelle la callback", async () => {
        const onOnboardingDone = jest.fn();
        const { getByPlaceholderText, getByText, getByLabelText, getByTestId } = render(
            <OnboardingChildren {...(defaultProps as any)} onOnboardingDone={onOnboardingDone} />
        );
        fireEvent.changeText(getByPlaceholderText("Prénom de l'enfant"), "Léo");
        fireEvent.press(getByLabelText("Ouvrir le calendrier"));
        fireEvent(getByTestId("date-time-picker"), "onChange", null, new Date("2020-05-05"));
        fireEvent.press(getByText("Ajouter"));
        await waitFor(() => expect(getByText("Terminer")).toBeTruthy());
        fireEvent.press(getByText("Terminer"));
        await waitFor(() => expect(onOnboardingDone).toHaveBeenCalled());
    });
});
