/**
 * Tests unitaires pour l’écran SessionScreen.
 * Vérifie l’affichage initial, l’ouverture des modales (config, garde, reprise, historique),
 * le flux de configuration (random/bundle) avec navigation ou erreur, et la terminaison depuis le garde.
 * Les hooks/services (useActiveSession, onboarding, flags, history) et composants enfants sont mockés.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/* Mocks navigation et icônes */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => ({
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    // Exécution immédiate du callback de focus pour tester la logique de reprise
    useFocusEffect: (cb: any) => {
        const cleanup = cb();
        if (typeof cleanup === "function") cleanup();
    },
}));

jest.mock("@expo/vector-icons", () => ({
    Ionicons: () => null,
}));

/* Mocks composants enfants */
jest.mock("../src/components/Loader", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function Loader() {
        return <Text>LOADER</Text>;
    };
});

jest.mock("../src/components/ButtonPrimary", () => {
    const React = require("react");
    const { TouchableOpacity, Text } = require("react-native");
    return function ButtonPrimary(props: any) {
        return (
            <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
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
            <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
                <Text>{props.title}</Text>
            </TouchableOpacity>
        );
    };
});

/* AppAlertModal minimal pour piloter confirm/cancel */
jest.mock("../src/components/AppAlertModal", () => {
    const React = require("react");
    const { View, Text, TouchableOpacity } = require("react-native");
    return function AppAlertModal(props: any) {
        if (!props.visible) return null;
        return (
            <View>
                <Text>{props.title}</Text>
                {props.message ? <Text>{props.message}</Text> : null}
                {props.confirmLabel ? (
                    <TouchableOpacity onPress={props.onConfirm}>
                        <Text>{props.confirmLabel}</Text>
                    </TouchableOpacity>
                ) : null}
                {props.cancelLabel ? (
                    <TouchableOpacity onPress={props.onCancel}>
                        <Text>{props.cancelLabel}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };
});

/* SessionConfigModal minimal : expose un bouton de confirmation */
jest.mock("../src/components/SessionConfigModal", () => {
    const React = require("react");
    const { View, Text, TouchableOpacity } = require("react-native");
    return function SessionConfigModal(props: any) {
        if (!props.visible) return null;
        return (
            <View>
                <Text>CONFIG_OPEN</Text>
                <TouchableOpacity
                    onPress={() =>
                        props.onConfirm({
                            familyId: props.familyId,
                            childIds: props.childrenData?.map((c: any) => c.id) ?? [],
                            type: props.initial?.type ?? "random",
                            location: props.initial?.location ?? "interieur",
                            plannedDurationMin: props.initial?.plannedDurationMin ?? 30,
                            lookbackDays: props.initial?.lookbackDays ?? 30,
                            category: props.initial?.category,
                            createdBy: "parent@demo",
                        })
                    }
                >
                    <Text>CONFIRMER_CONFIG</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={props.onClose}>
                    <Text>FERMER_CONFIG</Text>
                </TouchableOpacity>
            </View>
        );
    };
});

/* HistoryModal minimal */
jest.mock("../src/components/HistoryModal", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function HistoryModal(props: any) {
        return props.visible ? <Text>HISTORY_OPEN</Text> : null;
    };
});

/* Mocks services et hook useActiveSession */
const mockEnsureSession = jest.fn();
const mockProposeRandom = jest.fn();
const mockProposeBundle = jest.fn();
const mockRefreshActive = jest.fn();
const mockEndActive = jest.fn();

/** Variables globales utilisées par la factory (préfixe requis par Jest) */
let mockHasActiveRef = false;
let mockActiveSessionRef: any = null;

jest.mock("../src/hooks/useActiveSession", () => ({
    __esModule: true,
    default: () =>
    ({
        hasActive: mockHasActiveRef,
        activeSession: mockActiveSessionRef,
        ensureSession: mockEnsureSession,
        proposeRandomDefi: mockProposeRandom,
        proposeBundle: mockProposeBundle,
        refreshActive: mockRefreshActive,
        endActiveSession: mockEndActive,
    } as any),
}));

jest.mock("../src/services/onboardingService", () => ({
    getFamily: jest.fn().mockResolvedValue({ id: 1 }),
    getChildren: jest.fn().mockResolvedValue([
        { id: 10, name: "A", birthdate: "2018-01-01", avatar: null, korocoins: 0 },
        { id: 11, name: "B", birthdate: "2020-02-02", avatar: null, korocoins: 0 },
    ]),
}));

const mockGetOpenSessionId = jest.fn().mockResolvedValue(null);
const mockSetOpenSessionId = jest.fn().mockResolvedValue(undefined);
const mockClearOpenSessionId = jest.fn().mockResolvedValue(undefined);
const mockGetResumePromptState = jest.fn().mockResolvedValue({});
const mockSnoozeResumePrompt = jest.fn().mockResolvedValue(undefined);
const mockClearResumePromptState = jest.fn().mockResolvedValue(undefined);

jest.mock("../src/services/appFlagsActiveSession", () => ({
    getOpenSessionId: (...a: any[]) => mockGetOpenSessionId(...a),
    setOpenSessionId: (...a: any[]) => mockSetOpenSessionId(...a),
    clearOpenSessionId: (...a: any[]) => mockClearOpenSessionId(...a),
    getResumePromptState: (...a: any[]) => mockGetResumePromptState(...a),
    snoozeResumePrompt: (...a: any[]) => mockSnoozeResumePrompt(...a),
    clearResumePromptState: (...a: any[]) => mockClearResumePromptState(...a),
}));

jest.mock("../src/services/sessionHistoryService", () => ({
    getSessionHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock("../src/services/logService", () => ({
    addLog: jest.fn(),
}));

/* Helper de rendu avec SafeAreaProvider */
const renderScreen = () => {
    const SessionScreen = require("../src/screens/features/Session/SessionScreen").default;
    return render(
        <SafeAreaProvider
            initialMetrics={{
                frame: { x: 0, y: 0, width: 0, height: 0 },
                insets: { top: 0, left: 0, right: 0, bottom: 0 },
            }}
        >
            <SessionScreen />
        </SafeAreaProvider>
    );
};

describe("SessionScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHasActiveRef = false;
        mockActiveSessionRef = null;
        mockEnsureSession.mockReset();
        mockProposeRandom.mockReset();
        mockProposeBundle.mockReset();
        mockRefreshActive.mockReset();
        mockEndActive.mockReset();
        mockNavigate.mockReset();
        mockGoBack.mockReset();
        mockGetOpenSessionId.mockResolvedValue(null);
        mockGetResumePromptState.mockResolvedValue({});
    });

    /**
     * Vérifie l’affichage initial du titre et des actions, puis l’ouverture de l’historique.
     */
    it("affiche le titre, les actions et ouvre l’historique", async () => {
        const { queryByText, getByText } = renderScreen();

        await waitFor(() => {
            expect(queryByText("Session")).toBeTruthy();
            expect(queryByText("Défi aléatoire")).toBeTruthy();
            expect(queryByText("Session de défis")).toBeTruthy();
            expect(queryByText("Historique")).toBeTruthy();
        });

        fireEvent.press(getByText("Historique"));
        expect(queryByText("HISTORY_OPEN")).toBeTruthy();
    });

    /**
     * Vérifie l’ouverture de la configuration random lorsqu’aucune session n’est active.
     */
    it("ouvre la config random quand aucune session n’est active", async () => {
        mockHasActiveRef = false;

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Défi aléatoire")).toBeTruthy());

        fireEvent.press(getByText("Défi aléatoire"));
        expect(queryByText("CONFIG_OPEN")).toBeTruthy();
    });

    /**
     * Vérifie le garde si une session est active et la terminaison depuis l’alerte.
     */
    it("bloque l’ouverture si session active et permet de terminer depuis l’alerte", async () => {
        mockHasActiveRef = true;
        mockActiveSessionRef = { id: 5 };

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Défi aléatoire")).toBeTruthy());

        fireEvent.press(getByText("Défi aléatoire"));

        await waitFor(() => {
            expect(queryByText("Une session est déjà en cours")).toBeTruthy();
        });

        fireEvent.press(getByText("Terminer"));
        await waitFor(() => {
            expect(mockEndActive).toHaveBeenCalledWith(5);
        });
    });

    /**
     * Vérifie le flux random : création, enregistrement du flag et navigation si un défi est proposé.
     */
    it("confirme une config random, enregistre le flag et navigue si un défi est proposé", async () => {
        mockHasActiveRef = false;
        mockEnsureSession.mockResolvedValue({ id: 100 });
        mockProposeRandom.mockResolvedValue({ id: "D1" });

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Défi aléatoire")).toBeTruthy());

        fireEvent.press(getByText("Défi aléatoire"));
        await waitFor(() => expect(queryByText("CONFIG_OPEN")).toBeTruthy());

        fireEvent.press(getByText("CONFIRMER_CONFIG"));

        await waitFor(() => {
            expect(mockEnsureSession).toHaveBeenCalled();
            expect(mockSetOpenSessionId).toHaveBeenCalledWith(100);
            expect(mockNavigate).toHaveBeenCalledWith("ActiveSession");
        });
    });

    /**
     * Vérifie l’erreur random si aucun défi n’est proposé.
     */
    it("affiche la modale d’erreur si aucun défi n’est éligible en random", async () => {
        mockHasActiveRef = false;
        mockEnsureSession.mockResolvedValue({ id: 101 });
        mockProposeRandom.mockResolvedValue(null);

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Défi aléatoire")).toBeTruthy());

        fireEvent.press(getByText("Défi aléatoire"));
        await waitFor(() => expect(queryByText("CONFIG_OPEN")).toBeTruthy());

        fireEvent.press(getByText("CONFIRMER_CONFIG"));

        await waitFor(() => {
            expect(queryByText("Aucun défi disponible")).toBeTruthy();
        });
    });

    /**
     * Vérifie le flux bundle : création, proposition de liste et navigation.
     */
    it("confirme une config bundle avec liste valide et navigue", async () => {
        mockHasActiveRef = false;
        mockEnsureSession.mockResolvedValue({ id: 102 });
        mockProposeBundle.mockResolvedValue([{ id: "B1" }, { id: "B2" }]);

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Session de défis")).toBeTruthy());

        fireEvent.press(getByText("Session de défis"));
        await waitFor(() => expect(queryByText("CONFIG_OPEN")).toBeTruthy());

        fireEvent.press(getByText("CONFIRMER_CONFIG"));

        await waitFor(() => {
            expect(mockEnsureSession).toHaveBeenCalled();
            expect(mockSetOpenSessionId).toHaveBeenCalledWith(102);
            expect(mockNavigate).toHaveBeenCalledWith("ActiveSession");
        });
    });

    /**
     * Vérifie l’erreur bundle si la liste proposée est vide.
     */
    it("affiche la modale d’erreur si la liste bundle est vide", async () => {
        mockHasActiveRef = false;
        mockEnsureSession.mockResolvedValue({ id: 103 });
        mockProposeBundle.mockResolvedValue([]);

        const { getByText, queryByText } = renderScreen();
        await waitFor(() => expect(queryByText("Session de défis")).toBeTruthy());

        fireEvent.press(getByText("Session de défis"));
        await waitFor(() => expect(queryByText("CONFIG_OPEN")).toBeTruthy());

        fireEvent.press(getByText("CONFIRMER_CONFIG"));

        await waitFor(() => {
            expect(queryByText("Aucun défi disponible")).toBeTruthy();
        });
    });

    /**
     * Vérifie la reprise au focus si un openSessionId cohérent existe et n’est pas snoozé.
     */
    it("propose la reprise au focus et navigue sur confirmation", async () => {
        mockHasActiveRef = true;
        mockActiveSessionRef = { id: 200 };
        mockGetOpenSessionId.mockResolvedValue(200);
        mockGetResumePromptState.mockResolvedValue({ sessionId: 200 });

        const { queryByText, getByText } = renderScreen();

        await waitFor(() => {
            expect(queryByText("Reprendre la session en cours ?")).toBeTruthy();
        });

        fireEvent.press(getByText("Reprendre"));
        expect(mockNavigate).toHaveBeenCalledWith("ActiveSession");
    });
});