import { getDatabaseAsync } from "../database/db";
import { Family } from "../models/family";
import { Child } from "../models/child";

/**
 * Échappe les quotes simples dans une chaîne pour éviter les injections SQL.
 * @param value Valeur à échapper
 * @returns Valeur échappée
 */
function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Mappe une ligne SQL au modèle Family.
 * @param row Ligne SQL brute
 * @returns Objet Family
 */
function mapFamily(row: any): Family {
  return {
    id: row.id,
    name: row.name,
    parentName: row.parent_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Mappe une ligne SQL au modèle Child.
 * @param row Ligne SQL brute
 * @returns Objet Child
 */
function mapChild(row: any): Child {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    birthdate: row.birthdate,
    avatar: row.avatar ?? "🧒", // Valeur par défaut si avatar manquant
    korocoins: row.korocoins ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Crée une nouvelle famille en base locale.
 * @param name Nom de la famille
 * @param parentName Prénom du parent référent
 * @returns ID de la famille créée
 */
export async function createFamily(name: string, parentName: string): Promise<number> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeParent = escapeSql(parentName);

    await db.runAsync(`INSERT INTO family (name, parent_name) VALUES (?, ?);`, [safeName, safeParent]);
    const result = await db.getFirstAsync(`SELECT last_insert_rowid() as id;`);
    if (!result?.id) throw new Error("Insertion famille échouée");
    return result.id;
  } catch (error) {
    console.error("[onboardingService] createFamily error:", error);
    throw error;
  }
}

/**
 * Ajoute un enfant à une famille existante.
 * @param familyId ID de la famille
 * @param name Prénom de l'enfant
 * @param birthdate Date de naissance (format ISO)
 * @param avatar Avatar (emoji ou chemin) optionnel
 * @param korocoins Solde initial de Korocoins, par défaut 0
 * @returns ID de l'enfant créé
 */
export async function addChild(
  familyId: number,
  name: string,
  birthdate: string,
  avatar?: string,
  korocoins: number = 0
): Promise<number> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeBirthdate = escapeSql(birthdate);
    const safeAvatar = avatar ? escapeSql(avatar) : null;

    await db.runAsync(
      `INSERT INTO children (family_id, name, birthdate, avatar, korocoins) VALUES (?, ?, ?, ?, ?);`,
      [familyId, safeName, safeBirthdate, safeAvatar, korocoins]
    );
    const result = await db.getFirstAsync(`SELECT last_insert_rowid() as id;`);
    if (!result?.id) throw new Error("Insertion enfant échouée");
    return result.id;
  } catch (error) {
    console.error("[onboardingService] addChild error:", error);
    throw error;
  }
}

/**
 * Met à jour le flag indiquant que l'onboarding est terminé.
 * @param done true si terminé, false sinon (défaut true)
 */
export async function setOnboardingDone(done: boolean = true): Promise<void> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_flags (key, value) VALUES ('onboarding_done', ?);`,
      [done ? "1" : "0"]
    );
  } catch (error) {
    console.error("[onboardingService] setOnboardingDone error:", error);
    throw error;
  }
}

/**
 * Vérifie si l'onboarding est terminé.
 * @returns true si terminé, sinon false
 */
export async function isOnboardingDone(): Promise<boolean> {
  try {
    const db = await getDatabaseAsync();
    const result = await db.getFirstAsync(`SELECT value FROM app_flags WHERE key = 'onboarding_done';`);
    return result?.value === "1";
  } catch (error) {
    console.error("[onboardingService] isOnboardingDone error:", error);
    return false;
  }
}

/**
 * Récupère la dernière famille enregistrée.
 * @returns Objet Family ou null si aucune
 */
export async function getFamily(): Promise<Family | null> {
  try {
    const db = await getDatabaseAsync();
    const result = await db.getFirstAsync(`SELECT * FROM family ORDER BY id DESC LIMIT 1;`);
    return result ? mapFamily(result) : null;
  } catch (error) {
    console.error("[onboardingService] getFamily error:", error);
    return null;
  }
}

/**
 * Récupère les enfants d'une famille par son ID.
 * @param familyId ID de la famille
 * @returns Liste des enfants (Child[])
 */
export async function getChildren(familyId: number): Promise<Child[]> {
  try {
    const db = await getDatabaseAsync();
    const results = await db.getAllAsync(`SELECT * FROM children WHERE family_id = ?;`, [familyId]);
    return Array.isArray(results) ? results.map(mapChild) : [];
  } catch (error) {
    console.error("[onboardingService] getChildren error:", error);
    return [];
  }
}

/**
 * Réinitialise le flag d'onboarding (usage debug/dev).
 */
export async function resetOnboardingFlag(): Promise<void> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync(`DELETE FROM app_flags WHERE key = 'onboarding_done';`);
  } catch (error) {
    console.error("[onboardingService] resetOnboardingFlag error:", error);
    throw error;
  }
}

/**
 * Récupère le prénom du parent référent (depuis la dernière famille).
 * @returns Prénom ou "Utilisateur" par défaut
 */
export async function getParentName(): Promise<string> {
  const family = await getFamily();
  return family?.parentName || "Utilisateur";
}

/**
 * Met à jour les informations d'une famille existante.
 * @param id ID de la famille
 * @param name Nouveau nom du foyer
 * @param parentName Nouveau prénom du parent référent
 */
export async function updateFamily(id: number, name: string, parentName: string): Promise<void> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeParent = escapeSql(parentName);

    await db.runAsync(
      `UPDATE family SET name = ?, parent_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [safeName, safeParent, id]
    );
  } catch (error) {
    console.error("[onboardingService] updateFamily error:", error);
    throw error;
  }
}

/**
 * Supprime un enfant ainsi que ses données associées (sessions, récompenses, résultats).
 * @param childId ID de l'enfant à supprimer
 */
export async function deleteChildAndData(childId: number): Promise<void> {
  const db = await getDatabaseAsync();
  try {
    await db.runAsync(`DELETE FROM sessions WHERE child_id = ?;`, [childId]).catch((err: any) => {
      if (!err.message.includes("no such table")) throw err;
    });
    await db.runAsync(`DELETE FROM rewards WHERE child_id = ?;`, [childId]).catch((err: any) => {
      if (!err.message.includes("no such table")) throw err;
    });
    await db.runAsync(`DELETE FROM challenge_results WHERE child_id = ?;`, [childId]).catch((err: any) => {
      if (!err.message.includes("no such table")) throw err;
    });

    await db.runAsync(`DELETE FROM children WHERE id = ?;`, [childId]);
  } catch (error) {
    console.error("[onboardingService] deleteChildAndData error:", error);
    throw error;
  }
}

/**
 * Met à jour un enfant existant avec les nouvelles valeurs.
 * @param childId ID de l'enfant
 * @param name Nouveau prénom
 * @param birthdate Nouvelle date de naissance (ISO)
 * @param avatar Nouveau avatar (optionnel)
 * @param korocoins Nouveau solde de Korocoins (par défaut 0)
 */
export async function updateChild(
  childId: number,
  name: string,
  birthdate: string,
  avatar?: string,
  korocoins: number = 0
): Promise<void> {
  try {
    const db = await getDatabaseAsync();
    const safeName = escapeSql(name);
    const safeBirthdate = escapeSql(birthdate);
    const safeAvatar = avatar ? escapeSql(avatar) : null;

    await db.runAsync(
      `UPDATE children SET name = ?, birthdate = ?, avatar = ?, korocoins = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [safeName, safeBirthdate, safeAvatar, korocoins, childId]
    );
  } catch (error) {
    console.error("[onboardingService] updateChild error:", error);
    throw error;
  }
}
