/**
 * Point d’entrée principal de l’application Kokoroji.
 * Initialise la base locale SQLite au démarrage, monte le provider d’authentification
 * et encapsule la navigation globale.
 * La navigation et les accès aux services sont conditionnés à la disponibilité
 * de la base locale (flag dbReady) pour éviter tout crash lors du premier lancement.
 */

import React, { useEffect, useState } from "react";
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
