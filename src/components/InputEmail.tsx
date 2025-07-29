/**
 * Composant InputEmail : champ de saisie d'email avec gestion de l'affichage des erreurs.
 * Utilisé dans les formulaires pour garantir la cohérence UX et l’accessibilité.
 */
import React from "react";
import { TextInput, StyleSheet, View, Text } from "react-native";
import { colors } from "../styles/colors";

/**
 * Champ de saisie d'email avec gestion de l'affichage des erreurs.
 * UX : met en avant l'accessibilité et la clarté des retours utilisateur.
 * @param value Valeur courante du champ
 * @param onChangeText Callback appelée à chaque modification
 * @param placeholder Texte d'aide affiché si vide
 * @param error Message d'erreur à afficher sous le champ
 * @returns JSX.Element
 */
interface InputEmailProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
}

const InputEmail: React.FC<InputEmailProps> = ({
    value,
    onChangeText,
    placeholder = "Email",
    error,
}) => {
    return (
        <View style={styles.container}>
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                accessibilityLabel="Champ email"
                importantForAutofill="yes"
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
        width: "100%",           // S'étire sur la largeur du conteneur parent
        backgroundColor: "#fff",
        boxSizing: "border-box" as any, // Pour la version web uniquement
    },
    inputError: {
        borderColor: colors.pink, // Bordure rose en cas d'erreur
    },
    errorText: {
        marginTop: 4,
        color: colors.pink,
        fontSize: 12,
    },
});

export default InputEmail;
