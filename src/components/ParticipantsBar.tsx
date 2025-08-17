import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChildCard from "./ChildCard";
import { colors } from "../styles/colors";

type ChildLite = {
    id: number;
    name: string;
    birthdate: string;
    avatar?: string;
    korocoins?: number;
};

type Props = {
    participants: ChildLite[];
    /** Action optionnelle au tap sur un enfant */
    onPressChild?: (id: number) => void;
};

/** Calcule l'âge approximatif (années révolues) à partir d'une date de naissance ISO. */
function ageFromBirthdate(birthdate: string): number {
    const d = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return Math.max(0, age);
}

/**
 * Barre horizontale listant les participants à une session, avec âge moyen.
 *
 * @param participants - Liste des enfants affichés.
 * @param onPressChild - Callback optionnel lors d’un tap sur un enfant.
 * @returns JSX.Element
 */
export default function ParticipantsBar({ participants, onPressChild }: Props) {
    const avgAge = useMemo(() => {
        if (!participants.length) return 0;
        const ages = participants.map((c) => ageFromBirthdate(c.birthdate));
        return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }, [participants]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Participants</Text>
                <View style={styles.avgBadge}>
                    <Text style={styles.avgText}>Âge moyen : {avgAge} ans</Text>
                </View>
            </View>

            <FlatList
                horizontal
                data={participants}
                keyExtractor={(it) => String(it.id)}
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => onPressChild?.(item.id)} style={styles.itemWrapper}>
                        <ChildCard avatar={item.avatar} name={item.name} korocoins={item.korocoins} />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

/* Styles */
const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        color: colors.darkBlue,
        fontWeight: "800",
        fontSize: 14,
    },
    avgBadge: {
        backgroundColor: "#eef4ff",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "#dbe6ff",
    },
    avgText: {
        color: colors.mediumBlue,
        fontWeight: "700",
        fontSize: 12,
    },

    listContent: {
        paddingVertical: 6,
    },
    itemWrapper: {
        marginRight: 8,
    },
});
