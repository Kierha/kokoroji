/**
 * Tests unitaires pour le service photoService.
 * Vérifie les permissions, la capture/sélection, la persistance sandbox, le nom d’album, l’ajout médiathèque et le pipeline.
 * Les APIs Expo sont mockées.
 */
import * as photoService from "../src/services/photoService";

// Mocks Expo (avant l’import du service)
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
}));
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///app-docs/",
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

describe("photoService", () => {
  const ImagePicker = require("expo-image-picker");
  const MediaLibrary = require("expo-media-library");
  const FileSystem = require("expo-file-system");

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2025-08-17T12:00:00.000Z"));
    jest.spyOn(Date, "now").mockReturnValue(1723896000000); // 2025-08-17T12:00:00.000Z
  });

  afterEach(() => {
    (Date.now as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  /** Permissions */
  it("requestMediaPermissions retourne true si les deux permissions sont accordées", async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "granted" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });
    await expect(photoService.requestMediaPermissions()).resolves.toBe(true);
  });

  it("requestMediaPermissions retourne false si une permission est refusée", async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "denied" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });
    await expect(photoService.requestMediaPermissions()).resolves.toBe(false);
  });

  /** Caméra */
  it("takePhoto retourne null si les permissions échouent", async () => {
    // Mock permissions -> refus
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "denied" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });

    const res = await photoService.takePhoto();
    expect(res).toBeNull();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("takePhoto capture et retourne l’asset principal", async () => {
    // Mock permissions -> accordées
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "granted" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });
    // Mock caméra
    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///cam.jpg", width: 800, height: 600, exif: { a: 1 } }],
    });

    const res = await photoService.takePhoto();

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: false, quality: 0.9, exif: true })
    );
    expect(res).toEqual({
      uri: "file:///cam.jpg",
      width: 800,
      height: 600,
      exif: { a: 1 },
    });
  });

  /** Picker */
  it("pickFromLibrary retourne null si les permissions échouent", async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "granted" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "denied" });

    const res = await photoService.pickFromLibrary();
    expect(res).toBeNull();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("pickFromLibrary sélectionne et retourne l’asset principal", async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: "granted" });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///lib.png", width: 1200, height: 900, exif: null }],
    });

    const res = await photoService.pickFromLibrary();

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: false, quality: 0.9, exif: true })
    );
    expect(res).toEqual({
      uri: "file:///lib.png",
      width: 1200,
      height: 900,
      exif: null,
    });
  });

  /** Sandbox */
  it("ensureAppBase crée le répertoire (best-effort)", async () => {
    FileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    await expect(photoService.ensureAppBase()).resolves.toBeUndefined();
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///app-docs/Kokoroji/",
      { intermediates: true }
    );

    FileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error("exists"));
    await expect(photoService.ensureAppBase()).resolves.toBeUndefined();
  });

  it("saveIntoAppSandbox copie le fichier et retourne l’URI app (nom normalisé + timestamp)", async () => {
    FileSystem.copyAsync.mockResolvedValue(undefined);

    const uri = await photoService.saveIntoAppSandbox("file:///src/path/image.heic", {
      sessionId: 12,
      defiName: "Défi photo éléphant!",
    });

    const expected = "file:///app-docs/Kokoroji/Defi_photo_elephant_12_1723896000000.heic";
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: "file:///src/path/image.heic", to: expected });
    expect(uri).toBe(expected);
  });

  it("saveIntoAppSandbox utilise photo_<timestamp> si le nom est absent", async () => {
    FileSystem.copyAsync.mockResolvedValue(undefined);
    const uri = await photoService.saveIntoAppSandbox("file:///x/y.jpg", {
      sessionId: "S1",
      defiName: null,
    });
    const expected = "file:///app-docs/Kokoroji/photo_1723896000000_S1_1723896000000.jpg";
    expect(uri).toBe(expected);
  });

  /** Album */
  it("getAlbumName retourne le libellé attendu", () => {
    expect(photoService.getAlbumName({ sessionId: 7, type: "random" }))
      .toBe("Kokoroji - Aléatoire");
    expect(photoService.getAlbumName({ sessionId: 7, type: "bundle", dateISO: "2025-08-17" }))
      .toBe("Kokoroji - Session_7_2025-08-17");
    expect(photoService.getAlbumName({ sessionId: 7, type: "bundle", dateISO: "bad" as any }))
      .toBe("Kokoroji - Session_7_2025-08-17");
  });

  /** MediaLibrary */
  it("tryAddToAlbum ajoute dans l’album existant", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    MediaLibrary.createAssetAsync.mockResolvedValue({ id: "asset1" });
    MediaLibrary.getAlbumAsync.mockResolvedValue({ id: "alb" });
    MediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(undefined);

    const ok = await photoService.tryAddToAlbum("file:///app-docs/Kokoroji/a.jpg", "AlbumX");
    expect(ok).toBe(true);
    expect(MediaLibrary.addAssetsToAlbumAsync).toHaveBeenCalled();
  });

  it("tryAddToAlbum crée l’album s’il est absent", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    MediaLibrary.createAssetAsync.mockResolvedValue({ id: "asset1" });
    MediaLibrary.getAlbumAsync.mockResolvedValue(null);
    MediaLibrary.createAlbumAsync.mockResolvedValue({ id: "new" });

    const ok = await photoService.tryAddToAlbum("file:///app-docs/Kokoroji/a.jpg", "AlbumY");
    expect(ok).toBe(true);
    expect(MediaLibrary.createAlbumAsync).toHaveBeenCalled();
  });

  it("tryAddToAlbum retourne false si refus ou erreur", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    expect(await photoService.tryAddToAlbum("file:///x.jpg", "A")).toBe(false);

    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    MediaLibrary.createAssetAsync.mockRejectedValueOnce(new Error("fail"));
    expect(await photoService.tryAddToAlbum("file:///x.jpg", "A")).toBe(false);
  });

  /** Pipeline */
  it("persistPhotoWithAlbum persiste, ajoute best-effort à l’album et renvoie les métadonnées", async () => {
    // Mock sandbox
    FileSystem.copyAsync.mockResolvedValue(undefined);
    // Mock MediaLibrary
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    MediaLibrary.createAssetAsync.mockResolvedValue({ id: "asset1" });
    MediaLibrary.getAlbumAsync.mockResolvedValue({ id: "alb" });
    MediaLibrary.addAssetsToAlbumAsync.mockResolvedValue(undefined);

    const res = await photoService.persistPhotoWithAlbum(
      { uri: "file:///src.jpg", width: 640, height: 480, exif: { e: 1 } },
      "AlbumZ",
      { sessionId: 9, defiName: "Défi Z" }
    );

    // Vérifie la copie (appelée par saveIntoAppSandbox)
    const expectedAppUri = "file:///app-docs/Kokoroji/Defi_Z_9_1723896000000.jpg";
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: "file:///src.jpg",
      to: expectedAppUri,
    });

    // Vérifie MediaLibrary (appelée par tryAddToAlbum)
    expect(MediaLibrary.createAssetAsync).toHaveBeenCalledWith(expectedAppUri);

    // Résultat final
    expect(res).toEqual({
      appUri: expectedAppUri,
      savedToAlbum: true,
      width: 640,
      height: 480,
      exif: { e: 1 },
    });
  });
});