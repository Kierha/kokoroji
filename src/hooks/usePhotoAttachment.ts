import { useCallback, useState } from "react";
import {
  takePhoto,
  pickFromLibrary,
  getAlbumName,
  persistPhotoWithAlbum,
  saveIntoAppSandbox,
} from "../services/photoService";
import { attachMediaToSession } from "../services/sessionService";

/** Paramètres d’attache média. Si saveToAlbum === false, copie uniquement dans le sandbox de l’app. */
type AttachParams = {
  sessionId: number;
  familyId: number;
  childIds?: number[];
  sessionType?: "random" | "bundle";
  albumDateISO?: string;
  defiName?: string | null;
  defiId?: string | number | null;
  defiTitle?: string | null;
  saveToAlbum?: boolean;
};

type PersistedPhoto = {
  appUri: string;
  savedToAlbum?: boolean;
  albumUri?: string | null;
  width?: number;
  height?: number;
  exif?: Record<string, any> | null;
  filename?: string | null;
};

/**
 * Hook d’attache de photo à une session : capture caméra ou sélection galerie puis persistance
 * (sandbox + album optionnel) et enregistrement en base via attachMediaToSession.
 * Expose loading / error et deux actions atomiques.
 */
export function usePhotoAttachment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeAlbumName = (p: AttachParams) =>
    getAlbumName({
      sessionId: p.sessionId,
      type: p.sessionType ?? "bundle",
      dateISO: p.albumDateISO,
    });

  /** Persistance unifiée selon saveToAlbum (album si vrai, sinon sandbox seul). */
  const persistAccordingToFlag = async (
    photo: { uri: string; width?: number; height?: number; exif?: Record<string, any> | null },
    albumName: string,
    p: AttachParams
  ): Promise<PersistedPhoto> => {
    const wantAlbum = p.saveToAlbum !== false;
    if (wantAlbum) {
      return await persistPhotoWithAlbum(photo, albumName, {
        sessionId: p.sessionId,
        defiName: p.defiTitle ?? p.defiName ?? null,
      });
    }
    const appUri = await saveIntoAppSandbox(photo.uri, {
      sessionId: p.sessionId,
      defiName: p.defiTitle ?? p.defiName ?? null,
    });
    return {
      appUri,
      savedToAlbum: false,
      width: photo.width,
      height: photo.height,
      exif: photo.exif ?? null,
    };
  };

  /** Capture via caméra puis attache la photo persistée à la session. */
  const captureAndAttach = useCallback(
    async (p: AttachParams) => {
      setLoading(true);
      setError(null);
      try {
        const photo = await takePhoto();
        if (!photo) return null;

        const albumName = computeAlbumName(p);
        const saved = await persistAccordingToFlag(photo, albumName, p);

        const id = await attachMediaToSession({
          sessionId: p.sessionId,
          familyId: p.familyId,
          childIds: p.childIds ?? [],
          fileUri: saved.appUri,
          mediaType: "photo",
          metadata: {
            width: saved.width,
            height: saved.height,
            exif: saved.exif ?? undefined,
            albumName,
            savedToAlbum: saved.savedToAlbum,
            albumUri: saved.albumUri ?? undefined,
            filename: saved.filename ?? undefined,
            defiId: p.defiId ?? undefined,
            defiTitle: p.defiTitle ?? p.defiName ?? undefined,
            sessionType: p.sessionType ?? "bundle",
            albumDateISO: p.albumDateISO ?? undefined,
          },
        });

        return id;
      } catch (e: any) {
        setError(e?.message ?? "Impossible d’attacher la photo");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** Sélection depuis la galerie puis attache la photo persistée à la session. */
  const pickAndAttach = useCallback(
    async (p: AttachParams) => {
      setLoading(true);
      setError(null);
      try {
        const photo = await pickFromLibrary();
        if (!photo) return null;

        const albumName = computeAlbumName(p);
        const saved = await persistAccordingToFlag(photo, albumName, p);

        const id = await attachMediaToSession({
          sessionId: p.sessionId,
          familyId: p.familyId,
          childIds: p.childIds ?? [],
          fileUri: saved.appUri,
          mediaType: "photo",
          metadata: {
            width: saved.width,
            height: saved.height,
            exif: saved.exif ?? undefined,
            albumName,
            savedToAlbum: saved.savedToAlbum,
            albumUri: saved.albumUri ?? undefined,
            filename: saved.filename ?? undefined,
            defiId: p.defiId ?? undefined,
            defiTitle: p.defiTitle ?? p.defiName ?? undefined,
            sessionType: p.sessionType ?? "bundle",
            albumDateISO: p.albumDateISO ?? undefined,
          },
        });

        return id;
      } catch (e: any) {
        setError(e?.message ?? "Impossible d’attacher la photo depuis la galerie");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, captureAndAttach, pickAndAttach };
}

export default usePhotoAttachment;
