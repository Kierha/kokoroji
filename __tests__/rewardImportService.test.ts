/**
 * Tests unitaires pour le service rewardImportService.
 * Vérifie la récupération des récompenses par défaut depuis Supabase,
 * l'importation en base SQLite avec transaction,
 * et la logique de proposition/import avec gestion des callbacks.
 */

import {
  fetchDefaultRewardsFromSupabase,
  importDefaultRewards,
  proposeAndImportDefaultRewardsCloud,
} from "../src/services/rewardImportService";
import { getDatabaseAsync } from "../src/database/db";
import { supabase } from "../src/services/supabaseClient";
import { getRewardsImportedFlag, setRewardsImportedFlag } from "../src/services/settingsFlagsService";

jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));
jest.mock("../src/services/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));
jest.mock("../src/services/settingsFlagsService", () => ({
  getRewardsImportedFlag: jest.fn(),
  setRewardsImportedFlag: jest.fn(),
}));

describe("rewardImportService", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    (getDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
  });

  describe("fetchDefaultRewardsFromSupabase", () => {
    /**
     * Vérifie que les données sont correctement formatées en sortie.
     */
    it("retourne des récompenses formatées", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { title: "R1", description: "Desc", points_required: 10, category: "Cat" },
          ],
          error: null,
        }),
      });

      const results = await fetchDefaultRewardsFromSupabase();
      expect(results).toEqual([
        {
          title: "R1",
          description: "Desc",
          cost: 10,
          category: "Cat",
          created_by: "system",
        },
      ]);
    });

    /**
     * Vérifie qu'une erreur Supabase renvoie un tableau vide.
     */
    it("retourne [] en cas d'erreur Supabase", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("fail"),
        }),
      });

      const results = await fetchDefaultRewardsFromSupabase();
      expect(results).toEqual([]);
    });
  });

  describe("importDefaultRewards", () => {
    /**
     * Vérifie l'insertion et le commit de la transaction.
     */
    it("insère les récompenses et commit", async () => {
      await importDefaultRewards(1, [{ title: "R" }]);

      expect(mockDb.execAsync).toHaveBeenCalledWith("BEGIN TRANSACTION;");
      expect(mockDb.runAsync).toHaveBeenCalled();
      expect(mockDb.execAsync).toHaveBeenCalledWith("COMMIT;");
    });

    /**
     * Vérifie qu'un rollback est effectué en cas d'erreur.
     */
    it("rollback si erreur", async () => {
      mockDb.runAsync.mockRejectedValue(new Error("fail"));

      await expect(importDefaultRewards(1, [{ title: "R" }])).rejects.toThrow("fail");
      expect(mockDb.execAsync).toHaveBeenCalledWith("ROLLBACK;");
    });
  });

  describe("proposeAndImportDefaultRewardsCloud", () => {
    /**
     * Ne fait rien si déjà importé.
     */
    it("retourne false si flag déjà importé", async () => {
      (getRewardsImportedFlag as jest.Mock).mockResolvedValue(true);
      const result = await proposeAndImportDefaultRewardsCloud(1);
      expect(result).toBe(false);
    });

    /**
     * Importe et appelle onImportSuccess si tout va bien.
     */
    it("importe et appelle onImportSuccess", async () => {
      (getRewardsImportedFlag as jest.Mock).mockResolvedValue(false);
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ title: "R", description: "", points_required: 5, category: "" }],
          error: null,
        }),
      });

      const onImportStart = jest.fn();
      const onImportSuccess = jest.fn();
      const onImportCancel = jest.fn();

      const result = await proposeAndImportDefaultRewardsCloud(1, {
        onImportStart,
        onImportSuccess,
        onImportCancel,
      });

      expect(onImportStart).toHaveBeenCalled();
      expect(onImportSuccess).toHaveBeenCalled();
      expect(onImportCancel).not.toHaveBeenCalled();
      expect(setRewardsImportedFlag).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    /**
     * Annule si aucune récompense par défaut n'est trouvée.
     */
    it("annule si liste vide", async () => {
      (getRewardsImportedFlag as jest.Mock).mockResolvedValue(false);
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const onImportCancel = jest.fn();
      const result = await proposeAndImportDefaultRewardsCloud(1, { onImportCancel });

      expect(onImportCancel).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    /**
     * Annule si une erreur survient.
     */
    it("annule en cas d'erreur", async () => {
      (getRewardsImportedFlag as jest.Mock).mockResolvedValue(false);
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error("fail");
      });

      const onImportCancel = jest.fn();
      const result = await proposeAndImportDefaultRewardsCloud(1, { onImportCancel });

      expect(onImportCancel).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
