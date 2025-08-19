
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

/**
 * Propriétés du composant AvatarPicker.
 * @property choices Liste des avatars disponibles (emojis)
 * @property selected Avatar actuellement sélectionné
 * @property onSelect Callback appelée lors de la sélection d'un avatar
 * @property disabled Désactive la sélection si true
 */
type AvatarPickerProps = {
    choices: string[];
    selected: string;
    onSelect: (emo: string) => void;
    disabled?: boolean;
};

/**
 * Composant AvatarPicker : permet à l'utilisateur de choisir un avatar parmi une liste d'emojis.
 * UX : met en avant l'accessibilité et le feedback visuel sur la sélection.
 * @param choices Liste des avatars disponibles
 * @param selected Avatar sélectionné
 * @param onSelect Callback lors de la sélection
 * @param disabled Désactive la sélection si true
 * @returns JSX.Element
 */
export function AvatarPicker({ choices, selected, onSelect, disabled }: AvatarPickerProps) {
    return (
        <View style={styles.avatarRow}>
            {choices.map((emo) => (
                <TouchableOpacity
                    key={emo}
                    onPress={() => onSelect(emo)}
                    disabled={disabled}
                >
                    <Text
                        style={[
                            styles.avatarOption,
                            selected === emo && styles.avatarSelected,
                        ]}
                    >
                        {emo}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    avatarRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 12,
        flexWrap: "wrap",
    },
    avatarOption: {
        fontSize: 30,
        marginHorizontal: 6,
        opacity: 0.6,
        borderWidth: 0,
        padding: 2,
    },
    avatarSelected: {
        opacity: 1,
        borderWidth: 1.5,
        borderColor: colors.mediumBlue,
        borderRadius: 10,
        backgroundColor: "#eafaff",
    },
});
