
/**
 * Teste l'écran d'accueil d'onboarding (OnBardingWelcome).
 * Vérifie l'affichage des éléments principaux et la navigation.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OnBardingWelcome from "../src/screens/onboarding/OnBardingWelcome";

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

describe("OnBardingWelcome", () => {
    /**
     * Vérifie l'affichage des éléments principaux de l'écran d'accueil.
     */
    it("affiche le logo, le titre et le message", () => {
        const { getByText } = render(<OnBardingWelcome />);
        expect(getByText(/Bienvenue sur Kokoroji/i)).toBeTruthy();
        expect(getByText(/Créer mon espace famille/i)).toBeTruthy();
        expect(getByText(/moment partagé en famille compte/i)).toBeTruthy();
    });

    /**
     * Vérifie la navigation vers l'écran OnboardingFamily au clic sur le bouton principal.
     */
    it("navigue vers OnboardingFamily au clic sur le bouton", () => {
        const navigate = jest.fn();
        jest.spyOn(require('@react-navigation/native'), "useNavigation").mockReturnValue({ navigate });
        const { getByText } = render(<OnBardingWelcome />);
        fireEvent.press(getByText(/Créer mon espace famille/i));
        expect(navigate).toHaveBeenCalledWith("OnboardingFamily");
    });
});
