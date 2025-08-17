import React from "react";
import { View, Text, StyleSheet } from "react-native";
import HistoryModal from "./HistoryModal";
import { colors } from "../styles/colors";
import { getSessionHistory } from "../services/sessionHistoryService";
import type { SessionHistoryEntry } from "../models/sessionHistory";

type Props = {
    visible: boolean;
    onClose: () => void;
    familyId: number;
    title?: string;
};

/** Formate une date-time ISO en JJ/MM/AAAA HH:MM local (24h). */
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
 * Modal d’historique dédié aux sessions réalisées par une famille.
 * S’appuie sur le composant générique HistoryModal pour la recherche et le filtrage.
 */
export default function SessionHistory({ visible, onClose, familyId, title = "Historique des sessions" }: Props) {
    return (
        <HistoryModal<SessionHistoryEntry>
            visible={visible}
            onClose={onClose}
            title={title}
            fetchData={({ search, startDate, endDate }) =>
                getSessionHistory(familyId, { search, startDate, endDate })
            }
            renderItem={(item) => (
                <View>
                    <Text style={styles.titleLine}>
                        {item.session_type ? `Session ${item.session_type}` : "Session"}
                        {item.location ? ` • ${item.location}` : ""}
                    </Text>
                    <Text style={styles.detailLine}>
                        {`Défis : ${item.defis_count} • KoroCoins : ${item.coins_sum}`}
                    </Text>
                    <Text style={styles.detailLine}>
                        {`Participants : ${item.participants.length}`}
                    </Text>
                    <Text style={styles.dateLine}>
                        {fmtDateTime(item.started_at)}
                        {item.ended_at ? ` → ${fmtDateTime(item.ended_at)}` : ""}
                    </Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    titleLine: {
        fontWeight: "700",
        color: colors.darkBlue,
    },
    detailLine: {
        marginTop: 2,
        color: colors.darkBlue,
    },
    dateLine: {
        marginTop: 2,
        color: colors.mediumBlue,
    },
});
