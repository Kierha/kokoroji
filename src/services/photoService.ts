import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export type PhotoResult = {
  uri: string;
  width?: number;
  height?: number;
  exif?: Record<string, any> | null;
};

export type SavedPhoto = {
  appUri: string;
  savedToAlbum: boolean;
  width?: number;
  height?: number;
  exif?: Record<string, any> | null;
};

const APP_BASE = FileSystem.documentDirectory + "Kokoroji/";

/**
 * Demande les autorisations caméra et médiathèque.
 * @returns true si toutes les autorisations sont accordées.
 */
export async function requestMediaPermissions(): Promise<boolean> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return cam.status === "granted" && lib.status === "granted";
}

/**
 * Ouvre la caméra et retourne la photo capturée.
 * @returns La photo ou null si annulé/permission refusée.
 */
export async function takePhoto(): Promise<PhotoResult | null> {
  const ok = await requestMediaPermissions();
  if (!ok) return null;

  const res = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.9,
    exif: true,
  });

  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height, exif: (a as any).exif ?? null };
}

/**
 * Ouvre la médiathèque et retourne la photo sélectionnée.
 * @returns La photo ou null si annulé/permission refusée.
 */
export async function pickFromLibrary(): Promise<PhotoResult | null> {
  const ok = await requestMediaPermissions();
  if (!ok) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    quality: 0.9,
    exif: true,
  });

  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height, exif: (a as any).exif ?? null };
}

/**
 * Crée le répertoire applicatif si nécessaire.
 */
export async function ensureAppBase(): Promise<void> {
  await FileSystem.makeDirectoryAsync(APP_BASE, { intermediates: true }).catch(() => {});
}

/** Déduit une extension courte depuis une URI (fallback jpg). */
function inferExtensionFromUri(uri: string): string {
  const q = uri.split("?")[0] ?? uri;
  const dot = q.lastIndexOf(".");
  if (dot >= 0 && dot < q.length - 1) {
    const ext = q.substring(dot + 1).toLowerCase();
    if (ext.length <= 5) return ext;
  }
  return "jpg";
}

/** Nom de fichier sûr (ASCII, underscores, 64 chars max). */
function sanitizeName(s?: string | null): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 64);
}

/**
 * Copie la photo dans le sandbox de l’app.
 * @param sourceUri URI source.
 * @param opts.sessionId Identifiant de session.
 * @param opts.defiName Nom de défi utilisé dans le nom de fichier (optionnel).
 * @returns URI locale de la copie.
 */
export async function saveIntoAppSandbox(
  sourceUri: string,
  opts: { sessionId: string | number; defiName?: string | null }
): Promise<string> {
  await ensureAppBase();
  const ext = inferExtensionFromUri(sourceUri);
  const basename = sanitizeName(opts.defiName) || `photo_${Date.now()}`;
  const dest = `${APP_BASE}${basename}_${String(opts.sessionId)}_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/**
 * Construit le nom d’album MediaLibrary en fonction du type de session.
 * @param opts.sessionId Identifiant de session.
 * @param opts.type Type de session.
 * @param opts.dateISO Date YYYY-MM-DD (optionnel).
 * @returns Nom d’album.
 */
export function getAlbumName(opts: {
  sessionId: string | number;
  type: "random" | "bundle";
  dateISO?: string;
}): string {
  if (opts.type === "random") return "Kokoroji - Aléatoire";
  const date =
    opts.dateISO && /^\d{4}-\d{2}-\d{2}$/.test(opts.dateISO)
      ? opts.dateISO
      : new Date().toISOString().slice(0, 10);
  return `Kokoroji - Session_${String(opts.sessionId)}_${date}`;
}

/**
 * Tente d’ajouter une photo à un album MediaLibrary.
 * Retourne false en cas d’erreur sans lever d’exception.
 * @param localUri URI locale de la photo (sandbox).
 * @param albumName Nom de l’album.
 * @returns true si l’ajout est effectué.
 */
export async function tryAddToAlbum(localUri: string, albumName: string): Promise<boolean> {
  try {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.status !== "granted") return false;

    const asset = await MediaLibrary.createAssetAsync(localUri);
    let album = await MediaLibrary.getAlbumAsync(albumName);
    if (!album) album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
    else await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);

    return true;
  } catch {
    return false;
  }
}

/**
 * Persiste une photo dans le sandbox et tente l’ajout à l’album.
 * @param photo Photo source.
 * @param albumName Nom d’album cible.
 * @param opts.sessionId Identifiant de session.
 * @param opts.defiName Nom de défi (optionnel).
 * @returns Détails de la sauvegarde.
 */
export async function persistPhotoWithAlbum(
  photo: PhotoResult,
  albumName: string,
  opts: { sessionId: string | number; defiName?: string | null }
): Promise<SavedPhoto> {
  const appUri = await saveIntoAppSandbox(photo.uri, opts);
  const savedToAlbum = await tryAddToAlbum(appUri, albumName);
  return {
    appUri,
    savedToAlbum,
    width: photo.width,
    height: photo.height,
    exif: photo.exif ?? undefined,
  };
}
