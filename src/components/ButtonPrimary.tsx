/**
 * Composant ButtonPrimary : bouton principal réutilisable de l'application Kokoroji.
 * Permet d'assurer la cohérence visuelle et l'accessibilité des actions principales.
 * Gère les états désactivé et chargement (spinner).
 */
import React from "react";
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { colors } from "../styles/colors";

interface ButtonPrimaryProps {
    title: string;
    onPress: (event: GestureResponderEvent) => void;
    disabled?: boolean;
    loading?: boolean;
    buttonStyle?: ViewStyle | ViewStyle[];  // Ajout pour styles personnalisés
    textStyle?: TextStyle | TextStyle[];   // Ajout pour styles personnalisés
    testID?: string; // Ajout pour support test natif
    compact?: boolean; // Réduction des paddings / largeur
}

/**
 * Bouton principal stylisé, réutilisable dans toute l'application.
 * UX : accessibilité, feedback visuel lors d'une action asynchrone.
 * @param title Texte affiché sur le bouton
 * @param onPress Callback appelée lors du clic
 * @param disabled Désactive le bouton si true
 * @param loading Affiche un indicateur de chargement si true
 * @param buttonStyle Styles supplémentaires pour le container bouton
 * @param textStyle Styles supplémentaires pour le texte
 * @param testID Identifiant de test (injection pour test unitaire)
 * @returns JSX.Element
 */
const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({
    title,
    onPress,
    disabled = false,
    loading = false,
    buttonStyle,
    textStyle,
    testID,
    compact = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                compact && styles.compact,
                disabled ? styles.buttonDisabled : null,
                styles.buttonShadow,
                buttonStyle
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading }}
            testID={testID} // Injection du testID ici
        >
            {/* Affiche un spinner si loading, sinon le texte du bouton */}
            {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
            ) : (
                <Text style={[styles.text, disabled ? styles.textDisabled : null, textStyle]}>
                    {title}
                </Text>
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
        minHeight: 48,
        minWidth: 180, // largeur par défaut conservée pour ne pas impacter les écrans existants
    },
    compact: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        minWidth: 140, // largeur réduite pour mode compact
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
