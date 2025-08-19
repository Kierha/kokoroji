// src/components/RewardHistory.tsx
import React from "react";
import { View, Text } from "react-native";
import HistoryModal from "./HistoryModal";
import { getRewardHistory } from "../services/rewardHistoryService";
import { colors } from "../styles/colors";
import type { RewardHistoryEntry } from "../models/rewardHistory";

type Props = {
    visible: boolean;
    onClose: () => void;
    familyId: number;
    title?: string;
};

/**
 * Formate une date/heure ISO en chaîne "dd/mm/yyyy hh:mm".
 * @param s Chaîne ISO date/heure
 * @returns Date et heure formatée (français)
 */
function fmtDateTime(s: string): string {
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/**
 * Affiche l’historique des récompenses d’une famille dans une modal de type "HistoryModal".
 * Permet la recherche, le filtrage par date et l’affichage détaillé de chaque attribution.
 */
export default function RewardHistory({
    visible,
    onClose,
    familyId,
    title = "Historique des récompenses",
}: Props) {
    return (
        <HistoryModal<RewardHistoryEntry>
            visible={visible}
            onClose={onClose}
            title={title}
            fetchData={({ search, startDate, endDate }) =>
                getRewardHistory(familyId, { search, startDate, endDate })
            }
            renderItem={(item) => (
                <View>
                    <Text style={{ fontWeight: "700", color: colors.darkBlue }}>
                        {item.title ?? "Récompense"}
                    </Text>
                    <Text style={{ marginTop: 2, color: colors.darkBlue }}>
                        {typeof item.cost === "number" ? `Coût : ${item.cost} KoroCoins` : ""}
                    </Text>
                    <Text style={{ marginTop: 2, color: colors.darkBlue }}>
                        {`Attribué à ${item.children_ids?.length ?? 0} enfant(s)${item.received_by ? ` • par ${item.received_by}` : ""
                            }`}
                    </Text>
                    <Text style={{ marginTop: 2, color: colors.mediumBlue }}>
                        {fmtDateTime(item.received_at)}
                    </Text>
                </View>
            )}
        />
    );
}
