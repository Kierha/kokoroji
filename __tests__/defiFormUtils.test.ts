/**
 * Tests unitaires pour utils/defiFormUtils.ts.
 * Vérifie la validation des formulaires de défis,
 * la préparation des données avant enregistrement,
 * et le comportement des helpers de formatage.
 */

import {
  trim,
  clampLen,
  numericOnly,
  isDefiFormReady,
  validateDefi,
  coerceDefi,
  TITLE_MAX,
  DESC_MAX,
} from "../src/utils/validationChallenge";

const validForm = {
  title: "Défi test",
  category: "Ludique",
  location: "Intérieur",
  photo_required: "Oui",
  duration_min: "30",
  points_default: "100",
  age_min: "5",
  age_max: "10",
  description: "Description valide",
};

describe("utils/defiFormUtils", () => {
  /**
   * Vérifie le bon fonctionnement des fonctions trim, clampLen et numericOnly.
   */
  it("trim supprime les espaces autour d'une chaîne", () => {
    expect(trim("  test  ")).toBe("test");
  });

  it("clampLen tronque une chaîne si elle dépasse max", () => {
    expect(clampLen("abcde", 3)).toBe("abc");
    expect(clampLen("abc", 5)).toBe("abc");
  });

  it("numericOnly garde uniquement les chiffres", () => {
    expect(numericOnly("a1b2c3")).toBe("123");
  });

  /**
   * Vérifie la détection de complétude du formulaire.
   */
  it("isDefiFormReady retourne true si tous les champs sont remplis", () => {
    expect(isDefiFormReady(validForm)).toBe(true);
  });

  it("isDefiFormReady retourne false si un champ est vide", () => {
    expect(isDefiFormReady({ ...validForm, title: "" })).toBe(false);
  });

  /**
   * Vérifie la validation des champs avec validateDefi.
   */
  it("validateDefi retourne ok=true pour un formulaire valide", () => {
    const result = validateDefi(validForm);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("validateDefi détecte les erreurs sur champs requis", () => {
    const result = validateDefi({ ...validForm, title: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it("validateDefi limite la longueur du titre et description", () => {
    const form = {
      ...validForm,
      title: "a".repeat(TITLE_MAX + 5),
      description: "b".repeat(DESC_MAX + 5),
    };
    const result = validateDefi(form);
    expect(result.ok).toBe(true); // champs tronqués mais valides
  });

  it("validateDefi détecte age_min > age_max", () => {
    const form = { ...validForm, age_min: "15", age_max: "10" };
    const result = validateDefi(form);
    expect(result.ok).toBe(false);
    expect(result.errors.age_min).toContain("≤");
  });

  /**
   * Vérifie la conversion des champs en types corrects avec coerceDefi.
   */
  it("coerceDefi convertit les valeurs en types corrects", () => {
    const coerced = coerceDefi(validForm);
    expect(typeof coerced.duration_min).toBe("number");
    expect(typeof coerced.points_default).toBe("number");
    expect(typeof coerced.age_min).toBe("number");
  });
});
