import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../styles/colors";
import { useAuth } from "../../../hooks/useAuth";
import { getFamily } from "../../../services/onboardingService";
import { deleteDatabase } from "../../../services/debugUtils";
import { addLog, getLogs } from "../../../services/logService";
import SyncCard from "../../../components/SyncCard";
import AppAlertModal from "../../../components/AppAlertModal";
import Footer from "../../../components/Footer";
import { syncLogsToCloud } from "../../../services/syncService";
import {
    getSyncEnabled,
    setSyncEnabled,
    getSyncState,
    setSyncState,
    getLastSync,
    setLastSync,
    getLastManualSync,
    setLastManualSync,
    SyncState,
} from "../../../services/settingsFlagsService";

/**
 * Écran de paramètres utilisateur.
 * Permet de gérer la synchronisation cloud, déconnexion,
 * options de debug, et affichage des logs.
 *
 * Intègre plusieurs modales de confirmation et d’information.
 *
 * @param navigation - Objet navigation pour gestion écran.
 * @returns JSX.Element - Composant écran paramètres.
 */
export default function SettingsScreen({ navigation }: any) {
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();

    // États locaux pour la gestion des flags et modales
    const [syncEnabled, setSyncEnabledState] = useState(false);
    const [syncModal, setSyncModal] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [syncState, setSyncStateState] = useState<SyncState>("never");
    const [lastSync, setLastSyncState] = useState<Date | null>(null);
    const [progress, setProgress] = useState(0);
    const [showSyncProtection, setShowSyncProtection] = useState(false);
    // const [showResetModal, setShowResetModal] = useState(false); // supprimé (reset onboarding retiré)
    // const [resetSuccess, setResetSuccess] = useState(false);
    const [showDevDangerModal, setShowDevDangerModal] = useState(false);
    const [lastManualSync, setLastManualSyncState] = useState<number | null>(null);
    const [familyId, setFamilyId] = useState<string | undefined>();

    // Récupération de l'ID famille au montage
    useEffect(() => {
        getFamily().then((fam) => setFamilyId(fam?.id?.toString()));
    }, []);

    // Chargement des flags persistants au montage
    useEffect(() => {
        getSyncEnabled().then(setSyncEnabledState).catch(() => setSyncEnabledState(false));
        getSyncState().then(setSyncStateState).catch(() => setSyncStateState("never"));
        getLastSync().then(setLastSyncState).catch(() => setLastSyncState(null));
        getLastManualSync().then(setLastManualSyncState).catch(() => setLastManualSyncState(null));
    }, []);

    // Gestion affichage modal activation/désactivation sync
    const handleToggleSync = () => setSyncModal(true);

    // Gestion affichage modal info synchronisation
    const handleShowInfo = () => setInfoModal(true);

    /**
     * Déclenchement manuel de la synchronisation cloud.
     * Protège contre synchro trop rapprochée (5 min).
     * Gère la progression visuelle, logs et états.
     */
    const handleSyncNow = async () => {
        if (!syncEnabled || !familyId) return;

        const now = Date.now();
        if (lastManualSync && now - lastManualSync < 5 * 60 * 1000) {
            setShowSyncProtection(true);
            return;
        }

        await addLog({
            timestamp: new Date().toISOString(),
            family_id: familyId,
            child_ids: "[]",
            log_type: "sync",
            level: "info",
            context: "Déclenchement manuel de la synchronisation",
            details: JSON.stringify({ triggeredBy: "parent", previousSync: lastSync }),
        });

        setSyncStateState("syncing");
        await setSyncState("syncing");
        setProgress(0.15);

        try {
            setTimeout(() => setProgress(0.4), 350);
            setTimeout(() => setProgress(0.8), 800);

            await syncLogsToCloud();

            setTimeout(async () => {
                setProgress(1);
                await addLog({
                    timestamp: new Date().toISOString(),
                    family_id: familyId,
                    child_ids: "[]",
                    log_type: "sync",
                    level: "info",
                    context: "Synchronisation réussie",
                    details: JSON.stringify({ duration_ms: 1500 }),
                });

                setSyncStateState("idle");
                await setSyncState("idle");
                const newDate = new Date();
                setLastSyncState(newDate);
                await setLastSync(newDate);
                setLastManualSyncState(now);
                await setLastManualSync(now);
            }, 1500);
        } catch (error: any) {
            await addLog({
                timestamp: new Date().toISOString(),
                family_id: familyId,
                child_ids: "[]",
                log_type: "sync",
                level: "error",
                context: "Échec de synchronisation cloud",
                details: JSON.stringify({ error: error?.message || error }),
            });

            setSyncStateState("idle");
            await setSyncState("idle");
        }
    };

    /**
     * Confirmation de l’activation/désactivation de la synchronisation.
     * Met à jour les flags persistants et journalise l’action.
     */
    const handleConfirmSyncToggle = async () => {
        const newValue = !syncEnabled;
        setSyncEnabledState(newValue);
        await setSyncEnabled(newValue);

        const newState: SyncState = newValue ? "idle" : "never";
        setSyncStateState(newState);
        await setSyncState(newState);

        if (!newValue) {
            setLastSyncState(null);
            await setLastSync(null);
        }
        setSyncModal(false);

        if (!familyId) return;
        await addLog({
            timestamp: new Date().toISOString(),
            family_id: familyId,
            child_ids: "[]",
            log_type: "sync",
            level: "info",
            context: syncEnabled
                ? "Désactivation de la synchronisation cloud"
                : "Activation de la synchronisation cloud",
            details: JSON.stringify({ previousState: syncEnabled, newState: newValue }),
        });
    };

    // Reset onboarding retiré (plus utilisé)

    // Suppression complète de la base locale (debug)
    const handleDeleteDb = async () => {
        await deleteDatabase();
        setShowDevDangerModal(false);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            {/* Bouton retour absolu */}
            <TouchableOpacity
                style={[styles.backBtn, { top: insets.top + 2, left: 7 }]}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Retour"
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
                <Ionicons name="arrow-back" size={27} color={colors.mediumBlue} />
            </TouchableOpacity>

            <View style={styles.wrapper}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>Paramètres</Text>

                    <SyncCard
                        syncEnabled={syncEnabled}
                        progress={progress}
                        syncState={syncState}
                        lastSync={lastSync}
                        onToggle={handleToggleSync}
                        onSync={handleSyncNow}
                        onInfo={handleShowInfo}
                    />

                    <TouchableOpacity style={styles.disconnectBtn} onPress={signOut}>
                        <Text style={styles.disconnectText}>Déconnexion</Text>
                    </TouchableOpacity>

                    <View style={{ height: 22 }} />

                    {__DEV__ && (
                        <View style={styles.debugButtonsContainer}>
                            {/* Bouton reset onboarding supprimé */}
                            {__DEV__ && (
                                <TouchableOpacity
                                    style={[styles.settingButton, styles.devDangerButton]}
                                    onPress={() => setShowDevDangerModal(true)}
                                >
                                    <Text style={[styles.settingText, styles.devDangerText]}>
                                        [DEV] Supprimer complètement la base locale
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {__DEV__ && (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: "#F1F3F7",
                                        paddingVertical: 11,
                                        paddingHorizontal: 18,
                                        borderRadius: 13,
                                        alignItems: "center",
                                        marginTop: 7,
                                        borderWidth: 1,
                                        borderColor: colors.mediumBlue,
                                    }}
                                    onPress={async () => {
                                        try {
                                            const logs = await getLogs();
                                            if (!logs.length) {
                                                console.log("==> [DEBUG] Aucun log présent dans la base.");
                                            } else {
                                                const lastLogs = logs.slice(-20).reverse();
                                                console.log(
                                                    `==> [DEBUG] ${logs.length} logs trouvés. Affichage des 20 plus récents :\n`
                                                );
                                                lastLogs.forEach((log, i) => {
                                                    console.log(
                                                        `[${logs.length - i}] [${log.timestamp}] [${log.log_type.toUpperCase()}] [${log.level}] : ${log.context}\nDetails: ${log.details}\n`
                                                    );
                                                });
                                                if (logs.length > 20) {
                                                    console.log(
                                                        `... (${logs.length - 20} autres logs plus anciens masqués pour lisibilité)`
                                                    );
                                                }
                                            }
                                        } catch (e) {
                                            console.error("[DEBUG] Impossible d'afficher les logs :", e);
                                        }
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.mediumBlue,
                                            fontWeight: "700",
                                            fontSize: 16,
                                        }}
                                    >
                                        Afficher logs console (DEBUG)
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
                <Footer />
            </View>

            {/* Modales diverses */}
            <AppAlertModal
                visible={syncModal}
                title={syncEnabled ? "Désactiver la synchronisation" : "Activer la synchronisation"}
                message={
                    syncEnabled
                        ? "La synchronisation cloud sera désactivée. Vos données ne seront plus sauvegardées en ligne."
                        : "La synchronisation cloud permettra de sauvegarder vos données sur nos serveurs sécurisés. Voulez-vous l'activer ?"
                }
                confirmLabel={syncEnabled ? "Désactiver" : "Activer"}
                onConfirm={handleConfirmSyncToggle}
                onCancel={() => setSyncModal(false)}
                destructive={!syncEnabled}
            />
            <AppAlertModal
                visible={infoModal}
                title="À quoi sert la synchronisation cloud ?"
                message={
                    "Cette fonction permet de sauvegarder et restaurer toutes vos données Kokoroji en cas de changement d’appareil ou de problème technique.\n\nAucune donnée personnelle n’est partagée avec des tiers, et vous gardez la maîtrise de vos informations."
                }
                confirmLabel="Fermer"
                onConfirm={() => setInfoModal(false)}
            />
            <AppAlertModal
                visible={showSyncProtection}
                title="Synchronisation trop récente"
                message="Vous ne pouvez synchroniser que toutes les 5 minutes. Veuillez patienter avant d'effectuer une nouvelle synchronisation."
                confirmLabel="Fermer"
                onConfirm={() => setShowSyncProtection(false)}
            />
            {/* Modales reset onboarding supprimées */}
            <AppAlertModal
                visible={showDevDangerModal}
                title="Supprimer la base locale"
                message="Attention, cette opération efface TOUTES les données locales, y compris votre famille, vos enfants, activités, etc. Êtes-vous certain de vouloir continuer ?"
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                destructive
                onConfirm={handleDeleteDb}
                onCancel={() => setShowDevDangerModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f7faff",
    },
    backBtn: {
        position: "absolute",
        zIndex: 22,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 5,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    wrapper: {
        flex: 1,
        justifyContent: "space-between",
    },
    scrollContainer: {
        padding: 18,
        paddingBottom: 26,
        alignItems: "center",
        flexGrow: 1,
    },
    title: {
        fontSize: 22,
        color: colors.darkBlue,
        fontWeight: "bold",
        marginBottom: 28,
        marginTop: 7,
        alignSelf: "center",
        textAlign: "center",
        letterSpacing: 0.4,
    },
    disconnectBtn: {
        alignSelf: "stretch",
        paddingVertical: 14,
        borderRadius: 13,
        backgroundColor: "#eaf6fd",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        marginBottom: 0,
    },
    disconnectText: {
        fontSize: 17,
        color: colors.mediumBlue,
        fontWeight: "600",
        textAlign: "center",
    },
    debugButtonsContainer: {
        width: "100%",
        marginTop: 0,
        gap: 9,
    },
    settingButton: {
        alignSelf: "stretch",
        paddingVertical: 13,
        borderRadius: 13,
        backgroundColor: colors.white,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        marginBottom: 0,
    },
    settingText: {
        fontSize: 17,
        color: colors.mediumBlue,
        fontWeight: "600",
        textAlign: "center",
    },
    // styles reset onboarding supprimés
    devDangerButton: {
        backgroundColor: "#FFE8E8",
        borderColor: "#EB5757",
    },
    devDangerText: {
        color: "#EB5757",
    },
});
