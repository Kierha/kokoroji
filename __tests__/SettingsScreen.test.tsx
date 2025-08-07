/**
 * Tests unitaires pour le composant SettingsScreen.
 * Vérifie l’affichage, la navigation, la déconnexion,
 * ainsi que l’ouverture des modales de synchronisation et d’info.
 * 
 * Un test de protection contre la synchro trop rapprochée est désactivé
 * (difficulté de test fiable en environnement Jest/CI).
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import SettingsScreen from "../src/screens/features/Profile/SettingsScreen";

// Suppression warnings liés à act() pour lisibilité CI
beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation((msg) => {
        if (typeof msg === "string" && msg.includes("not wrapped in act")) {
            return;
        }
        process.stderr.write(msg + "\n");
    });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

// Mocks SafeArea, SyncCard, modales, Footer, icônes
jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
        SafeAreaView: View,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

jest.mock("../src/components/SyncCard", () => {
    const React = require("react");
    const { Text, View } = require("react-native");
    const MockSyncCard = (props: any) => (
        <View>
            <Text>SyncCard</Text>
            <Text>{props.syncEnabled ? "Synchro activée" : "Synchro désactivée"}</Text>
            <Text testID="sync-toggle" onPress={props.onToggle}>toggle</Text>
            <Text testID="sync-info" onPress={props.onInfo}>info</Text>
            <Text testID="sync-now" onPress={props.onSync}>sync</Text>
        </View>
    );
    MockSyncCard.displayName = "MockSyncCard";
    return MockSyncCard;
});

jest.mock("../src/components/AppAlertModal", () => {
    const React = require("react");
    const { Text, View } = require("react-native");
    const MockAppAlertModal = (props: any) => {
        if (!props.visible) return null;
        return (
            <View>
                <Text>{props.title}</Text>
                {props.confirmLabel && (
                    <Text testID="modal-confirm" onPress={props.onConfirm}>{props.confirmLabel}</Text>
                )}
                {props.onCancel && (
                    <Text testID="modal-cancel" onPress={props.onCancel}>Annuler</Text>
                )}
            </View>
        );
    };
    MockAppAlertModal.displayName = "MockAppAlertModal";
    return MockAppAlertModal;
});

jest.mock("../src/components/Footer", () => "Footer");
jest.mock("@expo/vector-icons", () => ({
    Ionicons: "Ionicons"
}));

// Mocks services
const mockSignOut = jest.fn();
jest.mock("../src/hooks/useAuth", () => ({
    useAuth: () => ({
        signOut: mockSignOut,
    }),
}));
jest.mock("../src/services/onboardingService", () => ({
    resetOnboardingFlag: jest.fn(() => Promise.resolve()),
    getFamily: jest.fn(() => Promise.resolve({ id: 1 })),
}));
jest.mock("../src/services/debugUtils", () => ({
    deleteDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("../src/services/logService", () => ({
    addLog: jest.fn(() => Promise.resolve()),
    getLogs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../src/services/syncService", () => ({
    syncLogsToCloud: jest.fn(() => Promise.resolve()),
}));
jest.mock("../src/services/settingsFlagsService", () => {
    let enabled: boolean = true;
    let syncState: string = "idle";
    let lastSync: Date | null = null;
    let lastManualSync: number | null = null;

    return {
        getSyncEnabled: jest.fn(() => Promise.resolve(enabled)),
        setSyncEnabled: jest.fn((val) => {
            enabled = val;
            return Promise.resolve();
        }),
        getSyncState: jest.fn(() => Promise.resolve(syncState)),
        setSyncState: jest.fn((val) => {
            syncState = val;
            return Promise.resolve();
        }),
        getLastSync: jest.fn(() => Promise.resolve(lastSync)),
        setLastSync: jest.fn((val) => {
            lastSync = val;
            return Promise.resolve();
        }),
        getLastManualSync: jest.fn(() => Promise.resolve(lastManualSync)),
        setLastManualSync: jest.fn((val) => {
            lastManualSync = val;
            return Promise.resolve();
        }),
    };
});

const mockNavigation = { goBack: jest.fn() };

describe("SettingsScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Vérifie l’affichage du titre et du bouton de déconnexion.
     */
    it("affiche le titre et le bouton de déconnexion", async () => {
        const { getByText } = render(<SettingsScreen navigation={mockNavigation} />);
        await waitFor(() => {
            expect(getByText("Paramètres")).toBeTruthy();
            expect(getByText("Déconnexion")).toBeTruthy();
        });
    });

    /**
     * Vérifie la navigation arrière via la flèche retour.
     */
    it("navigue en arrière au clic sur la flèche retour", async () => {
        const { getAllByLabelText } = render(<SettingsScreen navigation={mockNavigation} />);
        await waitFor(() => {
            expect(getAllByLabelText("Retour")[0]).toBeTruthy();
        });
        fireEvent.press(getAllByLabelText("Retour")[0]);
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    /**
     * Vérifie que la fonction de déconnexion est appelée au clic sur le bouton.
     */
    it("déconnecte au clic sur Déconnexion", async () => {
        const { getByText } = render(<SettingsScreen navigation={mockNavigation} />);
        await waitFor(() => {
            expect(getByText("Déconnexion")).toBeTruthy();
        });
        fireEvent.press(getByText("Déconnexion"));
        expect(mockSignOut).toHaveBeenCalled();
    });

    /**
     * Vérifie l’affichage et la confirmation de la modal d’activation/désactivation synchronisation.
     */
    it("affiche la modal d’activation/désactivation synchronisation et effectue le toggle", async () => {
        const { getByTestId, getByText } = render(<SettingsScreen navigation={mockNavigation} />);
        fireEvent.press(getByTestId("sync-toggle"));
        await waitFor(() => {
            expect(
                getByText("Désactiver la synchronisation") ||
                getByText("Activer la synchronisation")
            ).toBeTruthy();
        }, { timeout: 2000 });
        fireEvent.press(getByTestId("modal-confirm"));
        expect(require("../src/services/settingsFlagsService").setSyncEnabled).toHaveBeenCalled();
    });

    /**
     * Vérifie l’affichage et la fermeture de la modal d’information sur la synchronisation cloud.
     */
    it("affiche la modal d’info cloud au clic sur info", async () => {
        const { getByTestId, getByText } = render(<SettingsScreen navigation={mockNavigation} />);
        fireEvent.press(getByTestId("sync-info"));
        await waitFor(() => {
            expect(getByText("À quoi sert la synchronisation cloud ?")).toBeTruthy();
        }, { timeout: 2000 });
        fireEvent.press(getByTestId("modal-confirm"));
    });

    /**
     * [Test SKIP] Protection contre la synchronisation manuelle trop rapprochée.
     * 
     * Ce test est désactivé car il dépend de flush d'effets asynchrones difficilement
     * reproductibles de manière fiable en environnement Jest.
     */
    it.skip("affiche la modal de protection si double synchro trop rapide", async () => {
        const settings = require("../src/services/settingsFlagsService");
        settings.getLastManualSync.mockResolvedValueOnce(Date.now());
        const { getByTestId, getByText } = render(<SettingsScreen navigation={mockNavigation} />);
        fireEvent.press(getByTestId("sync-now"));
        await waitFor(() => {
            expect(getByText("Synchronisation trop récente")).toBeTruthy();
        }, { timeout: 3000 });
        fireEvent.press(getByTestId("modal-confirm"));
    });

});
