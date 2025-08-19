/**
 * Tests unitaires pour le service challengeImportService.
 * Vérifie la récupération des défis par défaut depuis Supabase,
 * et leur import conditionnel en fonction de l’état du flag isChallengesImported,
 * en testant les différents scénarios de données, de mapping, et de gestion des erreurs.
 */

import {
  fetchDefaultChallengesFromSupabase,
  proposeAndImportDefaultChallengesCloud,
} from "../src/services/challengeImportService";
import { importDefaultChallenges } from "../src/services/challengeService";
import { isChallengesImported, setChallengesImported } from "../src/services/settingsFlagsService";
import { supabase } from "../src/services/supabaseClient";

jest.mock("../src/services/challengeService", () => ({
  importDefaultChallenges: jest.fn(),
}));

jest.mock("../src/services/settingsFlagsService", () => ({
  isChallengesImported: jest.fn(),
  setChallengesImported: jest.fn(),
}));

jest.mock("../src/services/supabaseClient", () => ({
  supabase: { from: jest.fn() },
}));

/**
 * Simule le comportement de supabase.from().select() avec une réponse prédéfinie.
 * @param response Objet contenant les données ou l'erreur à renvoyer.
 */
function mockSupabaseSelect(response: { data?: any; error?: any }) {
  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue(response),
  });
}

describe("fetchDefaultChallengesFromSupabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Doit renvoyer les lignes de données si Supabase répond correctement.
   */
  it("renvoie les données quand Supabase répond OK", async () => {
    const rows = [
      {
        title: "Ranger sa chambre",
        description: "Desc",
        category: "Ludique",
        location: "Intérieur",
        duration_min: 10,
        points_default: 5,
        photo_required: "Oui",
        age_min: 6,
        age_max: 10,
      },
    ];
    mockSupabaseSelect({ data: rows });

    const res = await fetchDefaultChallengesFromSupabase();

    expect(supabase.from).toHaveBeenCalledWith("challenges_default");
    expect(res).toEqual(rows);
  });

  /**
   * Doit renvoyer un tableau vide et consigner une erreur si Supabase retourne une erreur.
   */
  it("renvoie [] et log d'erreur quand Supabase renvoie une erreur", async () => {
    mockSupabaseSelect({ data: null, error: { message: "boom" } });

    const res = await fetchDefaultChallengesFromSupabase();

    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(0);
  });
});

describe("proposeAndImportDefaultChallengesCloud", () => {
  const FAMILY_ID = 42;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Doit ignorer l'import si le flag `isChallengesImported` est déjà positionné.
   */
  it("skip si le flag isChallengesImported est déjà vrai", async () => {
    (isChallengesImported as jest.Mock).mockResolvedValue(true);

    const onImportStart = jest.fn();
    const onImportSuccess = jest.fn();
    const onImportCancel = jest.fn();

    const result = await proposeAndImportDefaultChallengesCloud(FAMILY_ID, {
      onImportStart,
      onImportSuccess,
      onImportCancel,
    });

    expect(result).toBe(false);
    expect(onImportStart).not.toHaveBeenCalled();
    expect(importDefaultChallenges).not.toHaveBeenCalled();
    expect(setChallengesImported).not.toHaveBeenCalled();
  });

  /**
   * Doit positionner le flag et appeler onImportCancel si aucune donnée n'est à importer.
   */
  it("aucune donnée à importer → pose le flag, onImportCancel(), retourne false", async () => {
    (isChallengesImported as jest.Mock).mockResolvedValue(false);
    mockSupabaseSelect({ data: [] });

    const onImportStart = jest.fn();
    const onImportSuccess = jest.fn();
    const onImportCancel = jest.fn();

    const result = await proposeAndImportDefaultChallengesCloud(FAMILY_ID, {
      onImportStart,
      onImportSuccess,
      onImportCancel,
    });

    expect(onImportStart).toHaveBeenCalled();
    expect(importDefaultChallenges).not.toHaveBeenCalled();
    expect(setChallengesImported).toHaveBeenCalledWith(true);
    expect(onImportCancel).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  /**
   * Doit mapper et insérer les données puis positionner le flag et appeler onImportSuccess.
   */
  it("données présentes → mappe & insère, pose le flag, onImportSuccess(), retourne true", async () => {
    (isChallengesImported as jest.Mock).mockResolvedValue(false);

    const rows = [
      {
        title: "Défi 1",
        description: null,
        category: "Pédagogique",
        location: "Extérieur",
        duration_min: 12,
        points_default: 8,
        photo_required: "Non",
        age_min: null,
        age_max: 14,
      },
      {
        title: null,
      },
    ];
    mockSupabaseSelect({ data: rows });

    const onImportStart = jest.fn();
    const onImportSuccess = jest.fn();
    const onImportCancel = jest.fn();

    const result = await proposeAndImportDefaultChallengesCloud(FAMILY_ID, {
      onImportStart,
      onImportSuccess,
      onImportCancel,
    });

    expect(onImportStart).toHaveBeenCalled();
    expect(importDefaultChallenges).toHaveBeenCalledTimes(1);
    expect(setChallengesImported).toHaveBeenCalledWith(true);
    expect(onImportSuccess).toHaveBeenCalled();
    expect(onImportCancel).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  /**
   * Doit appeler onImportCancel et ne pas positionner le flag en cas d'exception.
   */
  it("exception (réseau/SQLite) → pas de flag, onImportCancel(), retourne false", async () => {
    (isChallengesImported as jest.Mock).mockResolvedValue(false);

    const rows = [{ title: "Défi KO", category: "Ludique", location: "Intérieur" }];
    mockSupabaseSelect({ data: rows });

    (importDefaultChallenges as jest.Mock).mockRejectedValue(new Error("SQLite write failed"));

    const onImportStart = jest.fn();
    const onImportSuccess = jest.fn();
    const onImportCancel = jest.fn();

    const result = await proposeAndImportDefaultChallengesCloud(FAMILY_ID, {
      onImportStart,
      onImportSuccess,
      onImportCancel,
    });

    expect(onImportStart).toHaveBeenCalled();
    expect(importDefaultChallenges).toHaveBeenCalled();
    expect(setChallengesImported).not.toHaveBeenCalled();
    expect(onImportSuccess).not.toHaveBeenCalled();
    expect(onImportCancel).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
