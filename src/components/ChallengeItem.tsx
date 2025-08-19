/**
 * Carte d’affichage d’un défi avec ses métadonnées, badges et actions associées.
 * Gère l’affichage adaptatif selon l’état (complété, sélectionné, mode édition),
 * avec possibilité de replier/déplier la description.
 */

import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    Image,
    NativeSyntheticEvent,
    TextLayoutEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";

const coinImg = require("../assets/kokoroji-korocoins.png");

type DefiItemProps = {
    title: string;
    category?: string;
    location?: string;
    description?: string;
    duration_min?: number;
    points_default?: number;
    photo_required?: boolean | string;
    age_min?: number;
    age_max?: number;
    completed?: boolean;
    /** Date ISO de complétion (affichée si `completed` est vrai) */
    completedAt?: string;
    selected?: boolean;
    trashColor?: string;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    /** Active l’affichage des boutons Éditer/Supprimer */
    showActions?: boolean;
    /** Désactive l’action principale de la carte */
    disablePress?: boolean;
};

/**
 * Met en majuscule la première lettre d’une chaîne.
 */
const capitalize = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : undefined;

/**
 * Formate une date ISO en format JJ/MM/AAAA.
 */
const formatIsoToFr = (iso?: string) => {
    if (!iso) return "";
    const d = iso.slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

/**
 * Composant visuel d’un défi.
 * @param props Données du défi et callbacks associés
 */
export default function DefiItem({
    title,
    category,
    location,
    description,
    duration_min,
    points_default,
    photo_required,
    age_min,
    age_max,
    completed = false,
    completedAt,
    selected = false,
    trashColor = colors.pink,
    onPress,
    onEdit,
    onDelete,
    showActions = false,
    disablePress = false,
}: DefiItemProps) {
    const [expanded, setExpanded] = useState(false);

    // Gestion du troncage du titre et de la description
    const [titleTruncated, setTitleTruncated] = useState(false);
    const [descTruncated, setDescTruncated] = useState(false);

    const handleTitleLayout = useCallback(
        (e: NativeSyntheticEvent<TextLayoutEventData>) => {
            if (!expanded) setTitleTruncated(e.nativeEvent.lines.length > 1);
        },
        [expanded]
    );

    const handleDescLayout = useCallback(
        (e: NativeSyntheticEvent<TextLayoutEventData>) => {
            if (!expanded) {
                const MAX = 2;
                setDescTruncated(e.nativeEvent.lines.length > MAX);
            }
        },
        [expanded]
    );

    /** Bascule l’état déplié/replié avec animation */
    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(v => !v);
    };

    // Détermination de l’affichage "Photo obligatoire"
    const needPhoto =
        typeof photo_required === "string"
            ? photo_required.toLowerCase() === "oui"
            : !!photo_required;

    // Chaîne affichant la tranche d’âge
    let ageStr = "";
    if (typeof age_min === "number" && typeof age_max === "number") {
        ageStr = `${age_min}–${age_max} ans`;
    } else if (typeof age_min === "number") {
        ageStr = `dès ${age_min} ans`;
    } else if (typeof age_max === "number") {
        ageStr = `jusqu’à ${age_max} ans`;
    }

    /**
     * Retourne la configuration visuelle du badge catégorie.
     */
    const getCategoryBadge = (cat?: string) => {
        if (!cat) return null;
        const label = capitalize(cat);
        if (label === "Pédagogique") return { icon: "book-outline", color: "#C8E6C9", text: "Pédagogique" };
        if (label === "Ludique") return { icon: "happy-outline", color: "#FFE0B2", text: "Ludique" };
        return { icon: "ellipse-outline", color: "#E0E0E0", text: label };
    };

    /**
     * Retourne la configuration visuelle du badge lieu.
     */
    const getLocationBadge = (loc?: string) => {
        if (!loc) return null;
        const normalized = capitalize(loc);
        if (normalized === "Intérieur") return { icon: "home-outline", color: "#BBDEFB", text: "Intérieur" };
        if (normalized === "Extérieur") return { icon: "walk-outline", color: "#81D4FA", text: "Extérieur" };
        return { icon: "ellipse-outline", color: "#E0E0E0", text: normalized };
    };

    const categoryBadge = getCategoryBadge(category);
    const locationBadge = getLocationBadge(location);

    // Flèche visible uniquement si le contenu peut être déplié
    const canExpand = titleTruncated || (!!description && descTruncated);

    const completionLine = completed && completedAt ? `Complété le ${formatIsoToFr(completedAt)}` : "";

    return (
        <TouchableOpacity
            style={[styles.card, completed && styles.cardCompleted, selected && styles.cardSelected]}
            activeOpacity={0.85}
            onPress={disablePress ? undefined : onPress}
            accessibilityLabel={`Défi : ${title}`}
        >
            {/* Indicateur d’état */}
            <View
                style={[
                    styles.stateDot,
                    { backgroundColor: completed ? colors.lightGreen : colors.mediumBlue },
                    completed && styles.dotCompleted,
                ]}
            />

            <View style={styles.infoContainer}>
                {/* Titre */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                    <Text
                        style={[styles.title, completed && styles.textCompleted]}
                        numberOfLines={expanded ? undefined : 1}
                        onTextLayout={handleTitleLayout}
                    >
                        {title}
                    </Text>
                </View>

                {/* Badge Catégorie */}
                {categoryBadge && (
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: categoryBadge.color }]}>
                            <Ionicons name={categoryBadge.icon as any} size={14} color={colors.darkBlue} style={{ marginRight: 4 }} />
                            <Text style={styles.badgeText}>{categoryBadge.text}</Text>
                        </View>
                    </View>
                )}

                {/* Badge Lieu */}
                {locationBadge && (
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: locationBadge.color }]}>
                            <Ionicons name={locationBadge.icon as any} size={14} color={colors.darkBlue} style={{ marginRight: 4 }} />
                            <Text style={styles.badgeText}>{locationBadge.text}</Text>
                        </View>
                    </View>
                )}

                {/* Koro-Coins + Durée */}
                <View style={styles.pillsRow}>
                    {typeof points_default === "number" && (
                        <View style={styles.pill}>
                            <Image source={coinImg} style={styles.coinIcon} resizeMode="contain" />
                            <Text style={styles.pillText}>{points_default}</Text>
                        </View>
                    )}
                    {typeof duration_min === "number" && duration_min > 0 && (
                        <View style={styles.pill}>
                            <Ionicons name="time-outline" size={14} color={colors.mediumBlue} style={styles.pillIcon} />
                            <Text style={styles.pillText}>{duration_min} min</Text>
                        </View>
                    )}
                </View>

                {/* Âge + Photo */}
                <View style={styles.pillsRow}>
                    {!!ageStr && (
                        <View style={styles.pill}>
                            <Ionicons name="people" size={14} color={colors.mediumBlue} style={styles.pillIcon} />
                            <Text style={styles.pillText}>{ageStr}</Text>
                        </View>
                    )}
                    <View style={[styles.pill, needPhoto ? styles.pillStrong : null]}>
                        <Ionicons
                            name={needPhoto ? "camera" : "image-outline"}
                            size={14}
                            color={colors.mediumBlue}
                            style={styles.pillIcon}
                        />
                        <Text style={styles.pillText}>
                            {needPhoto ? "Photo obligatoire" : "Photo optionnelle"}
                        </Text>
                    </View>
                </View>

                {/* Ligne complétion */}
                {!!completionLine && (
                    <View style={styles.completionRow}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.lightGreen} style={{ marginRight: 6, marginTop: 1 }} />
                        <Text style={styles.completionText}>{completionLine}</Text>
                    </View>
                )}

                {/* Description */}
                {description && (
                    <Text
                        style={[styles.description, completed && styles.textCompleted]}
                        numberOfLines={expanded ? undefined : 2}
                        onTextLayout={handleDescLayout}
                    >
                        {description}
                    </Text>
                )}
            </View>

            {/* Actions + bouton d’expansion */}
            <View style={styles.actions}>
                {showActions ? (
                    <View style={styles.actionRow}>
                        {onEdit && (
                            <TouchableOpacity onPress={onEdit} style={styles.actionBtn} accessibilityLabel="Modifier le défi">
                                <Ionicons name="pencil" size={21} color={colors.mediumBlue} />
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity onPress={onDelete} style={styles.actionBtn} accessibilityLabel="Supprimer le défi">
                                <Ionicons name="trash-bin" size={22} color={trashColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={{ height: 28 }} />
                )}

                <View style={{ flex: 1 }} />
                {canExpand && (
                    <TouchableOpacity
                        onPress={toggleExpand}
                        style={styles.expandBtn}
                        accessibilityLabel={expanded ? "Réduire la description" : "Déplier la description"}
                    >
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={28} color={colors.mediumBlue} />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 15,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOpacity: 0.09,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardCompleted: {
        opacity: 0.55,
        backgroundColor: "#ecf6ef",
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: colors.mediumBlue,
    },
    stateDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignSelf: "center",
        marginRight: 16,
        borderWidth: 2,
        borderColor: "#fff",
    },
    dotCompleted: {
        borderColor: colors.lightGreen,
    },
    infoContainer: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.darkBlue,
        marginBottom: 1,
    },
    textCompleted: {
        color: "#7da483",
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "nowrap",
        marginBottom: 6,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.darkBlue,
    },
    pillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 6,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "#F4F6F8",
    },
    pillStrong: {
        backgroundColor: "#eaf2fc",
    },
    pillIcon: {
        marginRight: 6,
        marginTop: 1,
    },
    pillText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: colors.mediumBlue,
    },
    coinIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },
    completionRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    completionText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#6f9b75",
    },
    description: {
        fontSize: 13,
        color: "#6C7A93",
    },
    actions: {
        width: 56,
        alignItems: "center",
        marginLeft: 12,
        alignSelf: "stretch",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    actionBtn: {
        padding: 4,
        borderRadius: 14,
        backgroundColor: "#F4F6F8",
        marginLeft: 2,
    },
    expandBtn: {
        alignItems: "center",
        justifyContent: "center",
    },
});
