require("dotenv").config(); // Charge automatiquement .env à la racine, ou rien si absent

const { createClient } = require("@supabase/supabase-js");

describe("Supabase - test connexion", () => {
  it("devrait se connecter à la BDD Supabase courante et retourner 0 ou 1 ligne", async () => {
    const supabaseUrl = process.env["EXPO_PUBLIC_SUPABASE_URL"];
    const supabaseKey = process.env["EXPO_PUBLIC_SUPABASE_KEY"];
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Connexion à la BDD :", supabaseUrl?.slice(0, 35));

    const { data, error } = await supabase.from("ping").select("*").limit(1);

    if (error) {
      console.error("Erreur de connexion Supabase:", error.message);
    }
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  }, 15000); // Timeout 15s pour éviter un faux négatif en CI lente
});
