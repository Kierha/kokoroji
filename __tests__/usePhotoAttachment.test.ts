/**
 * Tests unitaires pour le hook usePhotoAttachment.
 * Vérifie les flux de capture et de sélection, la persistance (sandbox seul ou sandbox+album),
 * l’attache en base et l’exposition des états loading et error.
 * Les services photoService et sessionService sont mockés.
 */

import { renderHook, act } from "@testing-library/react";
import { usePhotoAttachment } from "../src/hooks/usePhotoAttachment";
// Imports des fonctions mockées pour typer/contrôler les appels
import {
  takePhoto,
  pickFromLibrary,
  getAlbumName,
  persistPhotoWithAlbum,
  saveIntoAppSandbox,
} from "../src/services/photoService";
import { attachMediaToSession } from "../src/services/sessionService";

// Mocks des services utilisés par le hook
jest.mock("../src/services/photoService", () => ({
  takePhoto: jest.fn(),
  pickFromLibrary: jest.fn(),
  getAlbumName: jest.fn(),
  persistPhotoWithAlbum: jest.fn(),
  saveIntoAppSandbox: jest.fn(),
}));
jest.mock("../src/services/sessionService", () => ({
  attachMediaToSession: jest.fn(),
}));

/** Helper pour contrôler la résolution d'une Promise dans un test */
function deferred<T = any>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("usePhotoAttachment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2025-08-17T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * captureAndAttach (saveToAlbum par défaut = true) :
   * persistance via persistPhotoWithAlbum puis attache en base.
   */
  it("captureAndAttach persiste (sandbox+album) et attache en BDD, retourne l’id", async () => {
    (takePhoto as jest.Mock).mockResolvedValue({
      uri: "file:///cam.jpg",
      width: 800,
      height: 600,
      exif: { a: 1 },
    });
    (getAlbumName as jest.Mock).mockReturnValue("Kokoroji - Session_9_2025-08-17");
    (persistPhotoWithAlbum as jest.Mock).mockResolvedValue({
      appUri: "file:///app-docs/Kokoroji/p.jpg",
      savedToAlbum: true,
      width: 800,
      height: 600,
      exif: { a: 1 },
    });
    (attachMediaToSession as jest.Mock).mockResolvedValue(101);

    const { result } = renderHook(() => usePhotoAttachment());

    let id: number | null = null;
    await act(async () => {
      id = await result.current.captureAndAttach({
        sessionId: 9,
        familyId: 1,
        childIds: [10, 11],
        sessionType: "bundle",
        albumDateISO: "2025-08-17",
        defiId: "D-1",
        defiTitle: "Défi Photo",
      });
    });

    expect(getAlbumName).toHaveBeenCalledWith({
      sessionId: 9,
      type: "bundle",
      dateISO: "2025-08-17",
    });
    expect(persistPhotoWithAlbum).toHaveBeenCalledWith(
      { uri: "file:///cam.jpg", width: 800, height: 600, exif: { a: 1 } },
      "Kokoroji - Session_9_2025-08-17",
      { sessionId: 9, defiName: "Défi Photo" }
    );
    expect(attachMediaToSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 9,
        familyId: 1,
        childIds: [10, 11],
        fileUri: "file:///app-docs/Kokoroji/p.jpg",
        mediaType: "photo",
        metadata: expect.objectContaining({
          albumName: "Kokoroji - Session_9_2025-08-17",
          savedToAlbum: true,
          defiId: "D-1",
          defiTitle: "Défi Photo",
          sessionType: "bundle",
          albumDateISO: "2025-08-17",
        }),
      })
    );
    expect(id).toBe(101);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  /**
   * pickAndAttach avec saveToAlbum=false :
   * persistance via saveIntoAppSandbox uniquement puis attache en base.
   */
  it("pickAndAttach persiste uniquement dans le sandbox si saveToAlbum=false", async () => {
    (pickFromLibrary as jest.Mock).mockResolvedValue({
      uri: "file:///gallery.png",
      width: 1200,
      height: 900,
      exif: null,
    });
    (getAlbumName as jest.Mock).mockReturnValue("Kokoroji - Session_9_2025-08-17");
    (saveIntoAppSandbox as jest.Mock).mockResolvedValue(
      "file:///app-docs/Kokoroji/gallery_solo.jpg"
    );
    (attachMediaToSession as jest.Mock).mockResolvedValue(55);

    const { result } = renderHook(() => usePhotoAttachment());

    let id: number | null = null;
    await act(async () => {
      id = await result.current.pickAndAttach({
        sessionId: 9,
        familyId: 1,
        childIds: [],
        sessionType: "random",
        defiTitle: "Sélection",
        saveToAlbum: false,
      });
    });

    expect(persistPhotoWithAlbum).not.toHaveBeenCalled();
    expect(saveIntoAppSandbox).toHaveBeenCalledWith("file:///gallery.png", {
      sessionId: 9,
      defiName: "Sélection",
    });
    expect(attachMediaToSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 9,
        familyId: 1,
        childIds: [],
        fileUri: "file:///app-docs/Kokoroji/gallery_solo.jpg",
        mediaType: "photo",
        metadata: expect.objectContaining({
          albumName: "Kokoroji - Session_9_2025-08-17",
          savedToAlbum: false,
          sessionType: "random",
        }),
      })
    );
    expect(id).toBe(55);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  /**
   * captureAndAttach : si l’utilisateur annule la capture (photo null),
   * retourne null et ne déclenche pas d’erreur.
   */
  it("captureAndAttach retourne null si takePhoto renvoie null", async () => {
    (takePhoto as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => usePhotoAttachment());

    let id: number | null = -1;
    await act(async () => {
      id = await result.current.captureAndAttach({ sessionId: 1, familyId: 1 });
    });

    expect(id).toBeNull();
    expect(persistPhotoWithAlbum).not.toHaveBeenCalled();
    expect(attachMediaToSession).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  /**
   * pickAndAttach : propage l’exception venue de la persistance et expose un message d’erreur.
   */
  it("pickAndAttach gère l’exception de persistance et expose error", async () => {
    (pickFromLibrary as jest.Mock).mockResolvedValue({
      uri: "file:///g.png",
      width: 100,
      height: 100,
      exif: null,
    });
    (getAlbumName as jest.Mock).mockReturnValue("Kokoroji - Session_2_2025-08-17");
    (persistPhotoWithAlbum as jest.Mock).mockRejectedValue(new Error("fail persist"));

    const { result } = renderHook(() => usePhotoAttachment());

    let id: number | null = -1;
    await act(async () => {
      id = await result.current.pickAndAttach({ sessionId: 2, familyId: 20, defiTitle: "X" });
    });

    expect(id).toBeNull();
    expect(result.current.error).toBe("fail persist");
    expect(result.current.loading).toBe(false);
  });

  /**
   * Vérifie que loading passe à true pendant l’opération puis revient à false.
   * Le helper deferred contrôle la résolution de takePhoto pour observer l’état intermédiaire.
   */
  it("expose loading pendant l’opération", async () => {
    const take = deferred<{ uri: string; width?: number; height?: number; exif?: any }>();
    (takePhoto as jest.Mock).mockReturnValue(take.promise);

    (getAlbumName as jest.Mock).mockReturnValue("Kokoroji - Session_1_2025-08-17");
    (persistPhotoWithAlbum as jest.Mock).mockResolvedValue({ appUri: "sandbox://ok" });
    (attachMediaToSession as jest.Mock).mockResolvedValue(1);

    const { result } = renderHook(() => usePhotoAttachment());

    let p!: Promise<number | null>;
    // Lancement dans un act() synchrone pour flusher setLoading(true)
    act(() => {
      p = result.current.captureAndAttach({ sessionId: 1, familyId: 1 }) as Promise<number | null>;
    });

    expect(result.current.loading).toBe(true);

    // Fin de l'opération dans un act() async
    await act(async () => {
      take.resolve({ uri: "file:///ok.jpg" });
      await p;
    });

    expect(result.current.loading).toBe(false);
  });
});