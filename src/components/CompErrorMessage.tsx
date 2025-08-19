/**
 * Composant ErrorMessage : affiche un message d’erreur stylisé sous un champ ou une zone de formulaire.
 * Permet d’uniformiser l’affichage des erreurs dans l’application Kokoroji.
 */
import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

/**
 * Affiche un message d’erreur sous une couleur distinctive.
 * UX : utilisé pour informer l’utilisateur d’une erreur dans un formulaire ou une action.
 * @param message Texte du message d’erreur à afficher
 * @returns JSX.Element
 */
interface ErrorMessageProps {
    message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
    return <Text style={styles.errorText}>{message}</Text>;
};

const styles = StyleSheet.create({
    errorText: {
        color: colors.danger,
        fontSize: 12,
        marginTop: 4,
    },
});

export default ErrorMessage;
