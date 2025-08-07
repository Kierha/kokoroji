/**
 * Tests unitaires pour l'écran OnboardingChildren.
 * Vérifie l'affichage initial, l'ajout d'enfants, 
 * et la soumission finale avec appel de callback.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import OnboardingChildren from "../src/screens/features/OnBoarding/OnboardingChildren";

jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
        SafeAreaView: View,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

jest.mock("../src/services/onboardingService", () => ({
    createFamily: jest.fn(() => Promise.resolve(1)),
    addChild: jest.fn(() => Promise.resolve(1)),
    setOnboardingDone: jest.fn(() => Promise.resolve()),
}));

jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));


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
     * Vérifie l'affichage initial des champs et que la liste est vide.
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
        const { getByPlaceholderText, getByText, getByLabelText, getByTestId } = render(
            <OnboardingChildren {...(defaultProps as any)} />
        );

        await waitFor(() => {
            fireEvent.changeText(getByPlaceholderText("Prénom de l'enfant"), "Léo");
        });
        await waitFor(() => {
            fireEvent.press(getByLabelText("Ouvrir le calendrier"));
            fireEvent(getByTestId("date-time-picker"), "onChange", null, new Date("2020-05-05"));
        });
        await waitFor(() => {
            fireEvent.press(getByText("Ajouter"));
        });

        await waitFor(() => {
            expect(getByText("1 enfant ajouté")).toBeTruthy();
            expect(getByText("Terminer")).toBeTruthy();
        });
    });

    /**
     * Vérifie la soumission finale des enfants et l'appel de la callback onOnboardingDone.
     */
    it("soumet la famille + enfants et appelle la callback", async () => {
        const onOnboardingDone = jest.fn();

        const { getByPlaceholderText, getByText, getByLabelText, getByTestId } = render(
            <OnboardingChildren {...(defaultProps as any)} onOnboardingDone={onOnboardingDone} />
        );

        await waitFor(() => {
            fireEvent.changeText(getByPlaceholderText("Prénom de l'enfant"), "Léo");
        });
        await waitFor(() => {
            fireEvent.press(getByLabelText("Ouvrir le calendrier"));
            fireEvent(getByTestId("date-time-picker"), "onChange", null, new Date("2020-05-05"));
        });
        await waitFor(() => {
            fireEvent.press(getByText("Ajouter"));
        });

        await waitFor(() => expect(getByText("Terminer")).toBeTruthy());

        await waitFor(() => {
            fireEvent.press(getByText("Terminer"));
        });

        await waitFor(() => expect(onOnboardingDone).toHaveBeenCalled());
    });
});
