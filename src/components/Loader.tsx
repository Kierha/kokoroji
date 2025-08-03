/**
 * Composant Loader : affiche un indicateur de chargement centré.
 * Utilisé pour signaler à l'utilisateur qu'une opération asynchrone est en cours dans l'application Kokoroji.
 */
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

/**
 * Affiche un spinner natif centré.
 * UX : utilisé pour signaler à l'utilisateur qu'une opération asynchrone est en cours.
 * @returns JSX.Element
 */
const Loader: React.FC = () => {
    // Affiche un spinner natif centré
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.lightBlue} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center", // Centre verticalement
        alignItems: "center",     // Centre horizontalement
    },
});

export default Loader;
