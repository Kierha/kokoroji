/**
 * Tests unitaires du service logService.
 * Vérifie les opérations CRUD sur les logs (ajout, récupération, mise à jour, purge).
 */

import * as logService from "../src/services/logService";
import { AppLog } from "../src/services/logService";

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

// Mock de la base de données
jest.mock("../src/database/db", () => ({
  getDatabaseAsync: jest.fn()
}));

const runAsync = jest.fn();
const getAllAsync = jest.fn();

beforeEach(() => {
  runAsync.mockReset();
  getAllAsync.mockReset();
  (require("../src/database/db").getDatabaseAsync as jest.Mock).mockResolvedValue({
    runAsync,
    getAllAsync,
  });
});

// Log de test minimaliste
const log: AppLog = {
  timestamp: "2025-08-04T13:23:00Z",
  family_id: "fam_123",
  child_ids: JSON.stringify(["child_1"]),
  log_type: "session",
  level: "info",
  context: "Session créée",
  details: JSON.stringify({ location: "maison" }),
  ref_id: "session_5678",
  is_synced: 0,
  device_info: "Android 13",
};

describe("logService", () => {
  /**
   * Vérifie l'insertion d'un log avec les bons paramètres.
   */
  describe("addLog", () => {
    it("insère un log avec les bons paramètres", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await logService.addLog(log);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO app_logs"),
        [
          log.timestamp,
          log.family_id,
          log.child_ids,
          log.log_type,
          log.level,
          log.context,
          log.details,
          log.ref_id,
          log.is_synced,
          log.device_info,
        ]
      );
    });
  });

  /**
   * Vérifie la récupération des logs avec et sans filtres.
   */
  describe("getLogs", () => {
    it("récupère tous les logs sans filtre", async () => {
      getAllAsync.mockResolvedValueOnce([log]);
      const result = await logService.getLogs();
      expect(getAllAsync).toHaveBeenCalled();
      expect(result).toEqual([log]);
    });

    it("filtre par log_type", async () => {
      getAllAsync.mockResolvedValueOnce([log]);
      await logService.getLogs({ log_type: "session" });
      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("log_type = ?"),
        expect.arrayContaining(["session"])
      );
    });

    it("filtre par is_synced", async () => {
      getAllAsync.mockResolvedValueOnce([log]);
      await logService.getLogs({ is_synced: 0 });
      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("is_synced = ?"),
        expect.arrayContaining([0])
      );
    });

    it("filtre par child_id", async () => {
      getAllAsync.mockResolvedValueOnce([log]);
      await logService.getLogs({ child_id: "child_1" });
      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("child_ids LIKE ?"),
        expect.arrayContaining(["%child_1%"])
      );
    });
  });

  /**
   * Vérifie la récupération des logs non synchronisés uniquement.
   */
  describe("getPendingLogs", () => {
    it("récupère uniquement les logs non synchronisés", async () => {
      getAllAsync.mockResolvedValueOnce([log]);
      const result = await logService.getPendingLogs();
      expect(result).toEqual([log]);
      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("is_synced = ?"),
        [0]
      );
    });
  });

  /**
   * Vérifie la mise à jour d'un log unique en tant que synchronisé.
   */
  describe("markLogAsSynced", () => {
    it("met à jour is_synced pour un log unique", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await logService.markLogAsSynced(42);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE app_logs SET is_synced = 1 WHERE id = ?"),
        [42]
      );
    });
  });

  /**
   * Vérifie la mise à jour en batch des logs synchronisés.
   */
  describe("markLogsAsSynced", () => {
    it("met à jour is_synced pour plusieurs logs", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await logService.markLogsAsSynced([1, 2, 3]);
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("IN (?,?,?)"),
        [1, 2, 3]
      );
    });

    it("ne fait rien si la liste est vide", async () => {
      await logService.markLogsAsSynced([]);
      expect(runAsync).not.toHaveBeenCalled();
    });
  });

  /**
   * Vérifie la suppression des logs plus anciens que la durée spécifiée.
   */
  describe("purgeOldLogs", () => {
    it("supprime les logs trop anciens", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);
      await logService.purgeOldLogs(7);
      const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM app_logs WHERE timestamp < ?"),
        [cutoff]
      );
      (Date.now as jest.Mock).mockRestore();
    });
  });

  /**
   * Vérifie la suppression complète des logs (fonction debug).
   */
  describe("clearLogs", () => {
    it("supprime tous les logs", async () => {
      runAsync.mockResolvedValueOnce(undefined);
      await logService.clearLogs();
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM app_logs"),
      );
    });
  });
});
