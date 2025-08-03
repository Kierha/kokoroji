import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Footer générique pour l'app Kokoroji.
 * À utiliser sur la page de connexion, accueil, contact, etc.
 * @returns JSX.Element
 */
const Footer: React.FC = () => (
    <View style={styles.footer}>
        <Text style={styles.footerText}>Kokoroji © 2025 – Tous droits réservés</Text>
    </View>
);

const styles = StyleSheet.create({
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

export default Footer;
