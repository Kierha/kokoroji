/**
 * Tests unitaires pour le service settingsFlagsService.
 * Vérifie la lecture et l'écriture des flags de synchronisation dans la base locale.
 */

import * as settingsFlagsService from "../src/services/settingsFlagsService";

// Mock du module de base de données
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn(),
}));

const getFirstAsync = jest.fn();
const runAsync = jest.fn();

beforeEach(() => {
  getFirstAsync.mockReset();
  runAsync.mockReset();
  (require("../src/database/db").getDatabaseAsync as jest.Mock).mockResolvedValue({
    getFirstAsync,
    runAsync,
  });
});

describe("settingsFlagsService", () => {
  // --- Tests getSyncEnabled ---
  describe("getSyncEnabled", () => {
    /**
     * Retourne true si le flag est "1".
     */
    it("retourne true si flag = 1", async () => {
      getFirstAsync.mockResolvedValueOnce({ value: "1" });
      const res = await settingsFlagsService.getSyncEnabled();
      expect(res).toBe(true);
      expect(getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("SELECT value FROM app_flags"),
        ["sync_enabled"]
      );
    });

    /**
     * Retourne false si le flag est "0".
     */
    it("retourne false si flag = 0", async () => {
      getFirstAsync.mockResolvedValueOnce({ value: "0" });
      const res = await settingsFlagsService.getSyncEnabled();
      expect(res).toBe(false);
    });

    /**
     * Retourne false si le flag est absent ou indéfini.
     */
    it("retourne false si flag absent ou null", async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);
      const res = await settingsFlagsService.getSyncEnabled();
      expect(res).toBe(false);
    });
  });

  // --- Tests setSyncEnabled ---
  describe("setSyncEnabled", () => {
    /**
     * Écrit "1" en base si enabled est true.
     */
    it("écrit le flag à 1 si enabled = true", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await settingsFlagsService.setSyncEnabled(true);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["sync_enabled", "1"]
      );
    });

    /**
     * Écrit "0" en base si enabled est false.
     */
    it("écrit le flag à 0 si enabled = false", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await settingsFlagsService.setSyncEnabled(false);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["sync_enabled", "0"]
      );
    });
  });

  // --- Tests getSyncState ---
  describe("getSyncState", () => {
    /**
     * Retourne un état connu parmi "idle", "syncing", "pending", "never".
     */
    it("retourne la valeur connue ('idle', 'syncing', 'pending', 'never')", async () => {
      for (const state of ["idle", "syncing", "pending", "never"]) {
        getFirstAsync.mockResolvedValueOnce({ value: state });
        const res = await settingsFlagsService.getSyncState();
        expect(res).toBe(state);
      }
    });

    /**
     * Retourne "never" si le flag est absent ou inconnu.
     */
    it("retourne 'never' si flag absent ou valeur inconnue", async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);
      const res1 = await settingsFlagsService.getSyncState();
      expect(res1).toBe("never");

      getFirstAsync.mockResolvedValueOnce({ value: "unknown" });
      const res2 = await settingsFlagsService.getSyncState();
      expect(res2).toBe("never");
    });
  });

  // --- Tests setSyncState ---
  describe("setSyncState", () => {
    /**
     * Écrit l'état de synchronisation en base.
     */
    it("écrit le flag avec la bonne valeur", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await settingsFlagsService.setSyncState("idle");
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["sync_state", "idle"]
      );
    });
  });

  // --- Tests getLastSync ---
  describe("getLastSync", () => {
    /**
     * Retourne une instance Date si la valeur est présente.
     */
    it("retourne un Date si valeur présente", async () => {
      const dateStr = "2025-08-06T13:05:00.000Z";
      getFirstAsync.mockResolvedValueOnce({ value: dateStr });
      const res = await settingsFlagsService.getLastSync();
      expect(res).toBeInstanceOf(Date);
      expect(res?.toISOString()).toBe(dateStr);
    });

    /**
     * Retourne null si aucune valeur en base.
     */
    it("retourne null si valeur absente", async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);
      const res = await settingsFlagsService.getLastSync();
      expect(res).toBeNull();
    });
  });

  // --- Tests setLastSync ---
  describe("setLastSync", () => {
    /**
     * Écrit une date au format ISO en base.
     */
    it("écrit la date au format ISO", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      const d = new Date("2025-08-06T12:00:00Z");
      await settingsFlagsService.setLastSync(d);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["last_sync", d.toISOString()]
      );
    });

    /**
     * Écrit null si la date est nulle.
     */
    it("écrit null si date = null", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await settingsFlagsService.setLastSync(null);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["last_sync", null]
      );
    });
  });

  // --- Tests getLastManualSync ---
  describe("getLastManualSync", () => {
    /**
     * Retourne un nombre si la valeur est présente.
     */
    it("retourne un number si valeur présente", async () => {
      getFirstAsync.mockResolvedValueOnce({ value: "1722947400" });
      const res = await settingsFlagsService.getLastManualSync();
      expect(res).toBe(1722947400);
    });

    /**
     * Retourne null si aucune valeur en base.
     */
    it("retourne null si valeur absente", async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);
      const res = await settingsFlagsService.getLastManualSync();
      expect(res).toBeNull();
    });
  });

  // --- Tests setLastManualSync ---
  describe("setLastManualSync", () => {
    /**
     * Écrit un timestamp sous forme de string en base.
     */
    it("écrit le timestamp comme string", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await settingsFlagsService.setLastManualSync(1722947400);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE"),
        ["last_manual_sync", "1722947400"]
      );
    });
  });
});
