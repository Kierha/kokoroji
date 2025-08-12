/* eslint-env jest */

// Étend jest-native pour les matchers supplémentaires
import "@testing-library/jest-native/extend-expect";
import fetch from "node-fetch";

// Évite de patcher plusieurs fois si Jest charge deux fois le setup
if (!(global as any).__JEST_CONSOLE_PATCHED__) {
  (global as any).__JEST_CONSOLE_PATCHED__ = true;

  // Sauvegarde des méthodes console originales (une seule fois)
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  // Permet de réactiver les logs ponctuellement : DEBUG_LOGS=1 npm test
  const DEBUG = process.env.DEBUG_LOGS === "1";

  // ---- Utilitaires de filtrage sur TOUS les arguments ----
  const argsToText = (args: unknown[]) =>
    args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message} ${a.stack ?? ""}`;
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");

  const matches = (patterns: RegExp[], args: unknown[]) =>
    patterns.some((re) => re.test(argsToText(args)));

  // ---- Listes de patterns à taire ----
  // Filtrage des warnings bruyants pendant les tests
  const WARN_PATTERNS: RegExp[] = [
    /The global process\.env\.EXPO_OS is not defined/i, // Expo OS
    /You seem to update the state/i,                    // setState async
    /Warning: An update to/i,                           // Mises à jour inutiles
    /ViewPropTypes will be removed from React Native/i, // Dépréciations RN
    /componentWillReceiveProps has been renamed/i,      // Lifecycle obsolète
    /Supabase error/i,                                  // Warnings mock supabase (si nécessaire)
  ];

  // Filtrage de certaines erreurs connues non bloquantes
  const ERROR_PATTERNS: RegExp[] = [
    /Supabase error/i,          // Erreur Supabase mock
    /SQLite write failed/i,     // Erreur SQLite mock
    /\[Import\]\s*ERROR/i,      // Préfixe d’import volontaire
  ];

  // Patchs console, en respectant le mode debug
  console.warn = (...args: any[]) => {
    if (!DEBUG && matches(WARN_PATTERNS, args)) return;
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    if (!DEBUG && matches(ERROR_PATTERNS, args)) return;
    originalError(...args);
  };
}

// Polyfill clearImmediate pour éviter l'erreur dans StatusBar
if (typeof (global as any).clearImmediate === "undefined") {
  (global as any).clearImmediate = (id?: number) => clearTimeout(id as any);
}
if (typeof (global as any).setImmediate === "undefined") {
  (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args);
}

// Mock global fetch si besoin (évite des erreurs en tests)
if (typeof (global as any).fetch === "undefined") {
  (global as any).fetch = fetch as any;
}
