/**
 * Tests unitaires du service rewardGrantService (grantReward).
 * Couvre le scénario nominal, l'erreur de solde insuffisant et la répartition d'un coût non divisible.
 */
import { grantReward } from "../src/services/rewardGrantService";

// Mocks DB + addLog
jest.mock("../src/database/db", () => ({ getDatabaseAsync: jest.fn() }));
jest.mock("../src/services/logService", () => ({ addLog: jest.fn().mockResolvedValue(undefined) }));

const execAsync = jest.fn();
const getAllAsync = jest.fn();
const runAsync = jest.fn();

beforeEach(() => {
  execAsync.mockReset();
  getAllAsync.mockReset();
  runAsync.mockReset();
  (require("../src/database/db").getDatabaseAsync as jest.Mock).mockResolvedValue({ execAsync, getAllAsync, runAsync });
});

describe("rewardGrantService.grantReward", () => {
  /**
   * Happy path : vérifie l'enchaînement transactionnel complet (BEGIN -> opérations -> COMMIT),
   * les insertions (coins_history, reward_history), la mise à jour des soldes enfants et l'agrégation des débits.
   */
  it("répartit le coût, insère history et logs (happy path)", async () => {
    // Soldes enfants : 50 et 70 => total 120, cost 25 OK
    getAllAsync.mockResolvedValueOnce([
      { id: 1, korocoins: 50 },
      { id: 2, korocoins: 70 },
    ]);
    // runAsync pour reward_history retourne un id
    runAsync.mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO reward_history")) {
        return { lastInsertRowId: 555 };
      }
      return undefined;
    });

    const result = await grantReward({ familyId: 10, rewardId: 99, cost: 25, childIds: [1, 2], actor: "parent@test" });

    expect(execAsync).toHaveBeenCalledWith("BEGIN TRANSACTION;");
    expect(execAsync).toHaveBeenCalledWith("COMMIT;");
    // Deux updates children
    const updateCalls = runAsync.mock.calls.filter(c => c[0].includes("UPDATE children"));
    expect(updateCalls.length).toBe(2);
    // Deux inserts coins_history
    const coinsCalls = runAsync.mock.calls.filter(c => c[0].includes("INSERT INTO coins_history"));
    expect(coinsCalls.length).toBe(2);
    // Insert reward_history
    expect(runAsync.mock.calls.some(c => c[0].includes("INSERT INTO reward_history"))).toBe(true);

    expect(result.historyId).toBe(555);
    expect(result.childImpacts).toHaveLength(2);
    const totalDebit = result.childImpacts.reduce((s, ci) => s + (ci.oldBalance - ci.newBalance), 0);
    expect(totalDebit).toBe(25);
  });

  /**
   * Cas d'erreur : solde cumulé insuffisant. Doit lever une exception et effectuer un ROLLBACK.
   */
  it("lance une erreur si solde total insuffisant", async () => {
    getAllAsync.mockResolvedValueOnce([{ id: 1, korocoins: 5 }, { id: 2, korocoins: 6 }]); // total 11 < cost 20
    await expect(
      grantReward({ familyId: 10, rewardId: 99, cost: 20, childIds: [1,2] })
    ).rejects.toThrow(/Solde insuffisant/);
    // Rollback attendu
    expect(execAsync).toHaveBeenCalledWith("ROLLBACK;");
  });

  /**
   * Cas de répartition non divisible : vérifie que le reste est distribué prioritairement aux premiers enfants
   * (politique simple déterministe base + remainder).
   */
  it("répartit correctement un coût non divisible (reste distribué aux premiers)", async () => {
    // Solde suffisant unique (100 chacun)
    getAllAsync.mockResolvedValueOnce([
      { id: 1, korocoins: 100 },
      { id: 2, korocoins: 100 },
      { id: 3, korocoins: 100 },
    ]);
    runAsync.mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO reward_history")) return { lastInsertRowId: 777 };
      return undefined;
    });
    const cost = 10; // 10 / 3 = 3 reste 1 => premier enfant débité 4, autres 3
    const res = await grantReward({ familyId: 5, rewardId: 55, cost, childIds: [1,2,3] });
    // Trouver impacts
    const impacts = res.childImpacts;
    const debits = impacts.map(i => i.oldBalance - i.newBalance).sort((a,b)=>b-a);
    expect(debits).toEqual([4,3,3]);
    const total = debits.reduce((s,d)=>s+d,0);
    expect(total).toBe(cost);
  });
});
