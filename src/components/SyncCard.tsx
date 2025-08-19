import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import ProgressBar from "./ProgressBar";

type SyncState = "never" | "idle" | "syncing" | "pending";

type SyncCardProps = {
    syncEnabled: boolean;
    progress: number;
    syncState: SyncState;
    lastSync: Date | null;
    onToggle: (next: boolean) => void;
    onSync: () => void;
    onInfo: () => void;
    syncBtnDisabled?: boolean; // Désactive le bouton synchroniser si true
};

const SYNC_LABELS: Record<SyncState, string> = {
    never: "Jamais synchronisé",
    idle: "Synchronisé",
    syncing: "Synchronisation en cours...",
    pending: "Synchronisation en attente",
};

/**
 * Carte affichant l’état et le contrôle de la synchronisation cloud.
 * Permet d’activer/désactiver la sync, visualiser la progression, 
 * et déclencher une synchronisation manuelle.
 *
 * @param syncEnabled - Indique si la synchronisation est activée.
 * @param progress - Progression actuelle de la synchronisation (0 à 1).
 * @param syncState - État actuel du processus de synchronisation.
 * @param lastSync - Date de la dernière synchronisation effective, ou null.
 * @param onToggle - Callback pour activer/désactiver la synchronisation.
 * @param onSync - Callback pour lancer manuellement la synchronisation.
 * @param onInfo - Callback pour afficher des informations supplémentaires.
 * @param syncBtnDisabled - Option pour désactiver le bouton de synchronisation.
 * @returns JSX.Element - Composant carte synchronisation.
 */
export default function SyncCard({
    syncEnabled,
    progress,
    syncState,
    lastSync,
    onToggle,
    onSync,
    onInfo,
    syncBtnDisabled = false,
}: SyncCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Synchronisation cloud</Text>
                <TouchableOpacity onPress={onInfo} style={styles.infoBtn} hitSlop={10}>
                    <Ionicons
                        name="information-circle-outline"
                        size={19}
                        color={colors.mediumBlue}
                    />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.switchRow, !syncEnabled && styles.switchRowDisabled]}
                onPress={() => onToggle(!syncEnabled)}
                activeOpacity={0.75}
            >
                <Text style={styles.switchText}>
                    {syncEnabled
                        ? "Synchronisation activée"
                        : "Synchronisation désactivée"}
                </Text>
                <View
                    style={[
                        styles.switchIndicator,
                        { backgroundColor: syncEnabled ? colors.mediumBlue : "#e7ebef" },
                    ]}
                >
                    <View
                        style={[
                            styles.switchDot,
                            {
                                backgroundColor: syncEnabled ? "#fff" : "#bfc4cc",
                                marginLeft: syncEnabled ? 21 : 2,
                            },
                        ]}
                    />
                </View>
            </TouchableOpacity>

            {/* Affichage de l’état de synchronisation avec couleur adaptée */}
            <Text
                style={[
                    styles.stateLabel,
                    syncState === "never" && { color: "#b4b8c1" },
                    syncState === "syncing" && { color: colors.mediumBlue },
                    syncState === "pending" && { color: "#f1a104" },
                ]}
            >
                <Text style={styles.stateLabelPrefix}>État&nbsp;: </Text>
                {SYNC_LABELS[syncState]}
            </Text>

            <ProgressBar progress={progress} disabled={!syncEnabled} />

            <Text style={styles.lastSyncText}>
                Dernière synchronisation :{" "}
                <Text style={{ fontWeight: "600" }}>
                    {lastSync
                        ? `${lastSync.toLocaleDateString()} ${lastSync.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}`
                        : "Aucune donnée"}
                </Text>
            </Text>

            <TouchableOpacity
                style={[
                    styles.syncBtn,
                    (!syncEnabled || syncBtnDisabled) && { backgroundColor: "#dde3ea" },
                ]}
                disabled={!syncEnabled || syncBtnDisabled}
                onPress={onSync}
            >
                <Ionicons
                    name="cloud-upload-outline"
                    size={17}
                    color={
                        !syncEnabled || syncBtnDisabled ? "#bfc4cc" : colors.mediumBlue
                    }
                    style={{ marginRight: 6 }}
                />
                <Text
                    style={[
                        styles.syncBtnText,
                        (!syncEnabled || syncBtnDisabled) && { color: "#bfc4cc" },
                    ]}
                >
                    Synchroniser maintenant
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        backgroundColor: colors.white,
        borderRadius: 17,
        paddingVertical: 18,
        paddingHorizontal: 18,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        marginBottom: 23,
        alignItems: "center",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
        width: "100%",
    },
    title: {
        fontWeight: "bold",
        fontSize: 16,
        color: colors.mediumBlue,
        flex: 1,
    },
    infoBtn: {
        marginLeft: 7,
        padding: 3,
    },
    switchRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 3,
        justifyContent: "space-between",
        paddingVertical: 7,
        borderRadius: 9,
        paddingHorizontal: 10,
        backgroundColor: "#eaf6fd",
    },
    switchRowDisabled: {
        backgroundColor: "#f5f5f6",
    },
    switchText: {
        fontWeight: "600",
        fontSize: 15,
        color: colors.darkBlue,
    },
    switchIndicator: {
        width: 44,
        height: 22,
        borderRadius: 12,
        justifyContent: "center",
        backgroundColor: colors.mediumBlue,
    },
    switchDot: {
        width: 17,
        height: 17,
        borderRadius: 10,
        backgroundColor: "#fff",
        marginRight: 2,
    },
    stateLabel: {
        marginTop: 8,
        marginBottom: 4,
        fontSize: 14,
        fontWeight: "600",
        color: colors.mediumBlue,
        textAlign: "center",
        alignSelf: "center",
    },
    lastSyncText: {
        fontSize: 13,
        color: "#8b90a1",
        marginTop: 7,
        marginBottom: 8,
        alignSelf: "center",
        textAlign: "center",
    },
    syncBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#eaf6fd",
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 19,
        marginTop: 6,
        alignSelf: "center",
    },
    syncBtnText: {
        fontWeight: "700",
        color: colors.mediumBlue,
        fontSize: 16,
    },
    stateLabelPrefix: {
        color: colors.darkBlue,
        fontWeight: "600",
        fontSize: 14,
    },
});
