/**
 * Composant InputField : champ de saisie texte générique avec gestion de l'affichage des erreurs.
 * Utilisé dans les formulaires pour garantir la cohérence UX et l’accessibilité.
 */
import React from "react";
import { TextInput, StyleSheet, View, Text, TextInputProps } from "react-native";
import { colors } from "../styles/colors";

/**
 * Champ de saisie générique avec gestion de l'affichage des erreurs.
 * UX : met en avant l'accessibilité et la clarté des retours utilisateur.
 * @param value Valeur courante du champ
 * @param onChangeText Callback appelée à chaque modification
 * @param placeholder Texte d'aide affiché si vide
 * @param error Message d'erreur à afficher sous le champ
 * @param ...props Toutes les props TextInput natives supplémentaires (autoCapitalize, keyboardType, etc.)
 * @returns JSX.Element
 */
export interface InputFieldProps extends TextInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
    value,
    onChangeText,
    placeholder = "",
    error,
    style,
    placeholderTextColor = "#9fb1c8",
    ...props
}) => {
    return (
        <View style={styles.container}>
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    style,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor}
                // Les props custom du parent sont passées au champ natif
                {...props}
            />
            {/* Affiche le message d'erreur sous le champ si présent */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",            // Prend toute la largeur du parent
        marginVertical: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.darkGrey,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: colors.darkGrey,
        width: "100%",
        backgroundColor: "#fff",
        boxSizing: "border-box" as any, // Pour la version web uniquement
    },
    inputError: {
        borderColor: colors.danger,
    },
    errorText: {
        marginTop: 4,
        color: colors.danger,
        fontSize: 12,
    },
});

export default InputField;
