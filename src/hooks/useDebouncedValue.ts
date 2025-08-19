import { useEffect, useRef, useState } from "react";

/**
 * Hook personnalisé retournant une version retardée (debounced) d'une valeur.
 * La mise à jour est appliquée uniquement après un délai donné,
 * ce qui permet de limiter la fréquence des changements (ex. saisie utilisateur).
 *
 * @template T Type de la valeur suivie
 * @param value Valeur source à observer
 * @param delay Délai en millisecondes avant propagation (par défaut 200 ms)
 * @returns Valeur mise à jour uniquement après le délai écoulé
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setDebounced(value), delay);

    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
  }, [value, delay]);

  return debounced;
}
