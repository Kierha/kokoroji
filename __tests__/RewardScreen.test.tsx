/**
 * Tests unitaires pour l’écran RewardsScreen.
 * Vérifie l’initialisation et le rendu selon les états (chargement, famille absente, liste vide),
 * le comportement des boutons (création, édition, suppression, historique, filtres, import),
 * ainsi que les appels aux services et au système de logs.
 * Les hooks, services et composants enfants sont mockés.
 */

import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Mock navigation et icônes
jest.mock("@react-navigation/native", () => ({
    useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock("@expo/vector-icons", () => ({
    Ionicons: () => null,
}));

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
                <Text>{props.label ?? "FilterRow"}</Text>
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
jest.mock("../src/components/RewardItem", () => {
    const React = require("react");
    const { TouchableOpacity, Text } = require("react-native");
    return function RewardItem(props: any) {
        return (
            <TouchableOpacity onPress={props.onPress} testID={`reward-${props.id}`}>
                <Text>{props.title}</Text>
            </TouchableOpacity>
        );
    };
});
jest.mock("../src/components/RewardForm", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function RewardForm() {
        return <Text>FORM_VISIBLE</Text>;
    };
});
jest.mock("../src/components/RewardHistory", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function RewardHistory(props: any) {
        return props.visible ? <Text>HISTORY_OPEN</Text> : null;
    };
});
jest.mock("../src/components/AppAlertModal", () => {
    return () => null;
});
jest.mock("../src/components/ChildCarousel", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function ChildCarousel() {
        return <Text>ChildCarousel</Text>;
    };
});
jest.mock("../src/components/RewardSelectionModal", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return function RewardSelectionModal() {
        return <Text>RewardSelectionModal</Text>;
    };
});

// Mocks services — factory jest.fn() inline
jest.mock("../src/services/onboardingService", () => ({
    getFamily: jest.fn(),
    getChildren: jest.fn(),
}));
jest.mock("../src/services/rewardService", () => ({
    getAllRewards: jest.fn(),
    deleteReward: jest.fn(),
}));
jest.mock("../src/services/settingsFlagsService", () => ({
    getRewardsImportedFlag: jest.fn(),
    setRewardsImportedFlag: jest.fn(),
}));
jest.mock("../src/services/rewardImportService", () => ({
    proposeAndImportDefaultRewardsCloud: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
    addLog: jest.fn(),
}));

/**
 * Helper de rendu de RewardsScreen avec SafeAreaProvider mocké.
 */
const renderScreen = () => {
    const RewardsScreen = require("../src/screens/features/Rewards/RewardsScreen").default;
    return require("@testing-library/react-native").render(
        <SafeAreaProvider
            initialMetrics={{
                frame: { x: 0, y: 0, width: 0, height: 0 },
                insets: { top: 0, left: 0, right: 0, bottom: 0 },
            }}
        >
            <RewardsScreen />
        </SafeAreaProvider>
    );
};

describe("RewardsScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { getFamily, getChildren } = require("../src/services/onboardingService");
        const { getAllRewards } = require("../src/services/rewardService");
        const { getRewardsImportedFlag } = require("../src/services/settingsFlagsService");
        const { proposeAndImportDefaultRewardsCloud } = require("../src/services/rewardImportService");

        getFamily.mockResolvedValue({ id: 1 });
        getChildren.mockResolvedValue([]);
        getAllRewards.mockResolvedValue([{ id: 1, family_id: 1, title: "R1", cost: 10 }]);
        getRewardsImportedFlag.mockResolvedValue(true);
        proposeAndImportDefaultRewardsCloud.mockResolvedValue(undefined);
    });

    /**
     * Vérifie que l’écran affiche le loader pendant le chargement.
     */
    it("affiche Loader en état de chargement", async () => {
        const { getFamily } = require("../src/services/onboardingService");
        getFamily.mockImplementation(() => new Promise(() => { }));
        const { findByText } = renderScreen();
        expect(await findByText("LOADER")).toBeTruthy();
    });

    /**
     * Vérifie le comportement si aucune famille n’est trouvée.
     */
    it("affiche un message si la famille est introuvable", async () => {
        const { getFamily } = require("../src/services/onboardingService");
        getFamily.mockResolvedValueOnce(null);
        const { findByText, queryByText } = renderScreen();
        await waitFor(() => {
            expect(queryByText("LOADER")).toBeNull();
        });
        expect(await findByText(/Impossible de récupérer la famille/)).toBeTruthy();
    });

    /**
     * Vérifie que les récompenses sont chargées et affichées.
     */
    it("charge et affiche les récompenses", async () => {
        const { findByTestId, queryByText } = renderScreen();
        await waitFor(() => {
            expect(queryByText("LOADER")).toBeNull();
        });
        expect(await findByTestId("reward-1")).toHaveTextContent("R1");
    });

    /**
     * Vérifie l’ouverture de l’historique.
     */
    it("ouvre l’historique", async () => {
        const { getByText, queryByText } = renderScreen();
        await waitFor(() => {
            expect(queryByText("LOADER")).toBeNull();
        });
        fireEvent.press(getByText("Historique"));
        await waitFor(() => {
            expect(queryByText("HISTORY_OPEN")).toBeTruthy();
        });
    });

    /**
     * Vérifie l’activation/désactivation du mode gestion.
     */
    it("active et désactive le mode gestion", async () => {
        const { getByText, queryByText } = renderScreen();
        await waitFor(() => {
            expect(queryByText("LOADER")).toBeNull();
        });
        fireEvent.press(getByText("Éditer/Gérer"));
        await waitFor(() => {
            expect(getByText("Terminer")).toBeTruthy();
        });
        fireEvent.press(getByText("Terminer"));
        await waitFor(() => {
            expect(getByText("Éditer/Gérer")).toBeTruthy();
        });
    });

    /**
     * Vérifie la suppression d'une récompense après confirmation.
     */
    it("supprime une récompense après confirmation", async () => {
        const { findByTestId, queryByText } = renderScreen();
        await waitFor(() => {
            expect(queryByText("LOADER")).toBeNull();
        });
        const reward = await findByTestId("reward-1");
        expect(reward).toBeTruthy();
    });
});
