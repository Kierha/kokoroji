import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../styles/colors";

export type FilterOption = { id: string; label: string };

type Props = {
    label: string;
    options: FilterOption[];
    selected: string;
    /** Callback déclenché lors de la sélection d'une option */
    onSelect: (id: string) => void;
};

/**
 * Ligne de filtres cliquables.
 * Affiche un libellé suivi de plusieurs choix interactifs, 
 * avec un état visuel pour l'option sélectionnée.
 */
export default function FilterRow({ label, options, selected, onSelect }: Props) {
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt.id}
                    onPress={() => onSelect(opt.id)}
                    style={styles.choice}
                >
                    <Text style={[styles.choiceTxt, selected === opt.id && styles.choiceActive]}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 10,
    },
    label: {
        fontWeight: "600",
        marginRight: 6,
        color: colors.darkBlue,
    },
    choice: {
        marginRight: 8,
        marginBottom: 6,
    },
    choiceTxt: {
        color: "#9fb1c8",
        fontWeight: "600",
    },
    choiceActive: {
        color: colors.mediumBlue,
    },
});
