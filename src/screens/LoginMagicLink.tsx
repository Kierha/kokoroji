/**
 * Écran LoginMagicLink : permet à l’utilisateur de demander un lien magique pour se connecter.
 * Gère la validation du formulaire, l’affichage des erreurs et le feedback utilisateur.
 * UX : animation d’arrivée du logo, feedback immédiat, accessibilité renforcée.
 */
import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, Alert, Text, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputEmail from "../components/InputEmail";
import ButtonPrimary from "../components/ButtonPrimary";
import ErrorMessage from "../components/CompErrorMessage";
import { colors } from "../styles/colors";
import { sendMagicLink } from "../services/authService";
import { isValidEmail } from "../utils/email";
import { mapMagicLinkError } from "../utils/errorMessages";
import KoroLogo from "../assets/kokoroji-simple.png";

/**
 * Composant de formulaire de connexion par Magic Link.
 * Valide l’email, gère l’état de chargement et affiche les erreurs ou le succès.
 * @returns JSX.Element
 */
const LoginMagicLink: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Animation d'arrivée du logo
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, translateY]);

    const handleSendMagicLink = async () => {
        setError("");
        // Validation front : on n'appelle jamais Supabase si l'email est invalide
        if (!isValidEmail(email)) {
            setError("Adresse email invalide. Merci de corriger.");
            return;
        }

        setLoading(true);
        const { error } = await sendMagicLink(email);
        setLoading(false);

        // Mapping du message d’erreur Supabase (francisé si besoin)
        if (error) {
            setError(mapMagicLinkError(error));
            return;
        }

        // Succès
        if (Platform.OS === "web") {
            window.alert("Un lien magique a été envoyé à votre adresse email. Vérifiez votre boîte de réception.");
        } else {
            Alert.alert(
                "Lien envoyé",
                "Un lien magique a été envoyé à votre adresse email. Vérifiez votre boîte de réception.",
                [{ text: "OK" }]
            );
        }
        setEmail("");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Animated.Image
                            source={KoroLogo}
                            style={[
                                styles.logo,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY }],
                                },
                            ]}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Kokoroji</Text>
                        <Text style={styles.subtitle}>
                            L’écriture du cœur. Des instants simples, une trace précieuse.
                        </Text>
                    </View>
                    <View style={styles.formCard}>
                        <InputEmail
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Entrez votre email"
                            error={error}
                        />
                        <ButtonPrimary
                            title="Envoyer le lien magique"
                            onPress={handleSendMagicLink}
                            disabled={loading || !email}
                            loading={loading}
                        />
                        {!!error && <ErrorMessage message={error} />}
                    </View>
                </View>
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Kokoroji © 2025 – Tous droits réservés</Text>
                </View>
            </View>
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
        justifyContent: "space-between",
    },
    content: {
        alignItems: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 36,
    },
    logo: {
        width: 176,
        height: 176,
        marginBottom: 14,
    },
    title: {
        fontSize: 34,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 6,
        letterSpacing: 1.5,
    },
    subtitle: {
        color: colors.darkGrey,
        fontSize: 16,
        fontWeight: "400",
        marginBottom: 12,
        textAlign: "center",
        paddingHorizontal: 12,
        opacity: 0.82,
        fontStyle: "italic",
    },
    formCard: {
        backgroundColor: colors.white,
        padding: 32,
        borderRadius: 24,
        width: "92%",
        maxWidth: 420,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 7,
        alignItems: "center",
        marginTop: 8,
        marginHorizontal: 12,
    },
    footer: {
        alignItems: "center",
        width: "100%",
        marginBottom: 24,
        backgroundColor: "transparent",
    },
    footerText: {
        fontSize: 12,
        color: "#92A4AE",
        opacity: 0.75,
    },
});

export default LoginMagicLink;
