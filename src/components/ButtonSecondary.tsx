import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, GestureResponderEvent } from "react-native";
import { colors } from "../styles/colors";

/**
 * Bouton secondaire à contour bleu.
 * Utilisé pour les actions secondaires dans l’interface.
 *
 * @param title - Texte affiché sur le bouton.
 * @param onPress - Fonction exécutée lors de l’appui.
 * @param disabled - Désactive le bouton si vrai (visuel et interaction).
 * @param style - Styles supplémentaires appliqués au conteneur.
 */
interface ButtonSecondaryProps {
    title: string;
    onPress: (event: GestureResponderEvent) => void;
    disabled?: boolean;
    style?: ViewStyle | ViewStyle[];
}

export default function ButtonSecondary({
    title,
    onPress,
    disabled = false,
    style,
}: ButtonSecondaryProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled}
            style={[
                styles.btn,
                disabled && styles.disabledBtn,
                style,
            ]}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <Text style={[styles.txt, disabled && styles.disabledTxt]}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        borderWidth: 2,
        borderColor: colors.mediumBlue,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    txt: {
        color: colors.mediumBlue,
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    disabledBtn: {
        opacity: 0.45,
    },
    disabledTxt: {
        color: colors.mediumBlue,
    },
});
