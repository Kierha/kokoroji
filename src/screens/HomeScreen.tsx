/**
 * Écran HomeScreen : affiché après connexion, propose la déconnexion et un message de bienvenue.
 * Permet d’assurer la cohérence UX post-authentification dans l’application Kokoroji.
 * (Version debug : ajoute un bouton pour réinitialiser l’onboarding)
 * @returns JSX.Element
 */
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Button, TouchableOpacity, Alert } from "react-native";
import { colors } from "../styles/colors";
import { useAuth } from "../hooks/useAuth";
import { useNavigation } from "@react-navigation/native";
import { resetOnboardingFlag } from "../services/onboardingService"; // Ajoute cette fonction utilitaire dans ton service

/**
 * Affiche l’écran d’accueil après connexion.
 * Ajoute dynamiquement le bouton de déconnexion dans le header.
 * UX : la déconnexion est accessible en haut à droite.
 * Ajoute un bouton DEBUG pour recommencer l’onboarding.
 * @returns JSX.Element
 */

const HomeScreen: React.FC = () => {
    const { signOut } = useAuth();
    const navigation = useNavigation();

    // Ajoute le bouton de déconnexion dans le header à l'affichage de l'écran
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Button
                    title="Déconnexion"
                    onPress={signOut}
                    color={colors.mediumBlue}
                />
            ),
        });
    }, [navigation, signOut]);

    /**
     * Bouton debug pour réinitialiser l'onboarding (supprime le flag en BDD).
     */
    const handleResetOnboarding = async () => {
        await resetOnboardingFlag();
        Alert.alert(
            "Onboarding réinitialisé",
            "Relancez l’application ou déconnectez-vous pour recommencer l’onboarding."
        );
        // Optionnel : tu peux directement déconnecter ici, ou forcer un reload si besoin
        // signOut();
        // Updates.reloadAsync(); (si tu utilises expo-updates)
    };

    return (
        <View style={styles.container}>
            {/* Message de bienvenue */}
            <Text style={styles.text}>Bienvenue sur Kokoroji !</Text>
            {/* DEBUG ONLY */}
            <TouchableOpacity style={styles.debugButton} onPress={handleResetOnboarding}>
                <Text style={styles.debugText}>Réinitialiser l’onboarding (debug)</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        color: colors.mediumBlue,
        fontSize: 20,
    },
    debugButton: {
        marginTop: 26,
        paddingVertical: 11,
        paddingHorizontal: 25,
        backgroundColor: "#FFE8E8",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EB5757",
    },
    debugText: {
        color: "#EB5757",
        fontSize: 15,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
});

export default HomeScreen;
