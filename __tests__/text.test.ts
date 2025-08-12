/**
 * Tests unitaires pour utils/text.ts.
 * Vérifie la normalisation des chaînes de caractères
 * et le formatage des libellés à partir du dictionnaire.
 */

import { normalize, labelize } from "../src/utils/text";

describe("utils/text", () => {
  /**
   * Vérifie la conversion en minuscules et la suppression des accents.
   */
  it("convertit en minuscules et supprime les accents", () => {
    expect(normalize("Éléphant")).toBe("elephant");
    expect(normalize("Crème Brûlée")).toBe("creme brulee");
  });

  /**
   * Vérifie la gestion des valeurs vides ou nulles.
   */
  it("retourne une chaîne vide si entrée vide ou null", () => {
    expect(normalize("")).toBe("");
    expect(normalize(null as unknown as string)).toBe("");
    expect(normalize(undefined as unknown as string)).toBe("");
  });

  /**
   * Vérifie le formatage depuis le dictionnaire de correspondances.
   */
  it("retourne le libellé formaté depuis le dictionnaire", () => {
    expect(labelize("ludique")).toBe("Ludique");
    expect(labelize("peda")).toBe("Péda");
    expect(labelize("intérieur")).toBe("Intérieur");
    expect(labelize("exterieur")).toBe("Extérieur");
  });

  /**
   * Vérifie la capitalisation pour les valeurs hors dictionnaire.
   */
  it("retourne capitalisé si non présent dans le dictionnaire", () => {
    expect(labelize("autre")).toBe("Autre");
    expect(labelize("TEST")).toBe("Test");
  });

  /**
   * Vérifie la gestion des valeurs vides ou undefined.
   */
  it("retourne vide si paramètre vide ou undefined", () => {
    expect(labelize("")).toBe("");
    expect(labelize(undefined)).toBe("");
  });
});
