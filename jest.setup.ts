/* eslint-env jest */

// Étend jest-native pour les matchers supplémentaires
import "@testing-library/jest-native/extend-expect";
import fetch from "node-fetch";

// Sauvegarde des méthodes console originales (une seule fois)
const originalWarn = console.warn;
const originalError = console.error;

// Filtrage des warnings bruyants pendant les tests
console.warn = (msg?: any, ...args: any[]) => {
  if (
    typeof msg === "string" &&
    (
      msg.includes("The global process.env.EXPO_OS is not defined") || // Expo OS
      msg.includes("You seem to update the state") ||                  // setState async
      msg.includes("Warning: An update to")                           // Mises à jour inutiles
      msg.includes("Supabase error") ||
      msg.includes("SQLite write failed")
    )
  ) {
    return;
  }
  originalWarn(msg, ...args);
};

// Filtrage de certaines erreurs connues non bloquantes
console.error = (msg?: any, ...args: any[]) => {
  if (
    typeof msg === "string" &&
    (
      msg.includes("ViewPropTypes will be removed from React Native") || // Dépréciations RN
      msg.includes("componentWillReceiveProps has been renamed")         // Lifecycle obsolète
    )
  ) {
    return;
  }
  originalError(msg, ...args);
};

// Polyfill clearImmediate pour éviter l'erreur dans StatusBar
if (typeof global.clearImmediate === "undefined") {
  (global as any).clearImmediate = (id?: number) => clearTimeout(id);
}
if (typeof global.setImmediate === "undefined") {
  (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args);
}

// Mock global fetch si besoin (évite des erreurs en tests)
if (typeof global.fetch === "undefined") {
  (global as any).fetch = fetch;
}
