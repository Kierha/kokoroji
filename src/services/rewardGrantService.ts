import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";

/**
 * Résultat d'attribution de récompense.
 */
export interface GrantRewardResult {
  rewardId: number;
  cost: number;
  childImpacts: { childId: number; oldBalance: number; newBalance: number }[];
  historyId?: number;
}

/**
 * Attribue une récompense à une liste d'enfants :
 *  - Vérifie que chaque enfant dispose d'un solde suffisant (mode cumulatif : on additionne les soldes)
 *  - Débite le coût total réparti proportionnellement (stratégie simple : coût total appliqué une seule fois, retiré en parts égales)
 *  - Insère une ligne dans reward_history
 *  - Insère des lignes négatives dans coins_history (débit)
 *  - Met à jour le champ korocoins des enfants
 *  NB: Stratégie simplifiée : si coût non divisible, le reliquat est retiré aux premiers enfants.
 */
export async function grantReward(
  params: {
    familyId: number;
    rewardId: number;
    cost: number;
    childIds: number[];
    actor?: string;
    sessionId?: number | null;
  }
): Promise<GrantRewardResult> {
  const { familyId, rewardId, cost, childIds, actor, sessionId } = params;
  if (!familyId) throw new Error("familyId manquant");
  if (!rewardId) throw new Error("rewardId manquant");
  if (!Array.isArray(childIds) || childIds.length === 0) throw new Error("Aucun enfant sélectionné");
  if (cost <= 0) throw new Error("Cost doit être > 0");

  const db = await getDatabaseAsync();
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    // Récupère soldes actuels
    const placeholders = childIds.map(() => "?").join(",");
    const rows = await db.getAllAsync(
      `SELECT id, korocoins FROM children WHERE id IN (${placeholders}) AND id IS NOT NULL;`,
      childIds.map(String)
    );
    const balances: Record<number, number> = {};
    for (const r of rows ?? []) {
      balances[Number(r.id)] = Number(r.korocoins) || 0;
    }

    const totalAvailable = childIds.reduce((s, id) => s + (balances[id] ?? 0), 0);
    if (totalAvailable < cost) {
      throw new Error("Solde insuffisant des enfants sélectionnés");
    }

    // Répartition parts égales
    const base = Math.floor(cost / childIds.length);
    let remainder = cost - base * childIds.length;
    const debitPerChild: Record<number, number> = {};
    for (const id of childIds) {
      debitPerChild[id] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }

    const timestamp = new Date().toISOString();

    // Mise à jour enfants + insertion coins_history (débits négatifs)
    for (const id of childIds) {
      const oldBal = balances[id] ?? 0;
      const debit = debitPerChild[id];
      const newBal = oldBal - debit;
      await db.runAsync(
        `UPDATE children SET korocoins = ? , updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [String(newBal), String(id)]
      );
      await db.runAsync(
        `INSERT INTO coins_history (family_id, child_id, session_id, defi_id, amount, reason, created_at, created_by, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          String(familyId),
          String(id),
          sessionId != null ? String(sessionId) : null,
          null,
          String(-debit),
          "Récompense utilisée",
          timestamp,
          actor ?? null,
        ]
      );
    }

    // Ajout reward_history (children_ids JSON)
    const res = await db.runAsync(
      `INSERT INTO reward_history (reward_id, family_id, children_ids, session_id, received_at, received_by, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      [
        String(rewardId),
        String(familyId),
        JSON.stringify(childIds),
        sessionId != null ? String(sessionId) : null,
        timestamp,
        actor ?? null,
      ]
    );

    await addLog({
      timestamp,
      family_id: String(familyId),
      child_ids: JSON.stringify(childIds.map(String)),
      log_type: "reward_granted",
      level: "info",
      context: "Attribution de récompense (grantReward)",
      details: JSON.stringify({ reward_id: rewardId, cost, child_count: childIds.length }),
      ref_id: String(rewardId),
      is_synced: 0,
    });

    await db.execAsync("COMMIT;");

    return {
      rewardId,
      cost,
      historyId: res?.lastInsertRowId,
      childImpacts: childIds.map((id) => {
        const oldBal = balances[id] ?? 0;
        return { childId: id, oldBalance: oldBal, newBalance: oldBal - debitPerChild[id] };
      }),
    };
  } catch (err: any) {
    // Assurer rollback avant journalisation (sinon log annulé)
    try { await db.execAsync("ROLLBACK;"); } catch {}
    try {
      await addLog({
        timestamp: new Date().toISOString(),
        family_id: String(familyId),
        child_ids: JSON.stringify(childIds.map(String)),
        log_type: "reward_granted",
        level: "error",
        context: "Echec attribution récompense (grantReward)",
        details: JSON.stringify({ reward_id: rewardId, cost, message: err?.message || String(err) }),
        ref_id: String(rewardId),
        is_synced: 0,
      });
    } catch {}
    throw err;
  }
}
