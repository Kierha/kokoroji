/**
 * Point d’entrée principal de l’application Kokoroji.
 * Initialise la base locale SQLite au démarrage, monte le provider d’authentification
 * et encapsule la navigation globale.
 * La navigation et les accès aux services sont conditionnés à la disponibilité
 * de la base locale (flag dbReady) pour éviter tout crash lors du premier lancement.
 */

import React, { useEffect, useState } from "react";
import * as Sentry from 'sentry-expo';
import * as Linking from 'expo-linking';
import { supabase } from "./src/services/supabaseClient";
import { AuthProvider } from "./src/hooks/useAuth";
import AppNavigator from "./src/navigation";
import { initializeDatabase } from "./src/database/db";
import Loader from "./src/components/Loader";
import { checkAndPurgeLogs } from "./src/utils/purgeLogs";

/**
 * Composant racine de l’application.
 * - Initialise la base SQLite lors du premier lancement.
 * - Affiche un loader tant que la base n’est pas prête.
 * - Monte les providers (authentification) et la navigation.
 * - Lance une purge quotidienne des logs anciens (>30 jours).
 *
 * @returns JSX.Element - Composant principal de l’application.
 */

// Fallback de diagnostic : si aucun helper __extends n'existe, on en injecte un minimaliste.
// Cela permet de confirmer qu'un module attendait que le helper soit déjà défini en global.
if (typeof (globalThis as any).__extends !== 'function') {
  (globalThis as any).__extends = function (d: any, b: any) {
    Object.setPrototypeOf(d, b);
    function __(this: any) { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new (__ as any)());
  };
  if (__DEV__) {
    console.log('[diag] helper __extends injecté (fallback)');
  }
}

// Initialisation Sentry minimale (uniquement si variable DSN présente)
if (!(globalThis as any).jest && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: process.env.EXPO_PUBLIC_ENV || 'development',
      enableInExpoDevelopment: true,
      debug: false,
    });
  } catch {
    // ignore init failure
  }
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  // Hook pour gérer l'ouverture via magic link (deep link)
  function useHandleMagicLink() {
    useEffect(() => {
      const handleUrl = async (url: string | null) => {
        if (!url) return;

        // Essaye le fragment (#...) puis la query (?...)
        let paramsStr = url.split('#')[1] ?? "";
        if (!paramsStr && url.includes('?')) paramsStr = url.split('?')[1] ?? "";

        if (!paramsStr) return;

        const params = new URLSearchParams(paramsStr);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          try {
            if (refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token } as any);
            } else {
              await supabase.auth.setSession({ access_token } as any);
            }
          } catch (e) {
            console.error('Erreur restauration session via magic link', e);
          }
        }
      };


      Linking.getInitialURL().then((initial: string | null) => handleUrl(initial)).catch(() => { });

      const sub = Linking.addEventListener('url', (ev: { url: string }) => {
        handleUrl(ev.url);
      });

      return () => {
        try { sub.remove(); } catch { /* noop */ }
      };
    }, []);
  }

  useHandleMagicLink();

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        setDbReady(true);

        // Log de debug (dev uniquement)
        if (__DEV__) console.log("Base de données initialisée.");

        // Purge journalière des logs anciens (30 jours)
        await checkAndPurgeLogs(30);
      } catch (err) {
        // Log erreur (utile pour diagnostiquer en production également)
        console.error("Erreur d'initialisation ou de purge BDD :", err);
        // NOTE: Une page dédiée d'erreur utilisateur pourrait être ajoutée ultérieurement.
      }
    }

    init();
  }, []);

  if (!dbReady) return <Loader />;

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
