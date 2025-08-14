import React, { useMemo, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Image,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/styles/colors";
import ChildCard from "../components/ChildCard";

export type RewardSelectionModalProps = {
    visible: boolean;
    onClose: () => void;
    reward: { id: number; title: string; description?: string; cost: number };
    childrenData: {
        id: number;
        name: string;
        avatarUri?: string | null;
        korocoins?: number;
    }[];
    onConfirm: (selectedIds: number[]) => void;
    loading?: boolean;
    testID?: string;
};

const DANGER_RED = "#D11A2A"; // Pour cohérence avec RewardForm

/**
 * RewardSelectionModal — Modal d’attribution d’une récompense à un ou plusieurs enfants.
 * Affiche les enfants sous forme de carrousel multi-sélection,
 * la récompense, son coût et la validation conditionnée au solde.
 */
const RewardSelectionModal: React.FC<RewardSelectionModalProps> = ({
    visible,
    onClose,
    reward,
    childrenData,
    onConfirm,
    loading = false,
    testID = "reward-selection-modal",
}) => {
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);

    // Calcule le solde cumulé des enfants sélectionnés
    const totalKorocoinsSelected = useMemo(
        () =>
            childrenData
                .filter((c) => selected.includes(c.id))
                .reduce((s, c) => s + Number(c.korocoins ?? 0), 0),
        [childrenData, selected]
    );

    // Vérifie si la récompense est "affordable" selon le solde cumulé
    const isAffordable = totalKorocoinsSelected >= Number(reward.cost ?? 0);

    // Ajoute/retire un enfant de la sélection
    const toggle = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    // Affiche la carte d’un enfant avec badge de sélection
    const renderChild = ({ item }: { item: any }) => {
        const isSelected = selected.includes(item.id);
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.childWrap, isSelected && styles.childSelected]}
                onPress={() => toggle(item.id)}
                accessibilityLabel={`toggle-child-${item.id}`}
            >
                <ChildCard
                    avatar={item.avatarUri ?? "🧒"}
                    name={item.name}
                    korocoins={item.korocoins ?? 0}
                />
                {isSelected && (
                    <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const coinImg = require("../assets/kokoroji-korocoins.png");

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            {/* Backdrop cliquable */}
            <Pressable style={styles.centerOverlay} onPress={onClose} />

            {/* Carte centrée */}
            <View style={styles.centerCard} testID={testID}>
                {/* Bouton fermeture "danger" */}
                <TouchableOpacity
                    onPress={onClose}
                    accessibilityLabel="fermer-modal-reward"
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                    <Ionicons name="close" size={18} color={DANGER_RED} />
                </TouchableOpacity>

                {/* Titre centré */}
                <Text style={styles.title} numberOfLines={2}>
                    {reward.title}
                </Text>

                {/* Coût + icône */}
                <View style={styles.costRow}>
                    <Image source={coinImg} style={styles.coinIcon} resizeMode="contain" />
                    <Text style={styles.costValue}>{reward.cost}</Text>
                    <Text style={styles.costUnit}> Koro-Coins</Text>
                </View>

                {/* Description repliable */}
                {reward.description ? (
                    <View style={styles.descBlock}>
                        <ScrollView style={{ maxHeight: expanded ? 180 : 64 }}>
                            <Text style={styles.desc}>{reward.description}</Text>
                        </ScrollView>
                        {reward.description?.length > 80 && (
                            <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
                                <Text style={styles.moreLess}>{expanded ? "Voir moins" : "Voir plus"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : null}

                {/* Sélection enfants */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sélection des enfants</Text>
                </View>
                <FlatList
                    data={childrenData}
                    keyExtractor={(it) => String(it.id)}
                    renderItem={renderChild}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12 }}
                    style={{ marginBottom: 12 }}
                />

                {/* Résumé sélection */}
                <View style={styles.summary}>
                    <Text style={styles.summaryLabel}>Enfants sélectionnés : </Text>
                    <Text style={styles.summaryValue}>{selected.length}</Text>
                    <Text style={styles.summaryLabel}>  |  Solde cumulé : </Text>
                    <Text style={[styles.summaryValue, !isAffordable && styles.insufficient]}>
                        {totalKorocoinsSelected}
                    </Text>
                </View>
                {!isAffordable && selected.length > 0 && (
                    <Text style={styles.helperText}>
                        Solde cumulé insuffisant pour couvrir cette récompense.
                    </Text>
                )}

                {/* Bouton Valider */}
                <TouchableOpacity
                    disabled={loading || selected.length === 0 || !isAffordable}
                    onPress={() => onConfirm(selected)}
                    style={[
                        styles.primaryBtn,
                        (loading || selected.length === 0 || !isAffordable) && styles.btnDisabled,
                    ]}
                    accessibilityLabel="valider-attribution"
                >
                    <Text style={styles.primaryBtnText}>{loading ? "Traitement…" : "Valider"}</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
    centerOverlay: {
        position: "absolute",
        inset: 0 as any,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    centerCard: {
        position: "absolute",
        left: 16,
        right: 16,
        top: "50%",
        transform: [{ translateY: -260 }],
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 18,
        maxWidth: 560,
        alignSelf: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: DANGER_RED,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        zIndex: 2,
    },
    title: {
        textAlign: "center",
        fontSize: 18,
        fontWeight: "700",
        color: colors.darkBlue,
        paddingRight: 36,
        paddingLeft: 36,
    },
    costRow: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    coinIcon: {
        width: 24,
        height: 24,
        marginRight: 6,
    },
    costValue: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.mediumBlue,
    },
    costUnit: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.mediumBlue,
        marginLeft: 4,
    },
    descBlock: {
        marginTop: 10,
    },
    desc: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.darkGrey,
        textAlign: "center",
    },
    moreLess: {
        marginTop: 6,
        textAlign: "right",
        color: colors.mediumBlue,
        fontWeight: "600",
    },
    sectionHeader: {
        marginTop: 14,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.darkBlue,
    },
    childWrap: {
        marginRight: 12,
        borderRadius: 18,
    },
    childSelected: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    checkBadge: {
        position: "absolute",
        right: 6,
        top: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.mediumBlue,
    },
    summary: {
        marginTop: 8,
        marginBottom: 6,
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 4,
    },
    summaryLabel: {
        fontSize: 13,
        color: colors.darkGrey,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.darkBlue,
    },
    insufficient: {
        color: DANGER_RED,
    },
    helperText: {
        textAlign: "center",
        fontSize: 12,
        color: DANGER_RED,
        marginBottom: 8,
    },
    primaryBtn: {
        alignSelf: "center",
        minWidth: 200,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: colors.mediumBlue,
        borderRadius: 14,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    primaryBtnText: {
        color: colors.white,
        fontWeight: "700",
        fontSize: 15,
        textAlign: "center",
    },
});

export default RewardSelectionModal;
