/**
 * Point d'entrée principal de l’application Kokoroji.
 * Monte la navigation globale et encapsule l’ensemble de l’UI.
 */
import React from "react";
import AppNavigator from "./src/navigation";

/**
 * Composant racine de l’application.
 * Initialise la navigation principale.
 * @returns JSX.Element
 */
export default function App() {
  return <AppNavigator />;
}
