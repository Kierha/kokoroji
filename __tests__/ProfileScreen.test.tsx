/**
 * Tests unitaires pour le composant ProfileScreen.
 * Vérifie l’affichage des informations famille/enfants,
 * la présence des métriques,
 * la navigation vers les écrans d’édition et paramètres,
 * ainsi que l’appel à la fonction support.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ProfileScreen from "../src/screens/features/Profile/ProfileScreen";
import { handleSupport } from "../src/utils/support";

// Silence les warnings liés à act() pour CI plus propre
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

// Mock SafeAreaContext pour éviter erreur liée à useSafeAreaInsets
jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
        SafeAreaView: View,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

// Mocks navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
    ...jest.requireActual("@react-navigation/native"),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

// Factory props pour NativeStackScreenProps
const createProps = (overrides = {}) => ({
    navigation: {
        goBack: mockGoBack,
        navigate: mockNavigate,
    },
    route: {
        key: "ProfileScreen-key-mock",
        name: "ProfileScreen",
        params: undefined,
    },
    ...overrides
});


// Mocks services
jest.mock("../src/services/onboardingService", () => ({
    getFamily: jest.fn(() =>
        Promise.resolve({
            id: 1,
            name: "Famille Martin",
            parentName: "Jean",
        })
    ),
    getChildren: jest.fn(() =>
        Promise.resolve([
            { id: 7, name: "Léa", avatar: "👧", korocoins: 100, birthdate: "2014-06-10" },
            { id: 8, name: "Paul", avatar: "👦", korocoins: 50, birthdate: "2016-08-12" },
        ])
    ),
}));

// Mocks composants enfants avec displayName pour éviter l’erreur react/display-name
jest.mock("../src/components/ChildCard", () => {
    const React = require("react");
    const { Text } = require("react-native");
    const MockChildCard = (props: any) => <Text>{props.name} {props.korocoins}</Text>;
    MockChildCard.displayName = "MockChildCard";
    return MockChildCard;
});
jest.mock("../src/components/MetricCard", () => {
    const React = require("react");
    const { Text } = require("react-native");
    const MockMetricCard = (props: any) => <Text>{props.title}</Text>;
    MockMetricCard.displayName = "MockMetricCard";
    return MockMetricCard;
});
jest.mock("../src/components/Footer", () => "Footer");
jest.mock("../src/utils/support", () => ({
    handleSupport: jest.fn(),
}));


beforeEach(() => {
    jest.clearAllMocks();
});

describe("ProfileScreen", () => {
    /**
     * Vérifie l’affichage des infos famille et parent référent.
     */
    it("affiche les infos famille et parent", async () => {
        const props = createProps();
        const { getByText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            expect(getByText("Famille Martin")).toBeTruthy();
            expect(getByText("Parent référent : ")).toBeTruthy();
            expect(getByText("Jean")).toBeTruthy();
        });
    });

    /**
     * Vérifie que la liste des enfants s’affiche correctement.
     */
    it("affiche les enfants dans la liste", async () => {
        const props = createProps();
        const { getByText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            expect(getByText("Léa 100")).toBeTruthy();
            expect(getByText("Paul 50")).toBeTruthy();
        });
    });

    /**
     * Vérifie l’affichage des cartes métriques.
     */
    it("affiche les métriques", async () => {
        const props = createProps();
        const { getByText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            expect(getByText("Activités réalisées (7 derniers jours)")).toBeTruthy();
            expect(getByText("Photos récentes")).toBeTruthy();
        });
    });

    /**
     * Vérifie la navigation vers l’écran d’édition du profil au clic sur le crayon.
     */
    it("navigue vers EditProfile au clic sur le crayon", async () => {
        const props = createProps();
        const { getAllByRole } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            const editBtns = getAllByRole("button", { name: "Modifier profil" });
            fireEvent.press(editBtns[0]);
            expect(mockNavigate).toHaveBeenCalledWith("EditProfile", expect.any(Object));
        });
    });

    /**
     * Vérifie la navigation vers l’écran des paramètres au clic sur le bouton Paramètres.
     */
    it("navigue vers Paramètres au clic sur le bouton Paramètres", async () => {
        const props = createProps();
        const { getByText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            fireEvent.press(getByText("Paramètres"));
            expect(mockNavigate).toHaveBeenCalledWith("SettingsScreen");
        });
    });

    /**
     * Vérifie que la fonction handleSupport est appelée au clic sur Contact/Support.
     */
    it("exécute handleSupport au clic sur Contact/Support", async () => {
        const props = createProps();
        const { getByText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            fireEvent.press(getByText("Contact/Support"));
            expect(handleSupport).toHaveBeenCalled();
        });
    });

    /**
     * Vérifie la navigation arrière au clic sur la flèche de retour.
     */
    it("navigue en arrière au clic sur la flèche retour", async () => {
        const props = createProps();
        const { getAllByLabelText } = render(<ProfileScreen {...(props as any)} />);
        await waitFor(() => {
            const backBtn = getAllByLabelText("Retour")[0];
            fireEvent.press(backBtn);
            expect(mockGoBack).toHaveBeenCalled();
        });
    });
});
