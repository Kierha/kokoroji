/**
 * Teste le composant HomeScreen.
 * Vérifie l'affichage des éléments clés, la navigation et le comportement du loader de synchronisation.
 */

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import HomeScreen from "../src/screens/features/HomeScreen";
import { getParentName } from "../src/services/onboardingService";
import { syncLogsToCloud } from "../src/services/syncService";

// Mocks des dépendances pour isolation du test
jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
        SafeAreaView: View,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});
jest.mock("../src/components/HomeCard", () => {
    const React = require("react");
    const { Text } = require("react-native");
    const MockHomeCard = (props: any) => <>{props.title && <Text>{props.title}</Text>}</>;
    MockHomeCard.displayName = "MockHomeCard";
    return MockHomeCard;
});

jest.mock("../src/components/Footer", () => "Footer");

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
    ...jest.requireActual("@react-navigation/native"),
    useNavigation: () => ({
        navigate: mockNavigate,
    }),
    useFocusEffect: (cb: any) => cb(),
}));

jest.mock("../src/services/onboardingService", () => ({
    getParentName: jest.fn(() => Promise.resolve("Thomas")),
    getFamily: jest.fn(() => Promise.resolve({ id: 1, name: "Famille Test", parentName: "Thomas" })),
    getChildren: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../src/services/logService", () => ({
    getPendingLogs: jest.fn(() => Promise.resolve([{}, {}])), // Force la synchro auto
}));
jest.mock("../src/services/syncService", () => ({
    syncLogsToCloud: jest.fn(),
}));
jest.mock("../src/services/settingsFlagsService", () => ({
    getSyncEnabled: jest.fn(() => Promise.resolve(true)),
    setLastSync: jest.fn(() => Promise.resolve()),
}));


beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => { });
    jest.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
});
beforeEach(() => {
    jest.clearAllMocks();
});

describe("HomeScreen", () => {
    /**
     * Vérifie que le prénom du parent et le solde Koro-coins s'affichent correctement.
     */
    it("affiche le nom du parent et le solde Koro-coins", async () => {
        (getParentName as jest.Mock).mockResolvedValueOnce("Thomas");
        const { getByText } = render(<HomeScreen />);
        await waitFor(() => {
            expect(getByText("Bienvenue,")).toBeTruthy();
            expect(getByText("Thomas !")).toBeTruthy();
            expect(getByText("0")).toBeTruthy();
        });
    });

    it("affiche la somme des Koro-coins des enfants", async () => {
        const { getByText } = render(<HomeScreen />);
        // Simule des enfants avec des soldes
        const onboarding = require("../src/services/onboardingService");
        (onboarding.getChildren as jest.Mock).mockResolvedValueOnce([
            { id: 10, familyId: 1, name: "Leo", birthdate: "2018-01-01", avatar: "🦊", korocoins: 12 },
            { id: 11, familyId: 1, name: "Mia", birthdate: "2016-05-02", avatar: "🐻", korocoins: 23 },
        ]);
        // Forcer re-render déclenchant l'effet (astuce: attendre tick)
        await act(async () => { await Promise.resolve(); });
        await waitFor(() => {
            expect(getByText("35")).toBeTruthy();
        });
    });

    /**
     * Vérifie que toutes les cartes HomeCard sont présentes à l'écran.
     */
    it("affiche les cartes HomeCard principales", () => {
        const { getByText } = render(<HomeScreen />);
        expect(getByText("Gérer mes défis")).toBeTruthy();
        expect(getByText("Démarrer une session")).toBeTruthy();
        expect(getByText("Mes Koro-coins")).toBeTruthy();
        expect(getByText("Profil")).toBeTruthy();
    });

    /**
     * Vérifie que le loader de synchronisation n'apparaît pas si aucune synchro n'est en cours.
     */
    it("n'affiche pas le loader si syncInProgress est false", () => {
        const { queryByText } = render(<HomeScreen />);
        expect(queryByText("Synchronisation automatique en cours...")).toBeNull();
    });

    /**
     * Vérifie la navigation vers ChallengeStack lors du clic sur "Gérer mes défis".
     */
    it("navigue vers ChallengeStack au clic sur 'Gérer mes défis'", () => {
        const { getByText } = render(<HomeScreen />);
        fireEvent.press(getByText("Gérer mes défis"));
        expect(mockNavigate).toHaveBeenCalledWith("ChallengeStack");
    });

    /**
     * Vérifie la navigation vers SessionStack lors du clic sur "Démarrer une session".
     */
    it("navigue vers SessionStack au clic sur 'Démarrer une session'", () => {
        const { getByText } = render(<HomeScreen />);
        fireEvent.press(getByText("Démarrer une session"));
        expect(mockNavigate).toHaveBeenCalledWith("SessionStack");
    });

    /**
     * Vérifie la navigation vers RewardsStack lors du clic sur "Mes Koro-coins".
     */
    it("navigue vers RewardsStack au clic sur 'Mes Koro-coins'", () => {
        const { getByText } = render(<HomeScreen />);
        fireEvent.press(getByText("Mes Koro-coins"));
        expect(mockNavigate).toHaveBeenCalledWith("RewardsStack");
    });

    /**
     * Vérifie la navigation vers ProfileStack lors du clic sur "Profil".
     */
    it("navigue vers ProfileStack au clic sur 'Profil'", () => {
        const { getByText } = render(<HomeScreen />);
        fireEvent.press(getByText("Profil"));
        expect(mockNavigate).toHaveBeenCalledWith("ProfileStack");
    });

    /**
     * Vérifie que le loader de synchronisation s'affiche lors d'une synchronisation en cours.
     */
    it("affiche le loader lors de la synchronisation", async () => {
        let resolveSync: () => void;
        (syncLogsToCloud as jest.Mock).mockImplementation(
            () => new Promise<void>((resolve) => { resolveSync = resolve; })
        );

        const { getByText } = render(<HomeScreen />);

        await waitFor(() => {
            expect(getByText("Synchronisation automatique en cours...")).toBeTruthy();
        });

        act(() => {
            resolveSync!();
        });
    });
});
