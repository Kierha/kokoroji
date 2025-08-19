/**
 * Tests unitaires pour la fonction checkAndPurgeLogs.
 * Vérifie le déclenchement conditionnel de la purge des logs anciens.
 */

import { checkAndPurgeLogs } from "../src/utils/purgeLogs";
import * as dbModule from "../src/database/db";
import * as logService from "../src/services/logService";

beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation((msg) => {
    if (
      typeof msg === "string" &&
      msg.includes("The global process.env.EXPO_OS is not defined")
    ) {
      return;
    }
    // Affiche les autres warnings normalement
    // @ts-ignore
    return console.warn(msg);
  });
});

describe("checkAndPurgeLogs", () => {
  let mockDb: any;
  let getFirstAsync: jest.Mock;
  let runAsync: jest.Mock;
  let purgeOldLogs: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    getFirstAsync = jest.fn();
    runAsync = jest.fn();
    mockDb = { getFirstAsync, runAsync };
    jest.spyOn(dbModule, "getDatabaseAsync").mockResolvedValue(mockDb);

    purgeOldLogs = jest.spyOn(logService, "purgeOldLogs").mockResolvedValue();

    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
  });

  /**
   * Vérifie que la purge est lancée si aucun flag n’existe.
   */
  it("lance la purge si le flag n’existe pas", async () => {
    getFirstAsync.mockResolvedValue(null); // Pas de flag enregistré
    await checkAndPurgeLogs(42);
    expect(purgeOldLogs).toHaveBeenCalledWith(42);
    expect(runAsync).toHaveBeenCalled(); // Enregistrement du nouveau flag
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Purge journalière effectuée"));
  });

  /**
   * Vérifie que la purge est lancée si la date enregistrée est différente d’aujourd’hui.
   */
  it("lance la purge si la date du flag est différente d’aujourd’hui", async () => {
    // Date d’hier
    const yesterday = new Date(Date.now() - 86400_000).toISOString();
    getFirstAsync.mockResolvedValue({ value: yesterday });
    await checkAndPurgeLogs();
    expect(purgeOldLogs).toHaveBeenCalledWith(30);
    expect(runAsync).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Purge journalière effectuée"));
  });

  /**
   * Vérifie que la purge n’est pas lancée si la date enregistrée est celle d’aujourd’hui.
   */
  it("ne purge pas si la date du flag est aujourd’hui", async () => {
    const now = new Date().toISOString();
    getFirstAsync.mockResolvedValue({ value: now });
    await checkAndPurgeLogs();
    expect(purgeOldLogs).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Purge déjà effectuée aujourd’hui"));
  });
});
