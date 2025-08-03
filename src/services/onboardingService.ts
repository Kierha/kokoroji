import { getDatabaseAsync } from "../database/db";
import { Family } from "../models/family";
import { Child } from "../models/child";

/**
 * Fonction utilitaire pour échapper les quotes SQL dans les valeurs utilisateur.
 * @param value Valeur à échapper
 * @returns string échappée
 */
function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function mapFamily(row: any): Family {
  return {
    id: row.id,
    name: row.name,
    parentName: row.parent_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChild(row: any): Child {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    birthdate: row.birthdate,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Ajoute une nouvelle famille à la BDD locale et retourne son id.
 * @param name Nom du foyer
 * @param parentName Prénom du parent référent
 * @returns id de la famille créée
 */
export async function createFamily(name: string, parentName: string): Promise<number> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeParent = escapeSql(parentName);

    await db.runAsync(`INSERT INTO family (name, parent_name) VALUES (?, ?);`, [safeName, safeParent]);
    const result = await db.getFirstAsync(`SELECT last_insert_rowid() as id;`);
    if (!result || !result.id) {
      throw new Error("Résultat insert family vide ou mal formé");
    }
    return result.id;
  } catch (error) {
    console.error("[onboardingService] createFamily error:", error);
    throw error;
  }
}

/**
 * Ajoute un enfant à la famille (par id) en BDD locale.
 * @param familyId id de la famille
 * @param name Prénom de l'enfant
 * @param birthdate Date de naissance (ISO)
 * @param avatar Emoji ou image d'avatar (optionnel)
 * @returns id de l'enfant créé
 */
export async function addChild(familyId: number, name: string, birthdate: string, avatar?: string): Promise<number> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeBirthdate = escapeSql(birthdate);
    const safeAvatar = avatar ? escapeSql(avatar) : null;
    await db.runAsync(
      `INSERT INTO children (family_id, name, birthdate, avatar) VALUES (?, ?, ?, ?);`,
      [familyId, safeName, safeBirthdate, safeAvatar]
    );
    const result = await db.getFirstAsync(`SELECT last_insert_rowid() as id;`);
    if (!result || !result.id) {
      throw new Error("Résultat insert enfant vide ou mal formé");
    }
    return result.id;
  } catch (error) {
    console.error("[onboardingService] addChild error:", error);
    throw error;
  }
}

/**
 * Met à jour le flag d'onboarding en BDD locale.
 * @param done true si onboarding terminé, false sinon
 * @returns Promise<void>
 */
export async function setOnboardingDone(done: boolean = true): Promise<void> {
    try {
        const db = await getDatabaseAsync();
        await db.runAsync(`INSERT OR REPLACE INTO app_flags (key, value) VALUES ('onboarding_done', ?);`, [done ? "1" : "0"]);
    } catch (error) {
        console.error("[onboardingService] setOnboardingDone error:", error);
        throw error;
    }
}


/**
 * Vérifie si l'onboarding est terminé en BDD locale.
 * @returns true si terminé, false sinon
 */
export async function isOnboardingDone(): Promise<boolean> {
  try {
    const db = await getDatabaseAsync();
    const result = await db.getFirstAsync(
      `SELECT value FROM app_flags WHERE key = 'onboarding_done';`
    );
    return result?.value === "1";
  } catch (error) {
    console.error("[onboardingService] isOnboardingDone error:", error);
    return false;
  }
}

/**
 * Récupère la dernière famille ajoutée (utilisé pour retrouver la famille au redémarrage).
 * @returns Famille ou null
 */
export async function getFamily(): Promise<Family | null> {
  try {
    const db = await getDatabaseAsync();
    const result = await db.getFirstAsync(
      `SELECT * FROM family ORDER BY id DESC LIMIT 1;`
    );
    if (!result) {
      return null;
    }
    return mapFamily(result);
  } catch (error) {
    console.error("[onboardingService] getFamily error:", error);
    return null;
  }
}

/**
 * Récupère la liste des enfants d'une famille donnée (par id).
 * @param familyId id de la famille
 * @returns Liste des enfants
 */
export async function getChildren(familyId: number): Promise<Child[]> {
  try {
    const db = await getDatabaseAsync();
    const results = await db.getAllAsync(
      `SELECT * FROM children WHERE family_id = ?;`,
      [familyId]
    );
    if (!results || !Array.isArray(results)) {
      return [];
    }
    return results.map(mapChild);
  } catch (error) {
    console.error("[onboardingService] getChildren error:", error);
    return [];
  }
}


/**
 * Réinitialise le flag d'onboarding (debug/dev uniquement).
 * @returns Promise<void>
 */
export async function resetOnboardingFlag(): Promise<void> {
    try {
        const db = await getDatabaseAsync();
        await db.runAsync(`DELETE FROM app_flags WHERE key = 'onboarding_done';`);
    } catch (error) {
        throw error;
    }
}
