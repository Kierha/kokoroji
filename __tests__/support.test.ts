/**
 * Tests unitaires pour la fonction handleSupport.
 * Vérifie l'ouverture du client mail ou l'affichage d'une alerte en cas d'absence.
 */

import { handleSupport } from "../src/utils/support";
import { Linking, Alert } from "react-native";

jest.mock("react-native", () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe("handleSupport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Vérifie que le client mail s'ouvre si l'URL mailto est supportée.
   */
  it("ouvre le client mail si possible", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

    handleSupport();

    // Attendre la résolution de la promesse canOpenURL
    await Promise.resolve();

    expect(Linking.canOpenURL).toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("mailto:support@kokoroji.com")
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  /**
   * Vérifie qu'une alerte est affichée si aucun client mail n'est disponible.
   */
  it("affiche une alerte si aucun client mail", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

    handleSupport();

    await Promise.resolve();

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Erreur",
      expect.stringContaining("Impossible d’ouvrir votre application d’email")
    );
  });
});
