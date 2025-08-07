/**
 * Écran d'authentification de développement pour Kokoroji.
 * Propose deux modes :
 * - Connexion Supabase classique (email + mot de passe).
 * - Connexion bypass locale (mode dev) pour accélérer les tests.
 * Usage réservé au développement.
 */

import React, { useState } from "react";
import { View, StyleSheet, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputEmail from "../../components/InputField";
import ButtonPrimary from "../../components/ButtonPrimary";
import ErrorMessage from "../../components/CompErrorMessage";
import { colors } from "../../styles/colors";
import { useAuth } from "../../hooks/useAuth";
import { signInWithEmailPassword } from "../../services/authService";
import Footer from "../../components/Footer";

const LoginDevScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    // États du formulaire pour connexion Supabase
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { signInDevUser } = useAuth();

    /**
     * Traite la connexion avec email et mot de passe via Supabase.
     * Gère l'état de chargement et les erreurs retournées.
     */
    const handleLogin = async () => {
        setError(null);
        setLoading(true);
        const { error: loginError } = await signInWithEmailPassword(email, password);
        setLoading(false);

        if (loginError) {
            setError(loginError.message || "Erreur de connexion");
        } else {
            Alert.alert("Connexion réussie", "Vous êtes connecté via Supabase.");
            // TODO : naviguer vers l'écran principal ou revenir en arrière
        }
    };

    /**
     * Traite la connexion bypass en mode développement.
     * Permet d'accéder rapidement sans authentification réelle.
     */
    const handleBypass = async () => {
        await signInDevUser();
        Alert.alert("Bypass Dev", "Connexion locale effectuée (mode dev).");
        // TODO : naviguer vers l'écran principal ou revenir en arrière
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.header}>
                    <Text style={styles.title}>DEV Authentification</Text>
                    <Text style={styles.subtitle}>
                        Choisissez un mode de connexion pour vos tests :
                    </Text>
                </View>

                <View style={styles.card}>
                    {/* Connexion Supabase */}
                    <Text style={styles.sectionTitle}>Connexion Supabase</Text>
                    <InputEmail value={email} onChangeText={setEmail} placeholder="Email" />
                    <InputEmail
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mot de passe"
                        secureTextEntry
                    />
                    <ButtonPrimary
                        title="Connexion (email + mot de passe)"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={!email || !password || loading}
                    />
                    {!!error && <ErrorMessage message={error} />}

                    <View style={{ height: 16 }} />

                    {/* Bypass DEV */}
                    <Text style={styles.sectionTitle}>Ou</Text>
                    <ButtonPrimary title="Bypass DEV (connexion locale)" onPress={handleBypass} />

                    <View style={{ height: 28 }} />

                    <ButtonPrimary title="Retour" onPress={() => navigation.goBack()} />
                </View>
            </View>
            <Footer />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    wrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 18,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 3,
        letterSpacing: 1.1,
    },
    subtitle: {
        color: colors.darkGrey,
        fontSize: 15,
        fontWeight: "400",
        marginBottom: 12,
        textAlign: "center",
        paddingHorizontal: 12,
        opacity: 0.82,
        fontStyle: "italic",
    },
    card: {
        backgroundColor: colors.white,
        padding: 28,
        borderRadius: 22,
        width: "92%",
        maxWidth: 400,
        alignItems: "center",
        marginTop: 8,
        marginHorizontal: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.11,
        shadowRadius: 14,
        elevation: 6,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.mediumBlue,
        marginBottom: 10,
        marginTop: 2,
    },
});

export default LoginDevScreen;
