/**
 * Composant ButtonPrimary : bouton principal réutilisable de l'application Kokoroji.
 * Permet d'assurer la cohérence visuelle et l'accessibilité des actions principales.
 * Gère les états désactivé et chargement (spinner).
 */
import React from "react";
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ActivityIndicator } from "react-native";
import { colors } from "../styles/colors";

interface ButtonPrimaryProps {
    title: string;
    onPress: (event: GestureResponderEvent) => void;
    disabled?: boolean;
    loading?: boolean;
}

/**
 * Bouton principal stylisé, réutilisable dans toute l'application.
 * UX : accessibilité, feedback visuel lors d'une action asynchrone.
 * @param title Texte affiché sur le bouton
 * @param onPress Callback appelée lors du clic
 * @param disabled Désactive le bouton si true
 * @param loading Affiche un indicateur de chargement si true
 * @returns JSX.Element
 */
const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({
    title,
    onPress,
    disabled = false,
    loading = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                disabled ? styles.buttonDisabled : null,
                styles.buttonShadow
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading }}
        >
            {/* Affiche un spinner si loading, sinon le texte du bouton */}
            {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
            ) : (
                <Text style={[styles.text, disabled ? styles.textDisabled : null]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.mediumBlue,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 180,
        minHeight: 48,
    },
    buttonDisabled: {
        backgroundColor: "#B0B7C3", // --> Gris doux
    },
    buttonShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2,
    },
    text: {
        color: colors.white,
        fontWeight: "600",
        fontSize: 16,
    },
    textDisabled: {
        color: "#E5E5E5", // --> Gris très clair pour le texte désactivé
    },
});

export default ButtonPrimary;
