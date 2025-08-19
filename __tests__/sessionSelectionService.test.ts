/**
 * Tests unitaires pour le service sessionSelectionService.
 * Vérifie la sélection aléatoire d’un défi éligible et la construction d’un bundle de défis en respectant les filtres (lieu, catégorie, durée, âge, lookback).
 * Les accès SQLite et le service de logs sont mockés, ainsi que l’aléatoire pour des résultats déterministes.
 */

import {
  pickRandomEligibleDefi,
  buildEligibleBundle,
} from "../src/services/sessionSelectionService";
import { getDatabaseAsync } from "../src/database/db";
import { addLog } from "../src/services/logService";

// Mocks dépendances
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/logService", () => ({
  addLog: jest.fn(),
}));

describe("sessionSelectionService", () => {
  let mockDb: any;
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.4);
    jest.useFakeTimers().setSystemTime(new Date("2025-08-17T12:00:00.000Z"));
  });

  afterEach(() => {
    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  /**
   * Vérifie que pickRandomEligibleDefi retourne un défi après application des filtres et journalise la proposition.
   */
  it("pickRandomEligibleDefi retourne un défi filtré et journalise", async () => {
    // 1) Âge moyen des participants
    // SELECT id, birthdate FROM children WHERE id IN (?,?)
    mockDb.getAllAsync.mockResolvedValueOnce([
      { id: 10, birthdate: "2015-01-01" },
      { id: 11, birthdate: "2013-01-01" },
    ]);

    // 2) Défis déjà réalisés (fenêtre lookback)
    // SELECT DISTINCT defi_id FROM defi_history WHERE family_id = ? AND completed_at >= ?
    mockDb.getAllAsync.mockResolvedValueOnce([]); // aucun défi fait récemment

    // 3) Défis custom pour la famille
    // SELECT ... FROM defi_custom WHERE family_id = ?
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        id: 1,
        family_id: 1,
        title: "Défi court intérieur",
        category: "ludique",
        location: "interieur",
        duration_min: 10,
        points_default: 5,
        age_min: 5,
        age_max: 20,
      },
      {
        id: 2,
        family_id: 1,
        title: "Défi trop long",
        category: "ludique",
        location: "interieur",
        duration_min: 60,
        points_default: 10,
        age_min: 5,
        age_max: 20,
      },
    ]);

    // 4) tableExists('defi_default') -> vrai
    // SELECT name FROM sqlite_master WHERE type='table' AND name=?
    mockDb.getAllAsync.mockResolvedValueOnce([{ name: "defi_default" }]);

    // 5) SELECT ... FROM defi_default;
    mockDb.getAllAsync.mockResolvedValueOnce([]); // pas de defaults

    const result = await pickRandomEligibleDefi({
      familyId: 1,
      childIds: [10, 11],
      type: "random",
      location: "interieur",
      plannedDurationMin: 30,
      category: "ludique",
      lookbackDays: 30,
    } as any);

    expect(result?.id).toBe(1);
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        log_type: "defi",
        level: "info",
        context: "Défi proposé (random)",
        ref_id: "1",
      })
    );
  });

  /**
   * Vérifie que pickRandomEligibleDefi renvoie null et journalise s’il n’y a aucun candidat éligible après filtres.
   */
  it("pickRandomEligibleDefi renvoie null et journalise si aucun éligible", async () => {
    // Âge moyen participants
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 10, birthdate: "2020-01-01" }]); // ~5 ans

    // Défis déjà faits (vide)
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    // Défis custom (tous hors tranche d’âge)
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        id: 1,
        family_id: 1,
        title: "Hors âge",
        category: "ludique",
        location: "interieur",
        duration_min: 10,
        age_min: 8,
        age_max: 12,
      },
    ]);

    // tableExists('defi_default') -> vrai
    mockDb.getAllAsync.mockResolvedValueOnce([{ name: "defi_default" }]);
    // defaults vides
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    const res = await pickRandomEligibleDefi({
      familyId: 1,
      childIds: [10],
      type: "random",
      location: "interieur",
      plannedDurationMin: 15,
      category: "ludique",
      lookbackDays: 30,
    } as any);

    expect(res).toBeNull();
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Aucun défi éligible (random)",
        log_type: "defi",
        level: "info",
      })
    );
  });

  /**
   * Vérifie que buildEligibleBundle respecte Σ(duration) ≤ target et borne à 12, puis journalise le bundle.
   */
  it("buildEligibleBundle compose un bundle sous la durée cible et journalise", async () => {
    // Âge moyen
    mockDb.getAllAsync.mockResolvedValueOnce([
      { id: 10, birthdate: "2015-01-01" },
      { id: 11, birthdate: "2013-01-01" },
    ]);

    // Défis déjà faits (vide)
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    // Défis custom (tous ≤ target après filtration)
    mockDb.getAllAsync.mockResolvedValueOnce([
      { id: 1, family_id: 1, title: "5 min", category: "ludique", location: "interieur", duration_min: 5, age_min: 5, age_max: 20 },
      { id: 2, family_id: 1, title: "8 min", category: "ludique", location: "interieur", duration_min: 8, age_min: 5, age_max: 20 },
      { id: 3, family_id: 1, title: "10 min", category: "ludique", location: "interieur", duration_min: 10, age_min: 5, age_max: 20 },
    ]);

    // tableExists('defi_default') -> vrai
    mockDb.getAllAsync.mockResolvedValueOnce([{ name: "defi_default" }]);
    // defaults vides
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    const bundle = await buildEligibleBundle(
      {
        familyId: 1,
        childIds: [10, 11],
        type: "bundle",
        location: "interieur",
        plannedDurationMin: 15, // target
        category: "ludique",
        lookbackDays: 30,
      } as any,
      12
    );

    const sum = bundle.reduce((acc, d: any) => acc + (d.duration_min || 0), 0);
    expect(sum).toBeLessThanOrEqual(15);
    expect(bundle.length).toBeGreaterThanOrEqual(1);
    expect(bundle.length).toBeLessThanOrEqual(12);

    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Bundle de défis (Σ durée ≤ target, cap 12)",
        log_type: "defi",
        level: "info",
      })
    );
  });

  /**
   * Vérifie que buildEligibleBundle retourne un ensemble aléatoire borné si la durée cible est absente, puis journalise le fallback.
   */
  it("buildEligibleBundle sans durée cible applique le fallback aléatoire borné et journalise", async () => {
    // Âge moyen
    mockDb.getAllAsync.mockResolvedValueOnce([{ id: 10, birthdate: "2014-01-01" }]);

    // Défis déjà faits (vide)
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    // Pool de candidats (tous > 0)
    mockDb.getAllAsync.mockResolvedValueOnce([
      { id: 1, family_id: 1, title: "A", category: "ludique", location: "interieur", duration_min: 5, age_min: 5, age_max: 20 },
      { id: 2, family_id: 1, title: "B", category: "ludique", location: "interieur", duration_min: 7, age_min: 5, age_max: 20 },
      { id: 3, family_id: 1, title: "C", category: "ludique", location: "interieur", duration_min: 9, age_min: 5, age_max: 20 },
    ]);

    // tableExists('defi_default') -> vrai
    mockDb.getAllAsync.mockResolvedValueOnce([{ name: "defi_default" }]);
    // defaults vides
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    const bundle = await buildEligibleBundle(
      {
        familyId: 1,
        childIds: [10],
        type: "bundle",
        location: "interieur",
        plannedDurationMin: undefined, // pas de target -> fallback
        category: "ludique",
        lookbackDays: 30,
      } as any,
      5
    );

    expect(bundle.length).toBeGreaterThanOrEqual(1);
    expect(bundle.length).toBeLessThanOrEqual(5);
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Bundle (fallback sans durée cible)",
        log_type: "defi",
        level: "info",
      })
    );
  });
});