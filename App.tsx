/**
 * Point d’entrée principal de l’application Kokoroji.
 * Initialise la base locale SQLite au démarrage, monte le provider d’authentification
 * et encapsule la navigation globale.
 * La navigation et les accès aux services sont conditionnés à la disponibilité
 * de la base locale (flag dbReady) pour éviter tout crash lors du premier lancement.
 */

import React, { useEffect, useState } from "react";
// Diagnostic temporaire pour vérifier l’accès aux helpers tslib (cause potentielle du __extends undefined)
import * as _tslib from 'tslib';
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
// Permet de désactiver Sentry rapidement pour isoler un crash (EXPO_PUBLIC_SENTRY_ENABLED=false)
// Sentry temporairement retiré pour isoler le crash (__extends undefined)
// (Réintégrer après identification de la cause)

// Fallback de diagnostic : si aucun helper __extends n'existe, on en injecte un minimaliste.
// Cela permet de confirmer qu'un module attendait que le helper soit déjà défini en global.
if (typeof (globalThis as any).__extends !== 'function') {
  (globalThis as any).__extends = function (d: any, b: any) {
    Object.setPrototypeOf(d, b);
  function __ (this: any) { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new (__ as any)());
  };
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[diag] helper __extends injecté (fallback)');
  }
}

if (__DEV__) {
  // Affiche les clés exportées par tslib (doit contenir __extends, __assign, etc.)
  // Si ce log ne s’affiche pas ou la liste est vide, c’est un problème de résolution de module.
  // Ce log est temporaire et sera retiré une fois le démarrage stabilisé.
  // eslint-disable-next-line no-console
  console.log('[diag] tslib exports:', Object.keys(_tslib).slice(0, 8), '…');
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
