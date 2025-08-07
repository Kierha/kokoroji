import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../styles/colors";

type MetricCardProps = {
    title: string;
    children?: React.ReactNode;
    titleStyle?: TextStyle;
    style?: ViewStyle;
};

/**
 * Carte affichant un titre et un contenu personnalisable.
 * Utilisée pour présenter des indicateurs ou métriques avec un style uniforme.
 *
 * @param title - Titre de la carte.
 * @param children - Contenu JSX personnalisé affiché sous le titre.
 * @param titleStyle - Style optionnel pour le titre.
 * @param style - Style optionnel pour la carte globale.
 * @returns JSX.Element - Carte métrique formatée.
 */
export default function MetricCard({
    title,
    children,
    titleStyle,
    style,
}: MetricCardProps) {
    return (
        <View style={[styles.card, style]}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            <View style={styles.valueWrapper}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 20,
        paddingHorizontal: 10,
        marginHorizontal: 4,
        alignItems: "center",
        width: "48%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    title: {
        fontSize: 15,
        color: colors.darkBlue,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 7,
    },
    valueWrapper: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
    },
});
