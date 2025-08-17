import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import AppAlertModal from "../../../components/AppAlertModal";
import ButtonPrimary from "../../../components/ButtonPrimary";
import ButtonSecondary from "../../../components/ButtonSecondary";
import HistoryModal from "../../../components/HistoryModal";
import Loader from "../../../components/Loader";
import SessionConfigModal from "../../../components/SessionConfigModal";

import useActiveSession from "../../../hooks/useActiveSession";
import { getChildren, getFamily } from "../../../services/onboardingService";
import { getSessionHistory } from "../../../services/sessionHistoryService";
import { addLog, type LogLevel, type LogType } from "../../../services/logService";
import {
    clearOpenSessionId,
    clearResumePromptState,
    getOpenSessionId,
    getResumePromptState,
    setOpenSessionId,
    snoozeResumePrompt,
} from "../../../services/appFlagsActiveSession";

import { colors } from "../../../styles/colors";
import type { SessionConfig } from "../../../models/sessionConfig";
import type { SessionHistoryEntry } from "../../../models/sessionHistory";

import KoroImage from "../../../assets/kokoroji-session.png";

const H_PADDING = 20;

/* Helpers logs : sérialisation sûre et mapping enfants */
function safeJSONString(obj: unknown) {
    try {
        return JSON.stringify(obj ?? {});
    } catch {
        return "{}";
    }
}
function childIdsJSON(ids: (number | string)[]) {
    return JSON.stringify((ids ?? []).map((x) => String(x)));
}
async function writeSessionLog(params: {
    familyId?: number | null;
    childIds?: (number | string)[];
    logType: LogType;
    level?: LogLevel;
    context: string;
    details?: Record<string, unknown>;
    refId?: string | number;
}) {
    const { familyId, childIds = [], logType, level = "info", context, details, refId } = params;
    await addLog({
        timestamp: new Date().toISOString(),
        family_id: familyId != null ? String(familyId) : undefined,
        child_ids: childIdsJSON(childIds),
        log_type: logType,
        level,
        context,
        details: details ? safeJSONString(details) : undefined,
        ref_id: refId != null ? String(refId) : undefined,
        is_synced: 0,
        device_info: undefined,
    });
}

type ChildLite = {
    id: number;
    name: string;
    birthdate: string;
    avatar?: string | null;
    korocoins?: number;
};

/**
 * Écran « Session ».
 * - Démarrage d’un défi unique ou d’une session (bundle) selon configuration.
 * - Reprise/terminaison d’une session en cours (guard).
 * - Accès à l’historique des sessions.
 *
 * @returns JSX.Element
 */
export default function SessionScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const [familyId, setFamilyId] = useState<number | null>(null);
    const [children, setChildren] = useState<ChildLite[]>([]);
    const [loading, setLoading] = useState(true);

    const [configVisible, setConfigVisible] = useState(false);
    const [configInitial, setConfigInitial] = useState<Partial<SessionConfig>>({});
    const [resumePromptVisible, setResumePromptVisible] = useState(false);

    const [infoVisible, setInfoVisible] = useState(false);
    const [noEligibleVisible, setNoEligibleVisible] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [activeBlockVisible, setActiveBlockVisible] = useState(false); // guard : session déjà en cours

    const {
        hasActive,
        activeSession,
        ensureSession,
        proposeRandomDefi,
        proposeBundle,
        refreshActive,
        endActiveSession,
    } = useActiveSession({ familyId: familyId ?? 0 });

    // Évite le prompt reprise juste après création de session
    const justStartedRef = useRef(false);

    // Chargement initial : famille, enfants, journalisation, remise à plat des flags incohérents.
    useEffect(() => {
        (async () => {
            try {
                const fam = await getFamily();
                if (!fam?.id) throw new Error("Famille introuvable");
                setFamilyId(fam.id);

                const ch = await getChildren(fam.id);
                setChildren(
                    (ch ?? []).map((c: any) => ({
                        id: Number(c.id),
                        name: c.name,
                        birthdate: c.birthdate,
                        avatar: c.avatar ?? null,
                        korocoins: Number.isFinite(Number(c.korocoins)) ? Number(c.korocoins) : 0,
                    })),
                );

                await writeSessionLog({
                    familyId: fam.id,
                    logType: "session",
                    context: "Ouverture écran SessionScreen",
                });

                await refreshActive();

                // Flag présent mais pas de session active → nettoyage
                const openId = await getOpenSessionId();
                if (!hasActive && openId != null) {
                    await clearOpenSessionId();
                    await clearResumePromptState();
                }
            } catch (e: any) {
                await writeSessionLog({
                    familyId: null,
                    logType: "error",
                    level: "error",
                    context: "Erreur init SessionScreen",
                    details: { message: String(e?.message ?? e) },
                });
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Au focus : refresh + affichage conditionnel du prompt de reprise (si non snoozé)
    useFocusEffect(
        useCallback(() => {
            justStartedRef.current = false;
            (async () => {
                await refreshActive();

                const openId = await getOpenSessionId();
                const state = await getResumePromptState();
                const now = Date.now();
                const snoozedUntil = state.snoozeUntil ? Date.parse(state.snoozeUntil) : 0;

                const shouldShow =
                    Boolean(openId != null) &&
                    Boolean(hasActive) &&
                    !justStartedRef.current &&
                    (!state.sessionId || state.sessionId === openId) &&
                    (!state.snoozeUntil || isNaN(snoozedUntil) || snoozedUntil <= now);

                setResumePromptVisible(shouldShow);
            })();
        }, [refreshActive, hasActive]),
    );

    /** Ouvre la configuration pour un défi aléatoire (guard si session active). */
    const openConfigRandom = useCallback(async () => {
        if (hasActive) {
            setActiveBlockVisible(true);
            return;
        }
        setConfigInitial({
            type: "random",
            plannedDurationMin: 30,
            location: "interieur",
            lookbackDays: 30,
            category: undefined,
        });
        setConfigVisible(true);
        await writeSessionLog({ familyId, logType: "session", context: "open_config_random" });
    }, [familyId, hasActive]);

    /** Ouvre la configuration pour une session bundle (guard si session active). */
    const openConfigBundle = useCallback(async () => {
        if (hasActive) {
            setActiveBlockVisible(true);
            return;
        }
        setConfigInitial({
            type: "bundle",
            plannedDurationMin: 30,
            location: "interieur",
            lookbackDays: 30,
            category: undefined,
        });
        setConfigVisible(true);
        await writeSessionLog({ familyId, logType: "session", context: "open_config_bundle" });
    }, [familyId, hasActive]);

    /** Termine la session courante depuis l’alerte guard. */
    const handleTerminateFromAlert = useCallback(async () => {
        try {
            if (activeSession?.id) {
                await endActiveSession(activeSession.id);
                await clearOpenSessionId();
                await clearResumePromptState();
                await refreshActive();
            }
        } finally {
            setActiveBlockVisible(false);
        }
    }, [activeSession?.id, endActiveSession, refreshActive]);

    /**
     * Validation de la configuration de session.
     * - Création session et mise à jour flag d’ouverture.
     * - Proposition d’un défi (random) ou d’un bundle.
     * - Navigation vers l’écran actif si éligible, sinon affichage d’un message.
     */
    const onConfirmConfig = useCallback(
        async (cfg: SessionConfig) => {
            if (hasActive) {
                setActiveBlockVisible(true);
                return;
            }
            try {
                const s = await ensureSession(cfg);
                if (!s?.id) throw new Error("Session non initialisée");

                await setOpenSessionId(Number(s.id));
                await clearResumePromptState();
                justStartedRef.current = true;

                if (cfg.type === "random") {
                    const pick = await proposeRandomDefi(cfg);
                    if (!pick) {
                        setNoEligibleVisible(true);
                        justStartedRef.current = false;
                        return;
                    }
                    setConfigVisible(false);
                    navigation.navigate("ActiveSession");
                } else {
                    // Composition jusqu’à 12 défis (somme des durées ≤ cible)
                    const list = await proposeBundle(cfg, 12);
                    if (!list.length) {
                        setNoEligibleVisible(true);
                        justStartedRef.current = false;
                        return;
                    }
                    setConfigVisible(false);
                    navigation.navigate("ActiveSession");
                }
            } catch (e: any) {
                await writeSessionLog({
                    familyId,
                    logType: "error",
                    level: "error",
                    context: "Echec onConfirmConfig",
                    details: { message: String(e?.message ?? e) },
                });
                justStartedRef.current = false;
            }
        },
        [ensureSession, proposeRandomDefi, proposeBundle, navigation, familyId, hasActive],
    );

    // Source unique pour l’historique (utilisé par HistoryModal)
    const fetchSessionHistory = useCallback(
        async ({
            search,
            startDate,
            endDate,
        }: {
            search?: string;
            startDate?: string;
            endDate?: string;
        }) => {
            if (!familyId) return [];
            try {
                const data = await getSessionHistory(familyId, { search, startDate, endDate });
                return Array.isArray(data) ? data : [];
            } catch (e: any) {
                await writeSessionLog({
                    familyId,
                    logType: "error",
                    level: "error",
                    context: "getSessionHistory failed",
                    details: { message: String(e?.message ?? e) },
                });
                return [];
            }
        },
        [familyId],
    );

    const headerTopPad = useMemo(() => Math.max(insets.top - 28, 0), [insets.top]);

    if (loading) return <Loader />;

    return (
        <SafeAreaView edges={["top"]} style={styles.safe}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: headerTopPad }]}>
                <View style={styles.headerLine}>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Revenir en arrière">
                        <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Session</Text>
                    <TouchableOpacity onPress={() => setInfoVisible(true)} accessibilityLabel="Informations">
                        <Ionicons name="information-circle-outline" size={24} color={colors.mediumBlue} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Body */}
            <View style={styles.body}>
                <View style={styles.illustrationWrap}>
                    <Image
                        source={KoroImage}
                        resizeMode="contain"
                        style={styles.illustration}
                        accessibilityLabel="Koro illustration"
                    />
                </View>

                <Text style={styles.title}>Choisissez votre format de session</Text>
                <Text style={styles.subtitle}>
                    Lancez un défi unique ou une petite série, adaptés à l’âge moyen des participants et au temps dont
                    vous disposez.
                </Text>

                <View style={styles.spacer12} />
                <ButtonPrimary title="Défi aléatoire" onPress={openConfigRandom} />
                <View style={styles.spacer8} />
                <ButtonSecondary title="Session de défis" onPress={openConfigBundle} />
            </View>

            {/* Bottom bar */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
                <View style={styles.bottomInner}>
                    <ButtonSecondary title="Historique" onPress={() => setHistoryVisible(true)} />
                </View>
            </SafeAreaView>

            {/* Modale configuration */}
            {familyId && (
                <SessionConfigModal
                    visible={configVisible}
                    onClose={() => setConfigVisible(false)}
                    onConfirm={onConfirmConfig}
                    familyId={familyId}
                    childrenData={children}
                    initial={configInitial}
                />
            )}

            {/* Reprise session active (snooze 6h) */}
            <AppAlertModal
                visible={resumePromptVisible}
                title="Reprendre la session en cours ?"
                message="Une session est déjà ouverte. Vous pouvez la reprendre maintenant ou plus tard."
                confirmLabel="Reprendre"
                cancelLabel="Plus tard"
                onConfirm={() => {
                    setResumePromptVisible(false);
                    navigation.navigate("ActiveSession");
                }}
                onCancel={async () => {
                    setResumePromptVisible(false);
                    const openId = await getOpenSessionId();
                    if (openId != null) await snoozeResumePrompt(openId, 360);
                }}
            />

            {/* Guard : empêcher création si session active */}
            <AppAlertModal
                visible={activeBlockVisible}
                title="Une session est déjà en cours"
                message="Terminez la session actuelle ou reprenez-la avant d’en créer une nouvelle."
                confirmLabel="Reprendre"
                cancelLabel="Terminer"
                onConfirm={() => {
                    setActiveBlockVisible(false);
                    navigation.navigate("ActiveSession");
                }}
                onCancel={handleTerminateFromAlert}
            />

            {/* Modal info */}
            <AppAlertModal
                visible={infoVisible}
                title="Comment ça marche ?"
                message={
                    "• Durée prévue (15/30/60 min) : on propose seulement des défis qui rentrent dans ce temps.\n" +
                    "• Défis déjà réalisés : pour éviter la répétition, on exclut ceux réalisés récemment (par défaut sur 30 jours)."
                }
                confirmLabel="Fermer"
                onConfirm={() => setInfoVisible(false)}
            />

            {/* Aucun défi éligible */}
            <AppAlertModal
                visible={noEligibleVisible}
                title="Aucun défi disponible"
                message={
                    "Aucun défi ne correspond à vos critères récents.\n" +
                    "Astuce : essayez une durée plus longue, changez de lieu/catégorie ou attendez quelques jours."
                }
                confirmLabel="Fermer"
                onConfirm={() => setNoEligibleVisible(false)}
            />

            {/* Historique */}
            {historyVisible && familyId && (
                <HistoryModal<SessionHistoryEntry>
                    visible={historyVisible}
                    onClose={() => setHistoryVisible(false)}
                    title="Historique des sessions"
                    fetchData={fetchSessionHistory}
                    renderItem={(item) => (
                        <View>
                            <Text style={styles.hItemTitle}>
                                {item.session_type ? `Session ${item.session_type}` : "Session"}
                                {item.location ? ` • ${item.location}` : ""}
                            </Text>
                            <Text style={styles.hItemLine}>
                                {`Défis : ${item.defis_count} • KoroCoins : ${item.coins_sum} • Participants : ${item.participants.length}`}
                            </Text>
                            <Text style={styles.hItemDate}>
                                {new Date(item.started_at).toLocaleString()}
                                {item.ended_at ? ` → ${new Date(item.ended_at).toLocaleString()}` : ""}
                            </Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // containers
    safe: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    header: {
        paddingHorizontal: H_PADDING,
        backgroundColor: "#eafaff",
    },
    body: {
        flex: 1,
        paddingHorizontal: H_PADDING,
    },
    bottomSafe: {
        backgroundColor: "#eafaff",
        borderTopWidth: 1,
        borderTopColor: "#cfe8f4",
    },
    bottomInner: {
        paddingHorizontal: H_PADDING,
        paddingVertical: 12,
    },

    // header
    headerLine: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        marginTop: Platform.OS === "android" ? 6 : 0,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.darkBlue,
    },

    // illustration
    illustrationWrap: {
        alignItems: "center",
        marginTop: 6,
        marginBottom: 12,
    },
    illustration: {
        width: "100%",
        height: 230,
    },

    // texts
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.darkBlue,
        textAlign: "center",
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: colors.darkBlue,
        opacity: 0.85,
        textAlign: "center",
    },

    // spacing helpers
    spacer12: {
        height: 12,
    },
    spacer8: {
        height: 8,
    },

    // history item
    hItemTitle: {
        fontWeight: "700",
        color: colors.darkBlue,
    },
    hItemLine: {
        marginTop: 2,
        color: colors.darkBlue,
    },
    hItemDate: {
        marginTop: 2,
        color: colors.mediumBlue,
    },
});
