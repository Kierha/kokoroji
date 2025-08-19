/**
 * Tests unitaires pour l’écran ChallengeScreen.
 * Vérifie l’affichage initial de la liste des défis,
 * le filtrage par recherche,
 * l’ouverture et la fermeture des filtres,
 * l’ouverture de l’historique,
 * ainsi que le passage en mode édition et l’ouverture du formulaire d’ajout.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Mocks navigation et icônes
jest.mock("@react-navigation/native", () => ({
    useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock("@expo/vector-icons", () => ({
    Ionicons: () => null,
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Hook debounce neutralisé
jest.mock("../src/hooks/useDebouncedValue", () => ({
    useDebouncedValue: (v: string) => v,
}));

// Mocks composants enfants
jest.mock("../src/components/Loader", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function Loader() {
        return <Text>LOADER</Text>;
    };
});
jest.mock("../src/components/FilterRow", () => {
    const React = require("react");
    const { View, Text } = require("react-native");
    return function FilterRow(props: any) {
        return (
            <View>
                <Text>{props.label}</Text>
            </View>
        );
    };
});
jest.mock("../src/components/ButtonPrimary", () => {
    const React = require("react");
    const { TouchableOpacity, Text } = require("react-native");
    return function ButtonPrimary(props: any) {
        return (
            <TouchableOpacity
                accessibilityRole="button"
                onPress={props.disabled ? undefined : props.onPress}
            >
                <Text>{props.title}</Text>
            </TouchableOpacity>
        );
    };
});
jest.mock("../src/components/ButtonSecondary", () => {
    const React = require("react");
    const { TouchableOpacity, Text } = require("react-native");
    return function ButtonSecondary(props: any) {
        return (
            <TouchableOpacity
                accessibilityRole="button"
                onPress={props.disabled ? undefined : props.onPress}
            >
                <Text>{props.title}</Text>
            </TouchableOpacity>
        );
    };
});
jest.mock("../src/components/ChallengeItem", () => {
    const React = require("react");
    const { TouchableOpacity, Text } = require("react-native");
    return function DefiItem(props: any) {
        return (
            <TouchableOpacity onPress={props.onPress}>
                <Text>{props.title}</Text>
            </TouchableOpacity>
        );
    };
});
jest.mock("../src/components/ChallengeForm", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function DefiForm(props: any) {
        return props.visible ? <Text>FORM_VISIBLE</Text> : null;
    };
});
jest.mock("../src/components/HistoryModal", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function HistoryModal(props: any) {
        return props.visible ? <Text>HISTORY_OPEN</Text> : null;
    };
});
jest.mock("../src/components/AppAlertModal", () => () => null);

// Mocks services
jest.mock("../src/services/onboardingService", () => ({
    getFamily: jest.fn().mockResolvedValue({ id: 1 }),
}));
jest.mock("../src/services/settingsFlagsService", () => ({
    isChallengesImported: jest.fn().mockResolvedValue(true),
    setChallengesImported: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/challengeService", () => ({
    getAllChallenges: jest.fn().mockResolvedValue([
        { id: 1, title: "Lire une histoire", category: "Pédagogique", location: "Intérieur" },
        { id: 2, title: "Aller au parc", category: "Ludique", location: "Extérieur" },
    ]),
    addChallenge: jest.fn().mockResolvedValue(undefined),
    updateChallenge: jest.fn().mockResolvedValue(undefined),
    deleteChallenge: jest.fn().mockResolvedValue(undefined),
    reactivateChallenges: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/challengeHistoryService", () => ({
    getDefiHistory: jest.fn().mockResolvedValue([
        { id: 11, family_id: 1, defi_id: 1, completed_at: "2025-08-08T10:00:00", completed_by: "Parent" },
    ]),
}));
jest.mock("../src/services/challengeImportService", () => ({
    proposeAndImportDefaultChallengesCloud: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Helper de rendu de ChallengeScreen avec SafeAreaProvider mocké.
 */
const renderScreen = () => {
    const ChallengeScreen = require("../src/screens/features/Challenge/ChallengeScreen").default;
    return render(
        <SafeAreaProvider
            initialMetrics={{
                frame: { x: 0, y: 0, width: 0, height: 0 },
                insets: { top: 0, left: 0, right: 0, bottom: 0 },
            }}
        >
            <ChallengeScreen />
        </SafeAreaProvider>
    );
};

// Utilitaire pour vider la micro‑queue (promises) avant assertions
const flushPromises = () => new Promise(res => setImmediate(res));

describe("ChallengeScreen", () => {
    /**
     * Vérifie l'affichage initial du titre et de la liste des défis.
     */
    it("affiche le titre et la liste", async () => {
        const { queryByText, findByText } = renderScreen();
        // Laisser les effets se résoudre
        await flushPromises();
        await findByText("Gérer mes défis", {}, { timeout: 8000 });
        await findByText("Lire une histoire", {}, { timeout: 8000 });
        await findByText("Aller au parc", {}, { timeout: 8000 });
        expect(queryByText("LOADER")).toBeNull();
    });

    /**
     * Vérifie que la recherche filtre correctement la liste (debounce neutralisé).
     */
    it("filtre par recherche", async () => {
        const { getByPlaceholderText, queryByText, findByText } = renderScreen();
        await flushPromises();
        await findByText("Lire une histoire", {}, { timeout: 8000 });
        const input = getByPlaceholderText("Rechercher un défi…");
        fireEvent.changeText(input, "parc");
        await findByText("Aller au parc", {}, { timeout: 8000 });
        // Attendre microtasks filtrage
        await flushPromises();
        expect(queryByText("Lire une histoire")).toBeNull();
    });

    /**
     * Vérifie l'ouverture et la fermeture de la section de filtres.
     */
    it("ouvre et ferme la boîte de filtres", async () => {
        const { getByText, queryByText, findByText } = renderScreen();
        await flushPromises();
        await findByText("Lire une histoire", {}, { timeout: 8000 });
        fireEvent.press(getByText("Filtres"));
        expect(queryByText("Statut :")).toBeTruthy();
        fireEvent.press(getByText("Filtres"));
        expect(queryByText("Statut :")).toBeNull();
    });

    /**
     * Vérifie l'ouverture de l'historique.
     */
    it("ouvre l’historique", async () => {
        const { getByText, queryByText, findByText } = renderScreen();
        await flushPromises();
        await findByText("Lire une histoire", {}, { timeout: 8000 });
        fireEvent.press(getByText("Historique"));
        expect(queryByText("HISTORY_OPEN")).toBeTruthy();
    });

    /**
     * Vérifie le passage en mode édition et l'ouverture du formulaire d'ajout.
     */
    it("active le mode édition et ouvre le formulaire d’ajout", async () => {
        const { getByText, queryByText, findByText } = renderScreen();
        await flushPromises();
        await findByText("Lire une histoire", {}, { timeout: 8000 });
        fireEvent.press(getByText("Éditer"));
        await findByText("Terminer", {}, { timeout: 8000 });
        const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation(cb => { cb(0); return 1; });
        fireEvent.press(getByText("Ajouter un défi"));
        expect(queryByText("FORM_VISIBLE")).toBeTruthy();
        rafSpy.mockRestore();
    });
});
