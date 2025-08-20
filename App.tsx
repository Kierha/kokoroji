/**
 * Point d’entrée principal de l’application Kokoroji.
 * Initialise la base locale SQLite au démarrage, monte le provider d’authentification
 * et encapsule la navigation globale.
 * La navigation et les accès aux services sont conditionnés à la disponibilité
 * de la base locale (flag dbReady) pour éviter tout crash lors du premier lancement.
 */

import React, { useEffect, useState } from "react";
import * as Sentry from 'sentry-expo';
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

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        setDbReady(true);

        // Log de debug (dev uniquement)
        console.log("Base de données initialisée.");

        // Purge journalière des logs anciens (30 jours)
        await checkAndPurgeLogs(30);
      } catch (err) {
        // Log erreur (dev uniquement)
        console.error("Erreur d'initialisation ou de purge BDD :", err);
        // TODO : gestion d'erreur bloquante / page erreur éventuelle
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
