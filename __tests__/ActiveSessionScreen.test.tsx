/**
 * Tests unitaires pour ActiveSessionScreen.
 * Vérifie le rendu initial et la stabilité de l’écran sans interactions complexes
 * (timers, loaders ou flux instables).
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Mocks navigation et icônes
jest.mock("@react-navigation/native", () => ({
    useNavigation: () => ({
        goBack: jest.fn(),
        getParent: () => ({ navigate: jest.fn() }),
        navigate: jest.fn(),
    }),
    useFocusEffect: (cb: any) => cb(),
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

// Loader → texte simple
jest.mock("../src/components/Loader", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function Loader() {
        return <Text>LOADER</Text>;
    };
});

// Mocks des composants enfants non testés ici
jest.mock("../src/components/ButtonPrimary", () => () => null);
jest.mock("../src/components/ButtonSecondary", () => () => null);
jest.mock("../src/components/ChildCard", () => () => null);
jest.mock("../src/components/SessionCard", () => () => null);
jest.mock("../src/components/AppAlertModal", () => () => null);
jest.mock("../src/components/EndSessionModal", () => () => null);

// Services / hooks minimalement mockés
jest.mock("../src/services/onboardingService", () => ({
    getFamily: jest.fn().mockResolvedValue({ id: 1 }),
    getChildren: jest.fn().mockResolvedValue([]),
}));
jest.mock("../src/services/logService", () => ({
    addLog: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/hooks/useActiveSession", () => ({
    __esModule: true,
    default: () => ({
        activeSession: null,
        hasActive: false,
        pendingDefi: null,
        bundle: null,
        refreshActive: jest.fn(),
        proposeRandomDefi: jest.fn(),
        proposeBundle: jest.fn(),
        validateDefi: jest.fn(),
        endActiveSession: jest.fn(),
        updateRuntime: jest.fn(),
        clearRuntime: jest.fn(),
        restoreFromRuntimeIfPossible: jest.fn().mockResolvedValue({ restored: false }),
    }),
}));

// Helper de rendu
const renderScreen = () => {
    const ActiveSessionScreen =
        require("../src/screens/features/Session/ActiveSessionScreen").default;
    return render(
        <SafeAreaProvider
            initialMetrics={{
                frame: { x: 0, y: 0, width: 0, height: 0 },
                insets: { top: 0, left: 0, right: 0, bottom: 0 },
            }}
        >
            <ActiveSessionScreen />
        </SafeAreaProvider>
    );
};

describe("ActiveSessionScreen", () => {
    /**
     * Vérifie que l’écran monte et affiche le loader initial.
     */
    it("affiche le Loader au démarrage", () => {
        const { queryByText } = renderScreen();
        expect(queryByText("LOADER")).toBeTruthy();
    });

    /**
     * Placeholder pour les interactions complexes (skippé pour éviter l’instabilité).
     */
    it.skip("gère les interactions (validation, photo, fin de session)", () => {
        // Skipped volontairement :
        // - Instabilité liée aux timers et hooks (useSafeArea/useFocusEffect)
        // - Les flux critiques sont déjà testés via les services et composants unitaires
    });
});