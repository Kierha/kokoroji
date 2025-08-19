import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { colors } from "../styles/colors";
import KoroCoin from "../../src/assets/kokoroji-korocoins.png";

type ChildCardProps = {
    avatar?: string;
    name: string;
    korocoins?: number;
};

/**
 * Affiche une carte résumant les informations d’un enfant :
 * avatar (emoji ou image), prénom, et solde de Koro-Coins.
 *
 * @param avatar - Emoji ou représentation visuelle de l’enfant (optionnel).
 * @param name - Nom/prénom de l’enfant.
 * @param korocoins - Nombre de Koro-Coins cumulés (par défaut 0).
 * @returns JSX.Element - Carte enfant formatée.
 */
export default function ChildCard({
    avatar = "🧒",
    name,
    korocoins = 0,
}: ChildCardProps) {
    return (
        <View style={styles.childCard}>
            <View style={styles.avatarWrapper}>
                <Text style={styles.avatar}>{avatar}</Text>
            </View>
            <Text style={styles.childName} numberOfLines={1} ellipsizeMode="tail">
                {name}
            </Text>
            <View style={styles.korocoinRow}>
                <Image
                    source={KoroCoin}
                    style={styles.korocoinIcon}
                    resizeMode="contain"
                />
                <Text style={styles.korocoinText}>{korocoins}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    childCard: {
        width: 112,
        height: 90,
        marginVertical: 7,
        backgroundColor: "#f7fbff",
        borderRadius: 19,
        borderWidth: 1.2,
        borderColor: colors.mediumBlue,
        alignItems: "center",
        shadowColor: "#2262A7",
        shadowOpacity: 0.08,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        paddingVertical: 7,
        paddingHorizontal: 4,
        justifyContent: "center",
    },
    avatarWrapper: {
        backgroundColor: colors.white,
        width: 29,
        height: 29,
        borderRadius: 14.5,
        marginBottom: 2,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#eef3fa",
    },
    avatar: {
        fontSize: 19,
    },
    childName: {
        fontWeight: "700",
        color: colors.darkBlue,
        fontSize: 13,
        maxWidth: 74,
        textAlign: "center",
        marginVertical: 2,
    },
    korocoinRow: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 14,
        marginTop: 2,
    },
    korocoinIcon: {
        width: 16,
        height: 16,
        marginRight: 3,
    },
    korocoinText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.mediumBlue,
    },
});
