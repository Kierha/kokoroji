/**
 * Point d’entrée principal de l’application Kokoroji.
 * Initialise la base locale SQLite au boot, monte le provider d’auth
 * et encapsule la navigation globale.
 * La navigation et tous les accès aux services sont protégés par le
 * flag dbReady pour éviter tout crash lors du premier lancement.
 * @returns JSX.Element
 */
import React, { useEffect, useState } from "react";
import { AuthProvider } from "./src/hooks/useAuth";
import AppNavigator from "./src/navigation";
import { initializeDatabase } from "./src/database/db";
import Loader from "./src/components/Loader";

/**
 * Composant racine de l’application.
 * 1. Initialise la base SQLite à froid (seulement au 1er lancement).
 * 2. Affiche un loader tant que la BDD n’est pas prête.
 * 3. Monte les providers et la navigation.
 * @returns JSX.Element
 */
export default function App() {
  // State pour tracker l’état d’initialisation de la base locale
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialisation BDD : obligatoire avant tout accès CRUD
    initializeDatabase()
      .then(() => {
        setDbReady(true);
        // Log uniquement en dev
        // console.log("Base de données initialisée.");
      })
      .catch((err) => {
        // Log uniquement en dev
        // console.error("Erreur d'initialisation BDD :", err);
        // (optionnel) Tu pourrais afficher une page d’erreur bloquante ici
      });
  }, []);

  // Tant que la BDD n’est pas prête, affiche un loader global
  if (!dbReady) return <Loader />;

  // Une fois prêt, le provider d’auth encapsule la navigation principale
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
