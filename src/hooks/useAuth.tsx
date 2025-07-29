/**
 * Hook useAuth : gestion centralisée de l’état d’authentification utilisateur pour l’application Kokoroji.
 * Permet d’exposer l’utilisateur courant, l’état de chargement et la méthode de déconnexion.
 * Gère l’abonnement aux changements de session Supabase et le nettoyage associé.
 */
import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../services/supabaseClient";

/**
 * Hook personnalisé pour gérer l'état d'authentification Supabase.
 * Expose l'utilisateur courant, l'état de chargement et la méthode de déconnexion.
 * Écoute les changements d'état de connexion pour garder l'UI à jour.
 * @returns {{ user: User | null, loading: boolean, signOut: () => Promise<void> }}
 */
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Récupère l'utilisateur actuel au démarrage du hook.
     */
    const getCurrentUser = useCallback(async () => {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        setLoading(false);
    }, []);

    /**
     * Déconnecte l'utilisateur et réinitialise l'état local.
     */
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
    }, []);

    useEffect(() => {
        getCurrentUser();

        /**
         * Abonnement aux changements d'état d'authentification.
         * Met à jour l'utilisateur dès qu'il y a un changement de session.
         */
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Nettoyage de l'abonnement à la destruction du hook
        return () => {
            listener.subscription.unsubscribe();
        };
    }, [getCurrentUser]);

    return { user, loading, signOut };
}
