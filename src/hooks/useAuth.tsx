/**
 * Hook et provider d’authentification pour l’application Kokoroji.
 * Permet de gérer l’état d’auth utilisateur (Supabase ou “bypass dev”).
 * Encapsule la logique de login/logout et expose une fonction de connexion fictive pour le développement.
 */
import React, { useCallback, useEffect, useState, useContext, createContext } from "react";
import { supabase } from "../services/supabaseClient";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    signInDevUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider d’authentification pour l’application.
 * Fournit le contexte utilisateur, l’état de chargement, et les méthodes de connexion/déconnexion.
 * @param children ReactNode
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [devBypass, setDevBypass] = useState(false); // Ajout du mode bypass dev

    /**
     * Déconnexion classique via Supabase.
     */
    const signOut = useCallback(async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setDevBypass(false); // On reset le bypass si on logout
        setLoading(false);
    }, []);

    /**
     * Connexion fictive (bypass dev) : permet de tester l’app sans authentification réelle.
     * N’impacte pas la BDD Supabase.
     * Visible et utilisable uniquement en mode développement (__DEV__).
     */
    const signInDevUser = useCallback(() => {
        setDevBypass(true);
        setUser({
            id: "dev-user-id",
            email: "dev@kokoroji.com",
            aud: "authenticated",
            role: "authenticated",
        } as User);
        setLoading(false);
        console.log("USER BYPASS DEV :", {
            id: "dev-user-id",
            email: "dev@kokoroji.com",
            aud: "authenticated",
            role: "authenticated",
        });
    }, []);

    // Initialisation de l'utilisateur Supabase réel
    useEffect(() => {
        if (devBypass) return; // On ne fait rien si bypass dev actif

        const getSession = async () => {
            const { data } = await supabase.auth.getSession();
            setUser(data?.session?.user ?? null);
            setLoading(false);
        };
        getSession();

        // Subscription aux changements d'authentification Supabase
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => { listener?.subscription?.unsubscribe(); };
    }, [devBypass]);

    return (
        <AuthContext.Provider value={{ user, loading, signOut, signInDevUser }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook personnalisé pour accéder au contexte d’authentification.
 * À utiliser dans tous les composants ayant besoin de l’état utilisateur.
 * @returns AuthContextType
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth doit être utilisé dans un AuthProvider");
    return context;
}
