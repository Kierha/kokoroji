import { importDefaultChallenges } from "./challengeService";
import { isChallengesImported, setChallengesImported } from "./settingsFlagsService";
import { supabase } from "./supabaseClient";
import { Defi } from "../models/defi";

/**
 * Formate l'heure courante en chaîne HH:MM:SS.mmm (usage interne).
 */
const ts = () => new Date().toISOString().slice(11, 23);

/**
 * Récupère la liste des défis par défaut depuis Supabase.
 * @returns {Promise<Partial<Defi>[]>} Tableau de défis partiels.
 */
export async function fetchDefaultChallengesFromSupabase(): Promise<Partial<Defi>[]> {
  const { data, error } = await supabase
    .from("challenges_default")
    .select(
      `title, description, category, location,
       duration_min, points_default, photo_required,
       age_min, age_max`
    );

  if (error) {
    console.error(`[${ts()}] [Import] Supabase error:`, error);
    return [];
  }

  return (data ?? []) as Partial<Defi>[];
}

/**
 * Propose à l’utilisateur d’importer la liste de défis par défaut depuis le cloud,
 * puis effectue l’import en base locale si accepté.
 *
 * @param {number} family_id - Identifiant de la famille.
 * @param {object} [callbacks] - Fonctions de rappel pour l’UI.
 * @param {() => void} [callbacks.onImportStart] - Appelée au début de l’import.
 * @param {() => void} [callbacks.onImportSuccess] - Appelée en cas de succès.
 * @param {() => void} [callbacks.onImportCancel] - Appelée si annulation ou échec.
 * @returns {Promise<boolean>} `true` si l’import a été effectué, sinon `false`.
 */
export async function proposeAndImportDefaultChallengesCloud(
  family_id: number,
  {
    onImportStart,
    onImportSuccess,
    onImportCancel,
  }: {
    onImportStart?: () => void;
    onImportSuccess?: () => void;
    onImportCancel?: () => void;
  } = {}
): Promise<boolean> {
  if (await isChallengesImported()) {
    return false;
  }

  onImportStart?.();

  try {
    const defaultChallenges = await fetchDefaultChallengesFromSupabase();

    if (defaultChallenges.length === 0) {
      await setChallengesImported(true);
      onImportCancel?.();
      return false;
    }

    const mapped = defaultChallenges.map(ch => ({
      title: ch.title ?? "",
      description: ch.description ?? "",
      category: ch.category ?? "",
      location: ch.location ?? "",
      duration_min: ch.duration_min ?? undefined,
      points_default: ch.points_default ?? undefined,
      photo_required: ch.photo_required ?? undefined,
      age_min: ch.age_min ?? undefined,
      age_max: ch.age_max ?? undefined,
    }));

    await importDefaultChallenges(family_id, mapped);

    await setChallengesImported(true);
    onImportSuccess?.();
    return true;
  } catch (err) {
    console.error(`[${ts()}] [Import] ERROR:`, err);
    onImportCancel?.();
    return false;
  }
}
