import React from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MetricCard from "./MetricCard";
import { colors } from "../styles/colors";

const coinImg = require("../assets/kokoroji-korocoins.png");
const endImg = require("../assets/kokoroji-fin-session.png");

type Props = {
    visible: boolean;
    validatedCount: number;
    plannedMin?: number | null;
    photosCount: number;
    gainedCoins: number;
    onCloseHome: () => void;
    onCloseNew: () => void;
    onRequestClose?: () => void;
};

/**
 * Modal de fin de session.
 * Affiche un résumé (défis, durée prévue, photos, Koro-Coins) et propose deux actions de sortie.
 *
 * @param visible - Contrôle la visibilité de la modal.
 * @param validatedCount - Nombre de défis validés durant la session.
 * @param plannedMin - Durée prévue initiale (en minutes), facultative.
 * @param photosCount - Nombre total de photos prises.
 * @param gainedCoins - Total de Koro-Coins gagnés.
 * @param onCloseHome - Action pour retourner à l’accueil.
 * @param onCloseNew - Action pour démarrer une nouvelle session.
 * @param onRequestClose - Callback de fermeture système (Android).
 * @returns JSX.Element
 */
export default function EndSessionModal({
    visible,
    validatedCount,
    plannedMin,
    photosCount,
    gainedCoins,
    onCloseHome,
    onCloseNew,
    onRequestClose,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Image source={endImg} style={styles.illustration} resizeMode="contain" />
                    <Text style={styles.title}>Bravo, session terminée !</Text>

                    <View style={styles.metricsRow}>
                        <MetricCard title="Défis réalisés">
                            <View style={styles.metricValueRow}>
                                <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.mediumBlue} />
                                <Text style={styles.metricValueText}>{validatedCount}</Text>
                            </View>
                        </MetricCard>

                        <MetricCard title="Durée prévue">
                            <View style={styles.metricValueRow}>
                                <Ionicons name="hourglass-outline" size={18} color={colors.mediumBlue} />
                                <Text style={styles.metricValueText}>{plannedMin ? `${plannedMin} min` : "—"}</Text>
                            </View>
                        </MetricCard>
                    </View>

                    <View style={styles.metricsRow}>
                        <MetricCard title="Photos prises">
                            <View style={styles.metricValueRow}>
                                <Ionicons name="camera-outline" size={18} color={colors.mediumBlue} />
                                <Text style={styles.metricValueText}>{photosCount}</Text>
                            </View>
                        </MetricCard>

                        <MetricCard title="Koro-Coins gagnés">
                            <View style={styles.metricValueRow}>
                                <Image source={coinImg} style={styles.coin} />
                                <Text style={styles.metricValueText}>{gainedCoins}</Text>
                            </View>
                        </MetricCard>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={onCloseHome}>
                            <Text style={[styles.btnText, styles.btnTextOutline]}>Accueil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onCloseNew}>
                            <Text style={[styles.btnText, styles.btnTextPrimary]}>Nouvelle session</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/* Styles */
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    card: {
        width: "100%",
        borderRadius: 18,
        backgroundColor: "#fff",
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#e3e9f2",
    },
    illustration: {
        width: "100%",
        height: 140,
        marginBottom: 6,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.darkBlue,
        textAlign: "center",
        marginBottom: 12,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    metricValueRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    metricValueText: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.darkBlue,
    },
    coin: {
        width: 18,
        height: 18,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },
    btn: {
        flex: 1,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
    },
    btnPrimary: {
        backgroundColor: colors.mediumBlue,
    },
    btnOutline: {
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: colors.mediumBlue,
    },
    btnText: {
        fontWeight: "800",
        fontSize: 15,
        textAlign: "center",
        textAlignVertical: "center", // Android
        includeFontPadding: false,   // Android
    },
    btnTextPrimary: {
        color: "#fff",
    },
    btnTextOutline: {
        color: colors.mediumBlue,
    },
});
