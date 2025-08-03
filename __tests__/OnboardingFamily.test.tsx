
/**
 * Teste l'écran d'onboarding famille (OnboardingFamily).
 * Vérifie l'affichage des champs, l'état du bouton et la navigation.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OnboardingFamily from "../src/screens/onboarding/OnboardingFamily";

// Mock navigation à portée globale
const Mocknavigate = jest.fn();

// Mock du module navigation : la fonction useNavigation retourne toujours le même mock
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: Mocknavigate,
    }),
}));

describe("OnboardingFamily", () => {
    beforeEach(() => {
        Mocknavigate.mockClear();
    });

    /**
     * Vérifie l'affichage des champs et du bouton principal.
     */
    it("affiche les champs et le bouton", () => {
        const { getByPlaceholderText, getByText } = render(<OnboardingFamily />);
        expect(getByPlaceholderText("Nom du foyer")).toBeTruthy();
        expect(getByPlaceholderText("Votre prénom")).toBeTruthy();
        expect(getByText("Suivant")).toBeTruthy();
    });

    /**
     * Vérifie que le bouton est désactivé si les champs sont vides.
     */
    it("bouton désactivé si champs vides", () => {
        const { getByTestId } = render(<OnboardingFamily />);
        expect(getByTestId("onboarding-next").props.accessibilityState.disabled).toBe(true);
    });

    /**
     * Vérifie l'activation du bouton et la navigation avec les bons paramètres.
     */
    it("active le bouton et navigue avec les bons params", () => {
        const { getByPlaceholderText, getByTestId } = render(<OnboardingFamily />);
        fireEvent.changeText(getByPlaceholderText("Nom du foyer"), "Famille Test");
        fireEvent.changeText(getByPlaceholderText("Votre prénom"), "Alice");
        expect(getByTestId("onboarding-next").props.accessibilityState.disabled).toBe(false);
        fireEvent.press(getByTestId("onboarding-next"));
        expect(Mocknavigate).toHaveBeenCalledWith("OnboardingChildren", {
            familyName: "Famille Test",
            parentName: "Alice"
        });
    });
});
