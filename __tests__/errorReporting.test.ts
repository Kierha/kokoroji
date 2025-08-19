/**
 * Tests unitaires pour logAndMaybeReport (errorReporting).
 * Vérifie fallback log_type, conservation extra/level, absence d'envoi Sentry, robustesse en cas d'échec addLog et stringification d'un objet non Error.
 */
/* eslint-env jest */
import { logAndMaybeReport } from "../src/services/errorReporting";

// Mock addLog pour éviter l'accès DB (nom préfixé mock pour Jest)
const mockAddLog = jest.fn().mockResolvedValue(undefined);
jest.mock("../src/services/logService", () => ({ addLog: (...args: any[]) => mockAddLog(...args) }));

describe("errorReporting.logAndMaybeReport", () => {
  beforeEach(() => {
    mockAddLog.mockClear();
    jest.resetModules();
  });

  /**
   * Vérifie la normalisation du log_type vers 'system' lorsque la valeur fournie n'est pas autorisée.
   */
  it("fallback sur log_type system si inconnu", async () => {
    await logAndMaybeReport("CTX", "erreur brute", { logType: "inconnu" as any });
    expect(mockAddLog).toHaveBeenCalledTimes(1);
    const arg = mockAddLog.mock.calls[0][0];
    expect(arg.log_type).toBe("system");
    expect(JSON.parse(arg.details).message).toBe("erreur brute");
  });

  /**
   * Vérifie la conservation d'un log_type valide et l'enregistrement du level + extra dans details.
   */
  it("garde log_type valide et enregistre extra", async () => {
    await logAndMaybeReport("CTX2", new Error("Boom"), { logType: "defi", extra: { foo: 1 }, level: "warning" });
    const arg = mockAddLog.mock.calls[0][0];
    expect(arg.log_type).toBe("defi");
    expect(arg.level).toBe("warning");
    expect(JSON.parse(arg.details)).toMatchObject({ message: "Boom", foo: 1 });
  });

  /**
   * Vérifie que le flag sentry=false n'essaie pas d'appeler Sentry (le mock existe mais n'est pas sollicité).
   */
  it("n'appelle pas Sentry si sentry=false", async () => {
    jest.doMock("sentry-expo", () => ({ Native: { captureException: jest.fn(), withScope: (fn: any) => fn({ setLevel: jest.fn(), setContext: jest.fn() }) } }), { virtual: true });
    await logAndMaybeReport("CTX3", new Error("NoSend"), { logType: "defi", sentry: false });
    expect(mockAddLog).toHaveBeenCalled();
  });


  /**
   * Vérifie la robustesse : l'échec interne de addLog est avalé et ne fait pas échouer la fonction principale.
   */
  it("ignore erreur addLog (swallow)", async () => {
    mockAddLog.mockRejectedValueOnce(new Error("fail"));
    await logAndMaybeReport("CTX5", new Error("X"), { logType: "system" });
    expect(mockAddLog).toHaveBeenCalled();
  });

  /**
   * Vérifie la stringification d'un objet non Error (devient [object Object]) pour details.message.
   */
  it("stringifie un objet non Error", async () => {
    await logAndMaybeReport("CTX6", { foo: 1 } as any, { logType: "debug" });
    const arg = mockAddLog.mock.calls.at(-1)[0];
    expect(JSON.parse(arg.details).message).toBe("[object Object]");
  });
});
