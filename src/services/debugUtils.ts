import * as FileSystem from "expo-file-system";

/**
 * Supprime le fichier local de la base SQLite Kokoroji.
 * Utilisé principalement en mode debug/dev pour réinitialiser la base locale.
 *
 * @returns Promise<void> - Résolution lorsqu'effacement terminé.
 * @throws Erreur si la suppression échoue.
 */
export async function deleteDatabase(): Promise<void> {
    const dbName = "kokoroji.db"; 
    const dbUri = `${FileSystem.documentDirectory}SQLite/${dbName}`;
    try {
        await FileSystem.deleteAsync(dbUri, { idempotent: true });
        console.log("Base SQLite supprimée (fichier)", dbUri);
    } catch (err) {
        console.error("Erreur suppression base :", err);
        throw err;
    }
}
