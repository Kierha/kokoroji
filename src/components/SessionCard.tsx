import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";

const coinImg = require("../assets/kokoroji-korocoins.png");

type Props = {
    title: string;
    points?: number;
    index?: number;
    total?: number;
    category?: string;
    location?: string;
    duration_min?: number;
    timerSec?: number;
    photoRequired?: boolean;
    photoCount?: number;
    description: string;
    loading?: boolean;
    actions?: React.ReactNode;
};

/**
 * Normalise une chaîne pour comparaisons insensibles à la casse et aux accents.
 * (Utilisé pour catégorisation locale : "Pédagogique"/"Ludique", "Intérieur"/"Extérieur").
 */
const norm = (s?: string | null) =>
    (s ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

/**
 * Carte d’un défi / session listant les méta‑informations (catégorie, lieu, durée,
 * minuterie en cours, exigence photo, points, description) et une zone d’actions.
 * Ne gère aucun état interne métier : uniquement présentation.
 */
export default function SessionCard({
    title,
    points = 0,
    index,
    total,
    category,
    location,
    duration_min,
    timerSec,
    photoRequired = false,
    photoCount = 0,
    description,
    loading = false,
    actions,
}: Props) {
    /** Formate un compteur de secondes en mm:ss. */
    const formatHMS = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${m}:${two(s)}`;
    };

    const cat = norm(category);
    const loc = norm(location);
    const catBadge =
        cat === "pedagogique"
            ? { icon: "book-outline" as const, bg: "#C8E6C9", label: "Pédagogique" }
            : cat === "ludique"
                ? { icon: "happy-outline" as const, bg: "#FFE0B2", label: "Ludique" }
                : null;
    const locBadge =
        loc === "interieur"
            ? { icon: "home-outline" as const, bg: "#BBDEFB", label: "Intérieur" }
            : loc === "exterieur"
                ? { icon: "walk-outline" as const, bg: "#81D4FA", label: "Extérieur" }
                : null;

    // Etat validé : obligation photo satisfaite (≥ 1 photo si requis)
    const photoOk = Boolean(photoRequired && (photoCount ?? 0) > 0);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                {typeof timerSec === "number" ? (
                    <View style={styles.clockPill}>
                        <Ionicons name="time-outline" size={14} color={colors.mediumBlue} />
                        <Text style={styles.clockText}> {formatHMS(timerSec)}</Text>
                    </View>
                ) : null}
                <View style={{ flex: 1 }} />
                {typeof index === "number" && typeof total === "number" && (
                    <Text style={styles.counter}>
                        {index}/{total}
                    </Text>
                )}
            </View>

            <View style={styles.titleRow}>
                <Text style={styles.title}>{title}</Text>
                {points > 0 && (
                    <View style={styles.pointsRow}>
                        <Image source={coinImg} style={styles.coinIcon} />
                        <Text style={styles.pointsText}>{points}</Text>
                    </View>
                )}
            </View>

            <View style={styles.badgeRow}>
                {catBadge && (
                    <View style={[styles.badge, { backgroundColor: catBadge.bg }]}>
                        <Ionicons
                            name={catBadge.icon}
                            size={14}
                            color={colors.darkBlue}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.badgeText}>{catBadge.label}</Text>
                    </View>
                )}
                {locBadge && (
                    <View style={[styles.badge, { backgroundColor: locBadge.bg }]}>
                        <Ionicons
                            name={locBadge.icon}
                            size={14}
                            color={colors.darkBlue}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.badgeText}>{locBadge.label}</Text>
                    </View>
                )}
            </View>

            <View style={styles.metaRow}>
                {typeof duration_min === "number" ? (
                    <View style={styles.metaPill}>
                        <Ionicons name="hourglass-outline" size={14} color={colors.mediumBlue} />
                        <Text style={styles.metaText}> {duration_min} min</Text>
                    </View>
                ) : null}
                {/* Indicateur photo : teinte selon obligation et satisfaction */}
                <View
                    style={[
                        styles.metaPill,
                        photoRequired ? styles.metaPillRequired : null, // highlight si requis
                        photoOk ? styles.metaPillPhotoOk : null, // vert si ok (override)
                    ]}
                >
                    <Ionicons
                        name="camera-outline"
                        size={14}
                        color={photoOk ? "#2E7D32" : colors.mediumBlue}
                    />
                    <Text
                        style={[
                            styles.metaText,
                            photoOk ? styles.metaTextPhotoOk : null,
                        ]}
                    >
                        {" "}
                        {photoRequired ? "Photo obligatoire" : "Photo optionnelle"} • {photoCount}
                    </Text>
                </View>
            </View>

            <Text style={styles.desc}>{description}</Text>

            {actions ? <View style={{ marginTop: 12 }}>{actions}</View> : null}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingInner}>
                        <ActivityIndicator size="large" color={colors.mediumBlue} />
                        <Text style={styles.loadingTxt}>Chargement du défi…</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // Container principal
    card: {
        borderRadius: 16,
        backgroundColor: "#fff",
        padding: 16,
        borderWidth: 1,
        borderColor: "#e3e9f2",
        overflow: "hidden",
    },

    // Lignes structurantes
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
        marginBottom: 6,
    },
    badgeRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 6,
        flexWrap: "wrap",
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 6,
    },

    // Badges / points / métriques
    clockPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderColor: "#e5eaf2",
        borderWidth: 1,
    },
    pointsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    coinIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderColor: "#e5eaf2",
        borderWidth: 1,
    },
    metaPillRequired: {
        backgroundColor: "#eaf2fc",
    },
    metaPillPhotoOk: {
        backgroundColor: "#E6F6EA",
        borderColor: "#BDE7C1",
    },

    // Texte & typographie
    clockText: {
        color: colors.darkBlue,
        fontWeight: "700",
        fontSize: 12,
    },
    counter: {
        color: "#6C7A93",
        fontWeight: "700",
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.darkBlue,
        marginRight: 8,
    },
    pointsText: {
        fontSize: 16,
        fontWeight: "800",
        color: colors.darkBlue,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.darkBlue,
    },
    metaText: {
        color: colors.darkBlue,
        fontWeight: "700",
        fontSize: 12,
    },
    metaTextPhotoOk: {
        color: "#1B5E20",
    },
    desc: {
        color: colors.darkBlue,
        fontSize: 14,
        lineHeight: 20,
    },
    loadingTxt: {
        marginTop: 10,
        color: colors.mediumBlue,
        fontWeight: "700",
    },

    // Overlay chargement
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.7)",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingInner: {
        alignItems: "center",
    },
});
