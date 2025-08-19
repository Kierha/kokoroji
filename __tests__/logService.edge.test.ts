/**
 * Tests unitaires edge (cas limites) du service logService (suffixe .edge dédié).
 * Vérifie le comportement par défaut quand les champs optionnels sont omis et le retour DB undefined.
 */
import * as logService from "../src/services/logService";

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

describe("logService edge cases", () => {
  /**
   * Vérifie que addLog insère un enregistrement quand les champs optionnels sont omis
   * et applique les valeurs par défaut (NULL / 0) attendues.
   */
  it("addLog insère avec valeurs par défaut pour champs absents", async () => {
    runAsync.mockResolvedValueOnce(undefined);
    const minimal: any = {
      timestamp: "2025-08-19T10:00:00Z",
      child_ids: "[]",
      log_type: "system",
      level: "info",
      context: "Test minimal",
    };
    await logService.addLog(minimal);
    const args = runAsync.mock.calls[0][1];
    expect(args[1]).toBeNull(); // family_id null
    expect(args[2]).toBe("[]");
    expect(args[7]).toBeNull(); // ref_id null
    expect(args[8]).toBe(0);    // is_synced défaut
    expect(args[9]).toBeNull(); // device_info null
  });

  /**
   * Vérifie que getLogs retourne un tableau vide ([]) si la couche DB renvoie undefined
   * évitant ainsi un crash ou la propagation d'un undefined inattendu.
   */
  it("getLogs retourne [] si DB renvoie undefined", async () => {
    getAllAsync.mockResolvedValueOnce(undefined);
    const res = await logService.getLogs();
    expect(res).toEqual([]);
  });
});
