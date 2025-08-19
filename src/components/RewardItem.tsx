import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    LayoutAnimation,
    Text as RNText,
    NativeSyntheticEvent,
    TextLayoutEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";

const coinImg = require("../assets/kokoroji-korocoins.png");

type RewardItemProps = {
    id?: number;
    title: string;
    description?: string;
    cost: number;
    category?: "basic" | "medium" | "deluxe" | "epic" | string;
    isManageMode?: boolean;
    selected?: boolean;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    testID?: string;
};

/**
 * Composant d’affichage d’une carte "Récompense".
 * - Affiche le titre, le coût en KoroCoins, la description (expandable) et la catégorie.
 * - En mode gestion, affiche les boutons d’édition et suppression.
 * - Gère dynamiquement le nombre de lignes affichées pour la description.
 */
export default function RewardItem({
    title,
    description,
    cost,
    category,
    isManageMode = false,
    selected = false,
    onPress,
    onEdit,
    onDelete,
    testID = "reward-item",
}: RewardItemProps) {
    const [expanded, setExpanded] = useState(false);
    const [fullLineCount, setFullLineCount] = useState(0);

    // Nombre de lignes max affichées quand la description est réduite
    const COLLAPSED_LINES = 3;
    const EXPANDED_LINES = 8;
    const showChevron = (fullLineCount || 0) > COLLAPSED_LINES;

    // Détermine le style du badge catégorie selon la valeur fournie
    const catStyle = useMemo(() => {
        switch ((category || "").toLowerCase()) {
            case "basic":
                return { bg: "#E6F4FF", fg: "#0969DA", bd: "#B6D7FF" };
            case "medium":
                return { bg: "#FFF4E5", fg: "#B26A00", bd: "#F2C690" };
            case "deluxe":
                return { bg: "#F3E8FF", fg: "#6E2DB5", bd: "#C8A7FF" };
            case "epic":
                return { bg: "#FFE6EA", fg: "#B3261E", bd: "#FFC2CC" };
            default:
                return { bg: "#EFEFEF", fg: "#333333", bd: "#E0E0E0" };
        }
    }, [category]);

    // Gestion du "toggle" de description avec animation native
    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(v => !v);
    };

    // Mesure le nombre réel de lignes de la description (via un Text invisible)
    const onMeasureLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
        setFullLineCount(e.nativeEvent.lines.length);
    };

    // Wrapper pour rendre toute la carte cliquable ou non selon le mode
    const CardWrapper = isManageMode ? View : TouchableOpacity;
    const cardWrapperProps = isManageMode
        ? {}
        : {
            activeOpacity: 0.85,
            onPress,
            accessibilityRole: "button" as const,
            accessibilityLabel: `Ouvrir récompense ${title}`,
        };

    return (
        <CardWrapper {...cardWrapperProps} testID={testID} style={styles.cardWrapper}>
            <View
                style={[
                    styles.card,
                    selected && styles.cardSelected,
                    isManageMode && styles.cardManage,
                ]}
            >
                {/* Titre */}
                <View style={styles.titleZone}>
                    <Text style={styles.title} numberOfLines={2}>
                        {title}
                    </Text>
                </View>

                {/* Coût */}
                <View style={styles.costZone} accessibilityLabel={`Coût ${cost} KoroCoins`}>
                    <Image source={coinImg} style={styles.coin} />
                    <Text style={styles.costText}>{cost}</Text>
                </View>

                {/* Description (expandable) */}
                {!!description && (
                    <View style={styles.descZone}>
                        <Text
                            style={styles.desc}
                            numberOfLines={expanded ? EXPANDED_LINES : COLLAPSED_LINES}
                        >
                            {description}
                        </Text>
                        {/* Mesure invisible */}
                        <RNText
                            style={styles.hiddenMeasure}
                            onTextLayout={onMeasureLayout}
                            numberOfLines={undefined}
                        >
                            {description}
                        </RNText>
                    </View>
                )}

                {/* Barre du bas : badge + actions/chevron */}
                <View style={styles.bottomRow}>
                    {!!category && (
                        <View
                            style={[
                                styles.badge,
                                { backgroundColor: catStyle.bg, borderColor: catStyle.bd },
                            ]}
                        >
                            <Text style={[styles.badgeText, { color: catStyle.fg }]} numberOfLines={1}>
                                {category}
                            </Text>
                        </View>
                    )}

                    <View style={styles.bottomRight}>
                        {/* Boutons gestion (édition/suppression) */}
                        {isManageMode && (
                            <>
                                <TouchableOpacity
                                    onPress={onEdit}
                                    style={[styles.iconBtnSmall, styles.iconEdit]}
                                    accessibilityLabel="Modifier la récompense"
                                    testID="reward-edit"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="create-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onDelete}
                                    style={[styles.iconBtnSmall, styles.iconDelete]}
                                    accessibilityLabel="Supprimer la récompense"
                                    testID="reward-delete"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Chevron d’expansion (affiché seulement si > 3 lignes) */}
                        {showChevron && !isManageMode && (
                            <TouchableOpacity
                                onPress={handleToggle}
                                accessibilityRole="button"
                                accessibilityLabel={expanded ? "Réduire la description" : "Déployer la description"}
                                testID="reward-toggle"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.chevronBtn}
                            >
                                <Ionicons
                                    name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
                                    size={22}
                                    color={(colors as any).primary ?? "#2E7DFF"}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </CardWrapper>
    );
}

/* --- Dimensions homogènes --- */
const CARD_HEIGHT = 232;
const TITLE_ZONE_H = 52;
const COST_ZONE_H = 28;
const BOTTOM_ROW_H = 38;

/* ---------- Styles (reformaté et indenté) ---------- */
const styles = StyleSheet.create({
    cardWrapper: {
        flex: 1,
    },
    card: {
        position: "relative",
        height: CARD_HEIGHT,
        borderRadius: 18,
        backgroundColor: (colors as any).card ?? "#FFFFFF",
        borderWidth: 1,
        borderColor: (colors as any).border ?? "rgba(0,0,0,0.08)",
        paddingHorizontal: 12,
        paddingTop: 10,
    },
    cardSelected: {
        borderColor: (colors as any).primary ?? "#2E7DFF",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    cardManage: {
        borderStyle: "dashed",
    },
    titleZone: {
        height: TITLE_ZONE_H,
        justifyContent: "center",
    },
    title: {
        textAlign: "center",
        fontSize: 17,
        fontWeight: "700",
        color: (colors as any).text ?? "#1F2937",
    },
    costZone: {
        height: COST_ZONE_H,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 6,
        marginBottom: 6,
    },
    coin: {
        width: 18,
        height: 18,
        resizeMode: "contain",
    },
    costText: {
        fontSize: 19,
        fontWeight: "800",
        color: (colors as any).primary ?? "#2E7DFF",
    },
    descZone: {
        flex: 1,
        paddingBottom: BOTTOM_ROW_H + 6,
    },
    desc: {
        fontSize: 13.5,
        lineHeight: 18.5,
        color: (colors as any).muted ?? "#4B5563",
    },
    hiddenMeasure: {
        position: "absolute",
        left: -1000,
        top: -1000,
        width: "100%",
        opacity: 0,
        fontSize: 13.5,
        lineHeight: 18.5,
        color: "transparent",
    },
    bottomRow: {
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 8,
        height: BOTTOM_ROW_H,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 13,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    bottomRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    iconBtnSmall: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
    },
    iconEdit: {
        backgroundColor: (colors as any).primary ?? "#2E7DFF",
    },
    iconDelete: {
        backgroundColor: (colors as any).danger ?? "#E53935",
    },
    chevronBtn: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 2,
    },
});

