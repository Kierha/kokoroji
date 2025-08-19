
/**
 * Teste le hook personnalisé useAuth pour la gestion de l'état utilisateur et de la session.
 * Les appels à Supabase sont mockés pour isoler la logique métier du hook.
 */
import React from "react";
import { render, act } from "@testing-library/react-native";
import { useAuth } from "../src/hooks/useAuth";


// Mock du client Supabase pour simuler les réponses d'authentification
jest.mock("../src/services/supabaseClient", () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChange: jest.fn(),
        },
    },
}));


// Récupération du mock pour configurer les retours dans chaque test
const { supabase } = require("../src/services/supabaseClient");


/**
 * Composant utilitaire pour tester la valeur retournée par le hook useAuth.
 * Permet de récupérer l'état du hook dans les tests unitaires.
 * @param onValue Callback appelée à chaque changement de valeur du hook
 * @returns null
 */
function HookTest({ onValue }: { onValue: (value: any) => void }) {
    const value = useAuth();
    React.useEffect(() => {
        onValue(value);
    }, [value, onValue]);
    return null;
}

describe.skip("useAuth", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Vérifie que l'utilisateur est bien récupéré au démarrage du hook.
     * Simule la récupération de l'utilisateur et l'abonnement aux changements de session.
     */
    it("récupère l'utilisateur au démarrage", async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "1" } } });
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
        });

        let hookValue: any;
        await act(async () => {
            render(<HookTest onValue={v => { hookValue = v; }} />);
            await Promise.resolve();
        });

        expect(hookValue.user).toEqual({ id: "1" });
        expect(hookValue.loading).toBe(false);
    });

    /**
     * Vérifie la mise à jour de l'utilisateur lors d'un changement de session.
     * Simule un événement SIGNED_IN et vérifie la mise à jour du hook.
     */
    it("met à jour l'utilisateur lors d'un changement de session", async () => {
        let callback: any;
        supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
        supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
            callback = cb;
            return { data: { subscription: { unsubscribe: jest.fn() } } };
        });

        let hookValue: any;
        await act(async () => {
            render(<HookTest onValue={v => { hookValue = v; }} />);
            await Promise.resolve();
        });

        act(() => {
            callback("SIGNED_IN", { user: { id: "2" } });
        });

        expect(hookValue.user).toEqual({ id: "2" });
        expect(hookValue.loading).toBe(false);
    });

    /**
     * Vérifie la déconnexion de l'utilisateur via la méthode signOut du hook.
     * Simule la déconnexion et vérifie la remise à zéro de l'utilisateur.
     */
    it("déconnecte l'utilisateur avec signOut", async () => {
        supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "1" } } });
        supabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
        });
        supabase.auth.signOut.mockResolvedValue({});

        let hookValue: any;
        await act(async () => {
            render(<HookTest onValue={v => { hookValue = v; }} />);
            await Promise.resolve();
        });

        await act(async () => {
            await hookValue.signOut();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(hookValue.user).toBeNull();
    });
});