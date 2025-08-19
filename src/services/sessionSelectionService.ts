import { getDatabaseAsync } from "../database/db";
import { addLog } from "./logService";
import type { SessionConfig } from "../models/sessionConfig";

const DEFAULT_LOOKBACK_DAYS = 30;

type RawChildRow = {
  id: number;
  birthdate: string;
};

type RawDefiRow = {
  id: number | string;
  family_id: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  duration_min?: number | null;
  points_default?: number | null;
  photo_required?: string | null;
  age_min?: number | null;
  age_max?: number | null;
};

const nowIso = () => new Date().toISOString();

/* ------------------ Helpers ------------------ */

function stripAccentsLower(s?: string | null) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ageFromBirthdate(birthdate: string): number {
  const d = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

async function getParticipantsAverageAge(childIds: number[]): Promise<number> {
  if (!childIds?.length) return 0;
  const db = await getDatabaseAsync();
  const placeholders = childIds.map(() => "?").join(",");
  const rows = await db.getAllAsync(
    `SELECT id, birthdate FROM children WHERE id IN (${placeholders});`,
    childIds
  );
  return average((rows as RawChildRow[]).map((c) => ageFromBirthdate(c.birthdate)));
}

/* ------------------ Filtres ------------------ */

function filterByAge(defis: RawDefiRow[], avgAge: number): RawDefiRow[] {
  return defis.filter((d) => {
    const min = typeof d.age_min === "number" ? d.age_min : 0;
    const max = typeof d.age_max === "number" ? d.age_max : 200;
    return avgAge >= min && avgAge <= max;
  });
}

function filterByLocation(defis: RawDefiRow[], location?: string | null): RawDefiRow[] {
  if (!location) return defis;
  const want = stripAccentsLower(location);
  return defis.filter((d) => stripAccentsLower(d.location) === want);
}

function filterByMaxDuration(defis: RawDefiRow[], max?: number | null): RawDefiRow[] {
  if (!max || max <= 0) return defis;
  return defis.filter((d) => (d.duration_min ?? 9999) <= max);
}

function filterByCategory(defis: RawDefiRow[], category?: string | null): RawDefiRow[] {
  if (!category) return defis;
  const want = stripAccentsLower(category);
  return defis.filter((d) => stripAccentsLower(d.category) === want);
}

/* ------------------ Chargement des défis ------------------ */

async function tableExists(name: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`,
    [name]
  );
  return (rows ?? []).length > 0;
}

async function getAllDefisForFamily(familyId: number): Promise<RawDefiRow[]> {
  const db = await getDatabaseAsync();

  const custom = (await db.getAllAsync(
    `SELECT id, family_id, title, description, category, location, duration_min, points_default, photo_required, age_min, age_max
     FROM defi_custom WHERE family_id = ?;`,
    [String(familyId)]
  )) as RawDefiRow[];

  let defaults: RawDefiRow[] = [];
  if (await tableExists("defi_default")) {
    defaults = (await db.getAllAsync(
      `SELECT id, NULL as family_id, title, description, category, location, duration_min, points_default, photo_required, age_min, age_max
       FROM defi_default;`
    )) as RawDefiRow[];
  } else if (await tableExists("defi")) {
    defaults = (await db.getAllAsync(
      `SELECT id, NULL as family_id, title, description, category, location, duration_min, points_default, photo_required, age_min, age_max
       FROM defi;`
    )) as RawDefiRow[];
  }

  const map = new Map<string, RawDefiRow>();
  for (const d of defaults) map.set(String(d.id), d);
  for (const d of custom) map.set(String(d.id), d);
  return Array.from(map.values());
}

/* ------------------ Sélection des défis ------------------ */

async function getNotDoneDefisForFamily(params: {
  familyId: number;
  lookbackDays: number;
  location?: string | null;
  maxDurationMin?: number | null;
  category?: string | null;
}): Promise<RawDefiRow[]> {
  const db = await getDatabaseAsync();

  const since = new Date(Date.now() - params.lookbackDays * 24 * 3600 * 1000).toISOString();
  const doneRows = await db.getAllAsync(
    `SELECT DISTINCT defi_id FROM defi_history WHERE family_id = ? AND completed_at >= ?;`,
    [String(params.familyId), since]
  );
  const doneIds = new Set<string>((doneRows ?? []).map((r: any) => String(r.defi_id)));

  let candidates = await getAllDefisForFamily(params.familyId);
  candidates = candidates.filter((d) => !doneIds.has(String(d.id)));
  candidates = filterByLocation(candidates, params.location);
  candidates = filterByMaxDuration(candidates, params.maxDurationMin);
  candidates = filterByCategory(candidates, params.category);

  await logDefiEvent("Sélection — candidats après filtres", "info", {
    count: candidates.length,
    lookbackDays: params.lookbackDays,
    location: params.location ?? "",
    maxDuration: params.maxDurationMin ?? null,
    category: params.category ?? "",
  });

  return candidates;
}

/* ------------------ Logging factorisé ------------------ */

async function logDefiEvent(
  context: string,
  level: "info" | "error",
  details: object,
  familyId?: number,
  childIds?: number[],
  refId?: string
) {
  await addLog({
    timestamp: nowIso(),
    family_id: familyId ? String(familyId) : "",
    child_ids: JSON.stringify(childIds ?? []),
    log_type: "defi",
    level,
    context,
    details: JSON.stringify(details),
    ref_id: refId,
    device_info: undefined,
  });
}

/**
 * Sélectionne un défi aléatoire éligible en fonction de la config de session.
 */
export async function pickRandomEligibleDefi(config: SessionConfig): Promise<RawDefiRow | null> {
  const { familyId, childIds = [] } = config;
  const lookbackDays =
    typeof config.lookbackDays === "number" ? config.lookbackDays : DEFAULT_LOOKBACK_DAYS;

  const avgAge = await getParticipantsAverageAge(childIds);

  let candidates = await getNotDoneDefisForFamily({
    familyId,
    lookbackDays,
    location: config.location ?? null,
    maxDurationMin: config.plannedDurationMin ?? null,
    category: config.category ?? null,
  });

  candidates = filterByAge(candidates, avgAge);

  if (!candidates.length) {
    await logDefiEvent("Aucun défi éligible (random)", "info", {
      avgAge,
      lookbackDays,
      location: config.location ?? "",
      plannedDurationMin: config.plannedDurationMin ?? undefined,
      category: config.category ?? "",
    }, familyId, childIds);
    return null;
  }

  // Sonar S2245: usage intentionnel de Math.random (sélection UX non sensible, pas de besoin crypto)
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  await logDefiEvent("Défi proposé (random)", "info", {
    defi_id: pick.id,
    avgAge,
    lookbackDays,
    location: config.location ?? "",
    plannedDurationMin: config.plannedDurationMin ?? undefined,
    category: config.category ?? "",
  }, familyId, childIds, String(pick.id));

  return pick;
}

/**
 * Construit un bundle de défis (≤ 12) adaptés à la config et à la durée cible.
 */
export async function buildEligibleBundle(
  config: SessionConfig,
  limit: number = 12
): Promise<RawDefiRow[]> {
  const { familyId, childIds = [] } = config;
  const lookbackDays =
    typeof config.lookbackDays === "number" ? config.lookbackDays : DEFAULT_LOOKBACK_DAYS;

  const target =
    typeof config.plannedDurationMin === "number" && config.plannedDurationMin > 0
      ? Math.round(config.plannedDurationMin)
      : null;

  const avgAge = await getParticipantsAverageAge(childIds);

  let candidates = await getNotDoneDefisForFamily({
    familyId,
    lookbackDays,
    location: config.location ?? null,
    maxDurationMin: target ?? null,
    category: config.category ?? null,
  });

  candidates = filterByAge(candidates, avgAge);
  const pool = candidates.filter((d) => (d.duration_min ?? 0) > 0);

  const MAX_CAP = 12;
  const maxCount = Math.min(MAX_CAP, limit > 0 ? Math.floor(limit) : MAX_CAP);

  if (!target || pool.length === 0) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
    // Sonar S2245: shuffle de présentation local, sécurité non concernée
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const bundle = shuffled.slice(0, Math.max(1, maxCount));

    await logDefiEvent("Bundle (fallback sans durée cible)", "info", {
      count: bundle.length,
      ids: bundle.map((b) => b.id),
      avgAge,
      lookbackDays,
      location: config.location ?? "",
      plannedDurationMin: config.plannedDurationMin ?? undefined,
      category: config.category ?? "",
      cap: MAX_CAP,
    }, familyId, childIds);

    return bundle;
  }

  let best: RawDefiRow[] = [];
  let bestSum = 0;
  const tries = Math.min(24, Math.max(6, Math.ceil(pool.length / 2)));

  for (let t = 0; t < tries; t++) {
    const arr = [...pool];

    if (t % 3 === 0) {
      arr.sort((a, b) => (a.duration_min as number) - (b.duration_min as number));
    } else {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
    // Sonar S2245: randomisation simple pour varier les combinaisons testées
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    let sum = 0;
    const pick: RawDefiRow[] = [];
    for (const d of arr) {
      const dur = d.duration_min as number;
      if (pick.length < maxCount && sum + dur <= target) {
        pick.push(d);
        sum += dur;
        if (sum === target || pick.length === maxCount) break;
      }
    }

    if (sum > bestSum || (sum === bestSum && pick.length > best.length)) {
      best = pick;
      bestSum = sum;
      if (bestSum === target || best.length === maxCount) break;
    }
  }

  await logDefiEvent("Bundle de défis (Σ durée ≤ target, cap 12)", "info", {
    count: best.length,
    sumDuration: best.reduce((a, b) => a + (b.duration_min || 0), 0),
    ids: best.map((b) => b.id),
    target,
    avgAge,
    lookbackDays,
    location: config.location ?? "",
    plannedDurationMin: config.plannedDurationMin ?? undefined,
    category: config.category ?? "",
    cap: MAX_CAP,
  }, familyId, childIds);

  return best;
}
