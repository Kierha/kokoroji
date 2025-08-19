import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

type AppAlertModalProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    destructive?: boolean;
};

/**
 * Composant modal d’alerte avec un titre, un message et deux boutons d’action.
 * Permet de confirmer ou annuler une action, avec possibilité de style destructif.
 *
 * @param visible - Contrôle la visibilité de la modal.
 * @param title - Titre principal de la modal.
 * @param message - Message informatif ou explicatif affiché.
 * @param confirmLabel - Texte du bouton de confirmation (par défaut "Valider").
 * @param cancelLabel - Texte du bouton d’annulation (par défaut "Annuler").
 * @param onConfirm - Callback appelé lors de la confirmation.
 * @param onCancel - Callback optionnel appelé lors de l’annulation.
 * @param destructive - Indique si l’action est destructive (style rouge).
 * @returns JSX.Element - Composant modal prêt à l’usage.
 */
export default function AppAlertModal({
    visible,
    title,
    message,
    confirmLabel = "Valider",
    cancelLabel = "Annuler",
    onConfirm,
    onCancel,
    destructive = false,
}: AppAlertModalProps) {
    // Couleur accentuée selon la nature de l’action
    const accentColor = destructive ? "#EB5757" : colors.mediumBlue;

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={[styles.title, destructive && { color: "#EB5757" }]}>
                        {title}
                    </Text>
                    <Text style={styles.message}>{message}</Text>
                    <View
                        style={[
                            styles.buttonsRow,
                            !onCancel && { justifyContent: "center" },
                        ]}
                    >
                        {onCancel && (
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={onCancel}
                                accessibilityLabel={cancelLabel}
                            >
                                <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                { backgroundColor: accentColor, shadowColor: accentColor },
                                !onCancel && { flex: 1, marginRight: 0 },
                            ]}
                            onPress={onConfirm}
                            accessibilityLabel={confirmLabel}
                        >
                            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(31,41,55,0.18)",
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "92%",
        maxWidth: 420,
        backgroundColor: colors.white,
        borderRadius: 28,
        paddingVertical: 34,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.12,
        shadowRadius: 17,
        elevation: 10,
        alignItems: "center",
    },
    title: {
        fontSize: 23,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 13,
        letterSpacing: 0.4,
        textAlign: "center",
    },
    message: {
        fontSize: 16,
        color: colors.darkBlue,
        textAlign: "center",
        marginBottom: 28,
        opacity: 0.93,
        lineHeight: 23,
    },
    buttonsRow: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
    },
    cancelBtn: {
        flex: 1,
        marginRight: 12,
        borderRadius: 13,
        paddingVertical: 12,
        backgroundColor: colors.lightGreen,
        alignItems: "center",
    },
    cancelBtnText: {
        color: colors.darkBlue,
        fontWeight: "600",
        fontSize: 17,
    },
    confirmBtn: {
        flex: 1,
        borderRadius: 13,
        paddingVertical: 12,
        alignItems: "center",
        shadowOpacity: 0.1,
        shadowRadius: 7,
        elevation: 1,
    },
    confirmBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 17,
        letterSpacing: 0.6,
    },
});
