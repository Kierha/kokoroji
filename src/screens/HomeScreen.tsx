/**
 * Écran HomeScreen : affiché après connexion, propose la déconnexion et un message de bienvenue.
 * Permet d’assurer la cohérence UX post-authentification dans l’application Kokoroji.
 */
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { colors } from "../styles/colors";
import { useAuth } from "../hooks/useAuth";
import { useNavigation } from "@react-navigation/native";

/**
 * Affiche l’écran d’accueil après connexion.
 * Ajoute dynamiquement le bouton de déconnexion dans le header.
 * UX : la déconnexion est accessible en haut à droite.
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

    return (
        <View style={styles.container}>
            {/* Message de bienvenue */}
            <Text style={styles.text}>Bienvenue sur Kokoroji !</Text>
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
});

export default HomeScreen;
