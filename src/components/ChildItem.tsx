import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import { format } from "date-fns";

/**
 * Propriétés du composant ChildItem.
 * @property item Données de l'enfant (avatar, nom, date de naissance)
 * @property onEdit Callback pour éditer l'enfant
 * @property onDelete Callback pour supprimer l'enfant
 * @property loading Désactive les actions si true
 * @property readonly Si true, masque les boutons action (lecture seule)
 */
type ChildItemProps = {
    item: {
        avatar: string;
        name: string;
        birthdate: string | Date;
    };
    onEdit?: () => void;
    onDelete?: () => void;
    loading?: boolean;
    readonly?: boolean;
};

/**
 * Composant ChildItem : affiche les informations d'un enfant avec actions d'édition et suppression.
 * UX : feedback visuel sur la sélection, accessibilité des actions.
 * @param item Données de l'enfant
 * @param onEdit Callback pour éditer
 * @param onDelete Callback pour supprimer
 * @param loading Désactive les actions si true
 * @param readonly Masque les actions si true (profil lecture seule)
 * @returns JSX.Element
 */
export function ChildItem({ item, onEdit, onDelete, loading, readonly }: ChildItemProps) {
    return (
        <View style={styles.childRow}>
            <Text style={{ fontSize: 28, marginRight: 10 }}>{item.avatar}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.childName}>{item.name}</Text>
                <Text style={styles.childBirthdate}>
                    {format(new Date(item.birthdate), "dd/MM/yyyy")}
                </Text>
            </View>
            {/* Actions affichées uniquement si non-readonly */}
            {!readonly && (
                <>
                    {/* Bouton édition */}
                    <TouchableOpacity
                        onPress={onEdit}
                        style={[styles.actionIcon, { backgroundColor: "#E9F2FB" }]}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="modifier"
                    >
                        <Ionicons name="pencil" size={18} color={colors.mediumBlue} />
                    </TouchableOpacity>
                    {/* Bouton suppression */}
                    <TouchableOpacity
                        onPress={onDelete}
                        style={[styles.actionIcon, { backgroundColor: "#FCE9E9" }]}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="supprimer"
                    >
                        <Ionicons name="trash" size={18} color="#E57373" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    childRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        marginVertical: 6,
        paddingHorizontal: 4,
    },
    childName: {
        fontSize: 17,
        color: colors.darkBlue,
        fontWeight: "600",
    },
    childBirthdate: {
        fontSize: 13,
        color: colors.mediumBlue,
    },
    actionIcon: {
        marginLeft: 7,
        padding: 6,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});
