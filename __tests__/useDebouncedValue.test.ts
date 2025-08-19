/**
 * Tests unitaires pour le hook useDebouncedValue.
 * Vérifie le retour immédiat de la valeur initiale,
 * la mise à jour différée après le délai configuré,
 * et le nettoyage correct avec clearTimeout lors du démontage.
 */

import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "../src/hooks/useDebouncedValue";

jest.useFakeTimers();

describe("useDebouncedValue", () => {
  /**
   * Vérifie que la valeur initiale est retournée immédiatement.
   */
  it("retourne la valeur initiale immédiatement", () => {
    const { result } = renderHook(() => useDebouncedValue("init", 200));
    expect(result.current).toBe("init");
  });

  /**
   * Vérifie que la valeur ne change qu'après le délai configuré.
   */
  it("ne met à jour la valeur qu'après le délai", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebouncedValue(value, delay),
      { initialProps: { value: "a", delay: 200 } }
    );

    // On change la valeur → pas encore mise à jour
    rerender({ value: "b", delay: 200 });
    expect(result.current).toBe("a");

    // Avance dans le temps avant la fin du délai
    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");

    // On atteint le délai → mise à jour
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  /**
   * Vérifie que clearTimeout est bien exécuté lors du cleanup.
   */
  it("clearTimeout est bien appelé lors du cleanup", () => {
    const clearSpy = jest.spyOn(global, "clearTimeout");
    const { rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebouncedValue(value, delay),
      { initialProps: { value: "a", delay: 200 } }
    );

    rerender({ value: "b", delay: 200 });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
