
import { openDatabaseAsync } from "expo-sqlite";
import { DB_SCHEMA_QUERIES } from "./init";


// Singleton pour la connexion à la base locale SQLite
let dbInstance: any = null;


/**
 * Retourne une instance unique de la base SQLite locale (async).
 * @returns Promise<SQLiteDatabase>
 */
export async function getDatabaseAsync() {
  if (!dbInstance) {
    dbInstance = await openDatabaseAsync("kokoroji.db");
  }
  return dbInstance;
}


/**
 * Initialise le schéma de la base locale (création des tables si besoin).
 * Exécute chaque requête de création définie dans DB_SCHEMA_QUERIES.
 * @returns Promise<void>
 */
export async function initializeDatabase() {
  const db = await getDatabaseAsync();
  for (const query of DB_SCHEMA_QUERIES) {
    await db.execAsync(query);
  }
}
