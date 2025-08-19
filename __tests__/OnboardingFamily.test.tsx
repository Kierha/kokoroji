/**
 * Tests unitaires pour l'écran OnboardingFamily.
 * Vérifie l'affichage des champs, l'état du bouton et le comportement de navigation.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import OnboardingFamily from "../src/screens/features/OnBoarding/OnboardingFamily";

jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
        SafeAreaView: View,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

jest.mock("@expo/vector-icons", () => ({
    Ionicons: "Ionicons",
}));


const mockOnNext = jest.fn();

describe("OnboardingFamily", () => {
    beforeEach(() => {
        mockOnNext.mockClear();
    });

    /**
     * Vérifie que les champs et le bouton sont présents à l'écran.
     */
    it("affiche les champs et le bouton", () => {
        const { getByPlaceholderText, getByText } = render(<OnboardingFamily onNext={mockOnNext} />);
        expect(getByPlaceholderText("Nom du foyer")).toBeTruthy();
        expect(getByPlaceholderText("Votre prénom")).toBeTruthy();
        expect(getByText("Suivant")).toBeTruthy();
    });

    /**
     * Vérifie que le bouton "Suivant" est désactivé lorsque les champs sont vides.
     */
    it("bouton désactivé si champs vides", () => {
        const { getByTestId } = render(<OnboardingFamily onNext={mockOnNext} />);
        const button = getByTestId("onboarding-next");
        expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    /**
     * Vérifie que le bouton s'active lorsqu'on remplit les champs,
     * et que le callback onNext est appelé avec les bonnes valeurs.
     */
    it("active le bouton et appelle onNext avec les bons params", () => {
        const { getByPlaceholderText, getByTestId } = render(<OnboardingFamily onNext={mockOnNext} />);

        fireEvent.changeText(getByPlaceholderText("Nom du foyer"), "Famille Test");
        fireEvent.changeText(getByPlaceholderText("Votre prénom"), "Alice");

        const button = getByTestId("onboarding-next");
        expect(button.props.accessibilityState?.disabled).toBe(false);

        fireEvent.press(button);
        expect(mockOnNext).toHaveBeenCalledWith("Famille Test", "Alice");
    });
});
