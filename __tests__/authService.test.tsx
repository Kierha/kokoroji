
/**
 * Teste la fonction sendMagicLink du service d'authentification.
 * Utilise Jest pour simuler les appels à Supabase.
 */
import { sendMagicLink } from "../src/services/authService";


// Mock du client Supabase pour isoler les tests de la couche réseau réelle
jest.mock("../src/services/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
    },
  },
}));


// Récupération du mock pour configurer les retours dans chaque test
const { supabase } = require("../src/services/supabaseClient");

describe("sendMagicLink", () => {
  /**
   * Vérifie que la fonction retourne null en cas de succès de l'envoi du lien magique.
   * Cas nominal : l'utilisateur reçoit un email sans erreur.
   */
  it("retourne null si succès", async () => {
    // Simulation d'une réponse sans erreur de Supabase
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
    const res = await sendMagicLink("test@mail.com");
    expect(res.error).toBeNull();
  });

  /**
   * Vérifie que la fonction retourne le message d'erreur en cas d'échec de l'envoi du lien magique.
   * Permet de s'assurer que l'utilisateur reçoit un retour exploitable en cas d'erreur technique.
   */
  it("retourne le message d'erreur si échec", async () => {
    // Simulation d'une réponse d'erreur de Supabase
    supabase.auth.signInWithOtp.mockResolvedValue({
      error: { message: "Erreur test" },
    });
    const res = await sendMagicLink("test@mail.com");
    expect(res.error).toBe("Erreur test");
  });
});