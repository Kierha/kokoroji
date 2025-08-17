import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import AppAlertModal from "../../../components/AppAlertModal";
import ButtonPrimary from "../../../components/ButtonPrimary";
import ButtonSecondary from "../../../components/ButtonSecondary";
import ChildCard from "../../../components/ChildCard";
import Loader from "../../../components/Loader";
import SessionCard from "../../../components/SessionCard";
import EndSessionModal from "../../../components/EndSessionModal";

import useActiveSession from "../../../hooks/useActiveSession";
import usePhotoAttachment from "../../../hooks/usePhotoAttachment";
import { getChildren, getFamily } from "../../../services/onboardingService";
import { addLog, type LogLevel, type LogType } from "../../../services/logService";
import { awardCoinsForChildren } from "../../../services/sessionService";
import { clearOpenSessionId } from "../../../services/appFlagsActiveSession";

import { colors } from "../../../styles/colors";
import type { SessionConfig } from "../../../models/sessionConfig";

/** Marge horizontale standard de l'écran (UI uniquement, sans impact métier). */
const H_PADDING = 5;
/**
 * Délai minimal (ms) appliqué lors des transitions de défis pour lisser l'animation
 * et éviter les flashs de contenu (valeur empirique sans impact métier).
 */
const MIN_SWAP_DELAY_MS = 280;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/* Sérialisation sûre pour logs */
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
    korocoins?: number | null;
};
type DefiLite = {
    id: string | number;
    title: string;
    description?: string | null;
    category?: string | null;
    location?: string | null;
    duration_min?: number | null;
    points_default?: number | null;
    photo_required?: string | null;
};

function ageFromBirthdate(birthdate: string): number {
    const d = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return Math.max(0, age);
}
function formatHMS(totalSec: number): string {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
const needPhoto = (v?: string | null) => {
    if (!v) return false;
    const n = String(v).trim().toLowerCase();
    return n === "required" || n === "oui" || n === "obligatoire";
};

/**
 * Écran de session active.
 *
 * Permet :
 * - d’afficher le défi courant ou une série (bundle),
 * - de valider/passer un défi,
 * - de gérer les photos requises,
 * - de suivre les métriques de session et d’y mettre fin.
 *
 * @returns JSX.Element
 */
export default function ActiveSessionScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const [familyId, setFamilyId] = useState<number | null>(null);
    const [children, setChildren] = useState<ChildLite[]>([]);
    const [bootLoading, setBootLoading] = useState(true);

    const [endPromptVisible, setEndPromptVisible] = useState(false);
    const [infoVisible, setInfoVisible] = useState(false);
    const [photoAlertVisible, setPhotoAlertVisible] = useState(false);

    // progression + stats
    const [currentIdx, setCurrentIdx] = useState(0);
    const [hasNewPhotoForCurrentDefi, setHasNewPhotoForCurrentDefi] = useState(false);
    const [currentPhotoCount, setCurrentPhotoCount] = useState(0);
    const [validatedCount, setValidatedCount] = useState(0);
    const [gainedCoins, setGainedCoins] = useState(0);
    const [photosCount, setPhotosCount] = useState(0);

    // timers
    const [totalElapsedSec, setTotalElapsedSec] = useState(0);
    const [challengeElapsedSec, setChallengeElapsedSec] = useState(0);
    const sessionStartRef = useRef<number | null>(null);
    const challengeStartRef = useRef<number | null>(null);
    const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // bundle : remplacement local
    const [replacementDefi, setReplacementDefi] = useState<DefiLite | null>(null);

    // loading d’overlay dans la card
    const [cardLoading, setCardLoading] = useState(false);

    // guard pour éviter double init
    const ensuredKeyRef = useRef<string | null>(null);

    const {
        activeSession,
        hasActive,
        pendingDefi,
        bundle,
        refreshActive,
        proposeRandomDefi,
        proposeBundle,
        validateDefi,
        endActiveSession,
        updateRuntime,
        clearRuntime,
        restoreFromRuntimeIfPossible,
    } = useActiveSession({ familyId: familyId ?? 0 });

    const { loading: photoLoading, error: photoError, captureAndAttach, pickAndAttach } = usePhotoAttachment();

    // Boot : famille/enfants + log + refresh + cohérence runtime
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
                    context: "Ouverture écran ActiveSession",
                });
            } catch (e: any) {
                await writeSessionLog({
                    familyId: null,
                    logType: "error",
                    level: "error",
                    context: "Erreur init ActiveSession",
                    details: { message: String(e?.message ?? e) },
                });
            } finally {
                setBootLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (familyId) refreshActive();
    }, [familyId, refreshActive]);

    // Base de temps session
    useEffect(() => {
        if (!activeSession?.started_at) return;
        sessionStartRef.current = new Date(activeSession.started_at).getTime();
    }, [activeSession?.started_at]);

    // Participants
    const participantsIds: number[] = useMemo(() => {
        try {
            const raw = activeSession?.children_ids ?? "[]";
            const arr = JSON.parse(String(raw)) as (string | number)[];
            return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        } catch {
            return [];
        }
    }, [activeSession?.children_ids]);

    const participants: ChildLite[] = useMemo(() => {
        const ids = new Set(participantsIds);
        return children.filter((c) => ids.has(Number(c.id)));
    }, [children, participantsIds]);

    const avgAge = useMemo(() => {
        if (!participants.length) return 0;
        const ages = participants.map((c) => ageFromBirthdate(c.birthdate));
        return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }, [participants]);

    const plannedMin = activeSession?.planned_duration_min ?? null;
    const sessionType = (activeSession?.session_type ?? "random") as "random" | "bundle";
    const startedISO: string | undefined = activeSession?.started_at?.slice?.(0, 10);

    const lastUsedConfig: SessionConfig | null = useMemo(() => {
        if (!activeSession?.id || !familyId) return null;
        return {
            familyId,
            childIds: participantsIds,
            type: sessionType,
            plannedDurationMin: plannedMin ?? undefined,
            location: (activeSession as any)?.location ?? undefined,
            lookbackDays: 30,
            category: (activeSession as any)?.category ?? undefined,
        };
    }, [activeSession, familyId, participantsIds, plannedMin, sessionType]);

    // Restauration au focus (runtime : index bundle, start chrono, compteur photo)
    useFocusEffect(
        useCallback(() => {
            (async () => {
                if (!familyId) return;
                await refreshActive();
                if (!activeSession?.id) return;

                const r = await restoreFromRuntimeIfPossible();
                if (r.restored) {
                    if ((r as any).challengeStartISO) {
                        const t = Date.parse((r as any).challengeStartISO as string);
                        if (Number.isFinite(t)) {
                            challengeStartRef.current = t;
                            setChallengeElapsedSec(Math.max(0, Math.floor((Date.now() - t) / 1000)));
                        }
                    } else {
                        challengeStartRef.current = Date.now();
                        setChallengeElapsedSec(0);
                    }

                    if (typeof (r as any).bundleIndex === "number") setCurrentIdx((r as any).bundleIndex);

                    const restoredCount = (r as any).currentPhotoCount ?? 0;
                    setCurrentPhotoCount(restoredCount);
                    setHasNewPhotoForCurrentDefi(restoredCount > 0);

                    ensuredKeyRef.current = `${activeSession.id}:${sessionType}`;
                    setCardLoading(false);
                    return;
                }

                await ensureInitialProposal();
            })();
        }, [familyId, activeSession?.id, sessionType]),
    );

    // Proposition initiale (avec délai mini pour stabilité UI)
    const ensureInitialProposal = useCallback(async () => {
        if (!lastUsedConfig || !activeSession?.id) return;

        const ensureKey = `${activeSession.id}:${sessionType}`;
        if (ensuredKeyRef.current === ensureKey) return;

        setCardLoading(true);
        const t0 = Date.now();
        try {
            if (sessionType === "random") {
                const d = await proposeRandomDefi(lastUsedConfig);
                const startIso = new Date().toISOString();
                challengeStartRef.current = Date.parse(startIso);
                setChallengeElapsedSec(0);
                setCurrentPhotoCount(0);
                setHasNewPhotoForCurrentDefi(false);

                await updateRuntime({
                    sessionId: activeSession.id,
                    sessionType: "random",
                    randomDefi: d ?? null,
                    bundle: null,
                    bundleIndex: null,
                    challengeStartISO: startIso,
                    currentPhotoCount: 0,
                });
            } else {
                const list = await proposeBundle(lastUsedConfig);
                const startIso = new Date().toISOString();
                challengeStartRef.current = Date.parse(startIso);
                setChallengeElapsedSec(0);
                setCurrentIdx(0);
                setCurrentPhotoCount(0);
                setHasNewPhotoForCurrentDefi(false);

                await updateRuntime({
                    sessionId: activeSession.id,
                    sessionType: "bundle",
                    randomDefi: null,
                    bundle: list ?? [],
                    bundleIndex: 0,
                    challengeStartISO: startIso,
                    currentPhotoCount: 0,
                });
            }
        } finally {
            const spent = Date.now() - t0;
            if (spent < MIN_SWAP_DELAY_MS) await delay(MIN_SWAP_DELAY_MS - spent);
            setCardLoading(false);
            ensuredKeyRef.current = ensureKey;
        }
    }, [lastUsedConfig, activeSession?.id, sessionType, proposeRandomDefi, proposeBundle, updateRuntime]);

    // Défi courant
    const baseBundleDefi: DefiLite | null = useMemo(() => {
        const arr = bundle ?? [];
        return arr.length ? (arr[Math.min(currentIdx, arr.length - 1)] as DefiLite) : null;
    }, [bundle, currentIdx]);

    const currentDefi: DefiLite | null = useMemo(() => {
        if (sessionType === "random") return pendingDefi ?? null;
        return replacementDefi ?? baseBundleDefi;
    }, [sessionType, pendingDefi, replacementDefi, baseBundleDefi]);

    const bundleCount = bundle?.length ?? 0;

    // Timers d’affichage (session + défi)
    useEffect(() => {
        if (!hasActive || !activeSession) return;

        if (tickerRef.current) clearInterval(tickerRef.current);
        tickerRef.current = setInterval(() => {
            const now = Date.now();
            if (sessionStartRef.current) {
                setTotalElapsedSec(Math.max(0, Math.floor((now - sessionStartRef.current) / 1000)));
            }
            if (challengeStartRef.current) {
                setChallengeElapsedSec(Math.max(0, Math.floor((now - challengeStartRef.current) / 1000)));
            }
        }, 1000);

        return () => {
            if (tickerRef.current) {
                clearInterval(tickerRef.current);
                tickerRef.current = null;
            }
        };
    }, [hasActive, activeSession?.id]);

    useEffect(() => {
        if (!currentDefi?.id) return;
        if (!challengeStartRef.current) {
            challengeStartRef.current = Date.now();
            setChallengeElapsedSec(0);
        }
    }, [currentDefi?.id]);

    // Actions
    const openEndSummary = useCallback(() => setEndPromptVisible(true), []);

    const persistChallengeStart = useCallback(async () => {
        if (!activeSession?.id) return;
        const startIso = new Date().toISOString();
        challengeStartRef.current = Date.parse(startIso);
        setChallengeElapsedSec(0);
        await updateRuntime({ sessionId: activeSession.id, challengeStartISO: startIso });
    }, [activeSession?.id, updateRuntime]);

    const goNextInBundle = useCallback(async () => {
        if (sessionType !== "bundle") return;
        const next = currentIdx + 1;
        if (!bundleCount || next >= bundleCount) {
            openEndSummary();
        } else {
            setCardLoading(true);
            setTimeout(async () => {
                setCurrentIdx(next);
                setReplacementDefi(null);
                setCurrentPhotoCount(0);
                setHasNewPhotoForCurrentDefi(false);

                await updateRuntime({
                    sessionId: activeSession!.id,
                    bundleIndex: next,
                    currentPhotoCount: 0,
                });
                await persistChallengeStart();
                setCardLoading(false);
            }, MIN_SWAP_DELAY_MS);
        }
    }, [sessionType, currentIdx, bundleCount, openEndSummary, activeSession?.id, updateRuntime, persistChallengeStart]);

    const handleValidate = useCallback(async () => {
        if (!familyId || !activeSession?.id || !currentDefi) return;

        if (needPhoto(currentDefi.photo_required) && !hasNewPhotoForCurrentDefi) {
            await writeSessionLog({
                familyId,
                childIds: participantsIds,
                logType: "session",
                level: "warning",
                context: "Validation bloquée: photo requise",
                refId: currentDefi.id,
            });
            setPhotoAlertVisible(true);
            return;
        }

        try {
            await validateDefi({
                sessionId: activeSession.id,
                defiId: String(currentDefi.id),
                childIds: participantsIds,
                completedAt: new Date().toISOString(),
            });

            const amount = Number(currentDefi.points_default) || 0;
            if (amount > 0) {
                await awardCoinsForChildren({
                    sessionId: activeSession.id,
                    familyId,
                    childIds: participantsIds,
                    defiId: String(currentDefi.id),
                    amountPerChild: amount,
                    reason: `Défi "${currentDefi.title}"`,
                });
                if (participantsIds.length && amount) {
                    setChildren((prev) =>
                        prev.map((c) =>
                            participantsIds.includes(Number(c.id))
                                ? { ...c, korocoins: (Number(c.korocoins) || 0) + amount }
                                : c,
                        ),
                    );
                }
            }

            setValidatedCount((c) => c + 1);
            setGainedCoins((k) => k + amount * (participantsIds?.length || 1));
            setHasNewPhotoForCurrentDefi(false);
            setCurrentPhotoCount(0);
            await updateRuntime({ sessionId: activeSession.id, currentPhotoCount: 0 });

            if (sessionType === "random") {
                openEndSummary();
                return;
            }
            await goNextInBundle();
        } catch (e: any) {
            await writeSessionLog({
                familyId,
                logType: "error",
                level: "error",
                context: "Echec validation défi",
                details: { message: String(e?.message ?? e), defi_id: currentDefi.id },
            });
            setPhotoAlertVisible(true);
        }
    }, [
        familyId,
        activeSession?.id,
        currentDefi,
        participantsIds,
        sessionType,
        goNextInBundle,
        hasNewPhotoForCurrentDefi,
        validateDefi,
        openEndSummary,
    ]);

    const handlePass = useCallback(async () => {
        setHasNewPhotoForCurrentDefi(false);
        setCurrentPhotoCount(0);

        setCardLoading(true);
        const t0 = Date.now();
        try {
            if (sessionType === "random") {
                if (!lastUsedConfig || !activeSession?.id) return;
                const d = await proposeRandomDefi(lastUsedConfig);
                await updateRuntime({
                    sessionId: activeSession.id,
                    sessionType: "random",
                    randomDefi: d ?? null,
                    bundle: null,
                    bundleIndex: null,
                    currentPhotoCount: 0,
                });
                await persistChallengeStart();
                await writeSessionLog({
                    familyId,
                    childIds: participantsIds,
                    logType: "session",
                    context: "Passer (random) -> reproposition",
                });
                return;
            }

            if (lastUsedConfig && activeSession?.id) {
                const fresh = await proposeRandomDefi(lastUsedConfig);
                if (fresh) {
                    setReplacementDefi(fresh as any);
                    const arr = [...(bundle ?? [])];
                    if (arr.length) {
                        arr[currentIdx] = fresh as any;
                        await updateRuntime({
                            sessionId: activeSession.id,
                            sessionType: "bundle",
                            bundle: arr,
                            bundleIndex: currentIdx,
                            currentPhotoCount: 0,
                        });
                    }
                    await persistChallengeStart();
                }
                await writeSessionLog({
                    familyId,
                    childIds: participantsIds,
                    logType: "session",
                    context: "Passer (bundle) -> reroll local",
                });
            }
        } catch (e: any) {
            await writeSessionLog({
                familyId,
                logType: "error",
                level: "error",
                context: "Echec reroll",
                details: { message: String(e?.message ?? e) },
            });
        } finally {
            const spent = Date.now() - t0;
            if (spent < MIN_SWAP_DELAY_MS) await delay(MIN_SWAP_DELAY_MS - spent);
            setCardLoading(false);
        }
    }, [
        sessionType,
        lastUsedConfig,
        proposeRandomDefi,
        familyId,
        participantsIds,
        bundle,
        currentIdx,
        activeSession?.id,
        updateRuntime,
        persistChallengeStart,
    ]);

    const handleEndSession = useCallback(async () => {
        if (!familyId || !activeSession?.id) return;
        try {
            await endActiveSession(activeSession.id);
            await clearOpenSessionId();
            await clearRuntime();
            await writeSessionLog({
                familyId,
                childIds: participantsIds,
                logType: "session",
                context: "Fin de session",
                refId: activeSession.id,
            });
            setEndPromptVisible(false);
            navigation.goBack();
        } catch (e: any) {
            await writeSessionLog({
                familyId,
                logType: "error",
                level: "error",
                context: "Echec fin de session",
                details: { message: String(e?.message ?? e) },
            });
            setEndPromptVisible(false);
        }
    }, [familyId, activeSession?.id, endActiveSession, navigation, participantsIds, clearRuntime]);

    // Photos
    const handleCapturePhoto = useCallback(async () => {
        if (!familyId || !activeSession?.id) return;
        const id = await captureAndAttach({
            sessionId: activeSession.id,
            familyId,
            childIds: participantsIds,
            sessionType,
            albumDateISO: startedISO,
            defiTitle: currentDefi?.title ?? null,
            defiId: currentDefi?.id ?? null,
        });
        if (id != null) {
            const newCount = currentPhotoCount + 1;
            setHasNewPhotoForCurrentDefi(true);
            setCurrentPhotoCount(newCount);
            setPhotosCount((n) => n + 1);
            await updateRuntime({ sessionId: activeSession.id, currentPhotoCount: newCount });
            await writeSessionLog({
                familyId,
                childIds: participantsIds,
                logType: "session",
                context: "Photo capturée et attachée",
                details: { session_media_id: id, defi_id: currentDefi?.id ?? null },
            });
        } else if (photoError) {
            setPhotoAlertVisible(true);
        }
    }, [
        familyId,
        activeSession?.id,
        captureAndAttach,
        participantsIds,
        photoError,
        sessionType,
        startedISO,
        currentDefi?.title,
        currentDefi?.id,
        currentPhotoCount,
        updateRuntime,
    ]);

    const handlePickFromLibrary = useCallback(async () => {
        if (!familyId || !activeSession?.id) return;
        const id = await pickAndAttach({
            sessionId: activeSession.id,
            familyId,
            childIds: participantsIds,
            sessionType,
            albumDateISO: startedISO,
            defiTitle: currentDefi?.title ?? null,
            defiId: currentDefi?.id ?? null,
        });
        if (id != null) {
            const newCount = currentPhotoCount + 1;
            setHasNewPhotoForCurrentDefi(true);
            setCurrentPhotoCount(newCount);
            setPhotosCount((n) => n + 1);
            await updateRuntime({ sessionId: activeSession.id, currentPhotoCount: newCount });
            await writeSessionLog({
                familyId,
                childIds: participantsIds,
                logType: "session",
                context: "Photo galerie attachée",
                details: { session_media_id: id, defi_id: currentDefi?.id ?? null },
            });
        } else if (photoError) {
            setPhotoAlertVisible(true);
        }
    }, [
        familyId,
        activeSession?.id,
        pickAndAttach,
        participantsIds,
        photoError,
        sessionType,
        startedISO,
        currentDefi?.title,
        currentDefi?.id,
        currentPhotoCount,
        updateRuntime,
    ]);

    // Header (structure alignée avec les autres écrans)
    const Header = (
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 28, 0) }]}>
            <View style={styles.headerLine}>
                <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Revenir en arrière">
                    <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Session en cours</Text>
                <TouchableOpacity onPress={() => setInfoVisible(true)} accessibilityLabel="Informations">
                    <Ionicons name="information-circle-outline" size={24} color={colors.mediumBlue} />
                </TouchableOpacity>
            </View>

            {participants.length > 0 && (
                <>
                    <View style={styles.headerRowPad}>
                        <FlatList
                            data={participants}
                            keyExtractor={(it) => String(it.id)}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 6 }}
                            renderItem={({ item }) => (
                                <View style={{ marginRight: 8 }}>
                                    <ChildCard avatar={item.avatar ?? "🧒"} name={item.name} korocoins={item.korocoins ?? 0} />
                                </View>
                            )}
                        />
                    </View>

                    <View style={styles.headerRowPad}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metaRow}>
                            <View style={styles.badge}>
                                <Ionicons name="hourglass-outline" size={14} color={colors.mediumBlue} />
                                <Text style={styles.badgeText}> {plannedMin ? `${plannedMin} min` : "Durée —"}</Text>
                            </View>
                            <View style={styles.badge}>
                                <Ionicons name="people-outline" size={14} color={colors.mediumBlue} />
                                <Text style={styles.badgeText}> {participants.length} participant(s)</Text>
                            </View>
                            <View style={styles.badge}>
                                <Ionicons name="sparkles-outline" size={14} color={colors.mediumBlue} />
                                <Text style={styles.badgeText}> Âge moyen : {avgAge} ans</Text>
                            </View>
                        </ScrollView>
                    </View>

                    <View style={[styles.headerRowPad, styles.sessionLinePad]}>
                        <View style={styles.sessionBadge}>
                            <Ionicons name="time-outline" size={14} color={colors.mediumBlue} />
                            <Text style={styles.badgeText}> Session {formatHMS(totalElapsedSec)}</Text>
                        </View>
                    </View>
                </>
            )}
        </View>
    );

    // Gates
    if (bootLoading) return <Loader />;

    if (!hasActive || !activeSession) {
        return (
            <SafeAreaView style={styles.safe} edges={["top"]}>
                {Header}
                <View style={styles.body}>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>Aucune session active</Text>
                        <Text style={styles.emptySubtitle}>Revenez à l’écran précédent pour démarrer une session.</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // UI principale
    const placeholderCard = (
        <SessionCard
            loading={true}
            timerSec={challengeElapsedSec}
            title={"Préparation du défi…"}
            points={0}
            description={""}
            photoRequired={false}
            photoCount={0}
        />
    );

    const canRenderRealCard = Boolean(currentDefi);

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            {Header}

            <View style={styles.body}>
                <ScrollView
                    style={styles.cardScroll}
                    contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingTop: 8, paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {canRenderRealCard ? (
                        <SessionCard
                            loading={cardLoading}
                            timerSec={challengeElapsedSec}
                            title={currentDefi!.title}
                            points={Number(currentDefi!.points_default) || 0}
                            index={sessionType === "bundle" ? currentIdx + 1 : undefined}
                            total={sessionType === "bundle" ? bundleCount : undefined}
                            category={currentDefi!.category ?? undefined}
                            location={currentDefi!.location ?? undefined}
                            duration_min={currentDefi!.duration_min ?? undefined}
                            photoRequired={needPhoto(currentDefi!.photo_required)}
                            photoCount={currentPhotoCount}
                            description={currentDefi!.description ?? ""}
                            actions={
                                <View pointerEvents={cardLoading ? "none" : "auto"} style={{ opacity: cardLoading ? 0.5 : 1 }}>
                                    <View style={styles.photoRow}>
                                        <TouchableOpacity
                                            style={styles.photoBtn}
                                            onPress={handleCapturePhoto}
                                            disabled={photoLoading || cardLoading}
                                        >
                                            <Ionicons name="camera-outline" size={18} color={colors.mediumBlue} />
                                            <Text style={styles.photoTxt}>  Photo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.photoBtn}
                                            onPress={handlePickFromLibrary}
                                            disabled={photoLoading || cardLoading}
                                        >
                                            <Ionicons name="images-outline" size={18} color={colors.mediumBlue} />
                                            <Text style={styles.photoTxt}>  Galerie</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ height: 8 }} />
                                    <ButtonPrimary title="Valider ce défi" onPress={handleValidate} disabled={cardLoading} />
                                    <View style={{ height: 8 }} />
                                    <ButtonSecondary title="Passer" onPress={handlePass} disabled={cardLoading} />
                                </View>
                            }
                        />
                    ) : (
                        placeholderCard
                    )}
                </ScrollView>
            </View>

            {/* Footer */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
                <View style={styles.bottomInner}>
                    <ButtonSecondary title="Terminer la session" onPress={() => setEndPromptVisible(true)} />
                </View>
            </SafeAreaView>

            {/* Modales */}
            <AppAlertModal
                visible={infoVisible}
                title="Infos session"
                message={
                    "Validez les défis réalisés par les participant·e·s.\n" +
                    "Le bouton Passer repropose (aléatoire) ou remplace localement (bundle) sans valider.\n" +
                    (photoError ? `\nPhoto : ${photoError}` : "")
                }
                confirmLabel="Fermer"
                onConfirm={() => setInfoVisible(false)}
            />

            <AppAlertModal
                visible={photoAlertVisible}
                title="Photo requise"
                message="Ajoutez une photo pour valider ce défi."
                confirmLabel="OK"
                onConfirm={() => setPhotoAlertVisible(false)}
            />

            <EndSessionModal
                visible={endPromptVisible}
                validatedCount={validatedCount}
                plannedMin={plannedMin}
                photosCount={photosCount}
                gainedCoins={gainedCoins}
                onCloseHome={async () => {
                    await handleEndSession();
                    navigation.getParent()?.navigate("Home");
                }}
                onCloseNew={async () => {
                    await handleEndSession();
                    navigation.navigate("SessionHome");
                }}
                onRequestClose={() => setEndPromptVisible(false)}
            />
        </SafeAreaView>
    );
}

/* Styles */
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
    },

    // header
    headerLine: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        marginTop: Platform.OS === "android" ? 6 : 0,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.darkBlue,
    },
    headerRowPad: {
        paddingHorizontal: H_PADDING,
        paddingBottom: 6,
    },
    metaRow: {
        width: "100%",
    },
    sessionLinePad: {
        paddingTop: 0,
        paddingBottom: 6,
    },
    sessionBadge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderColor: "#e5eaf2",
        borderWidth: 1,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderColor: "#e5eaf2",
        borderWidth: 1,
        marginRight: 5,
    },
    badgeText: {
        color: colors.darkBlue,
        fontWeight: "700",
        fontSize: 12,
    },

    // content
    cardScroll: {
        flex: 1,
    },
    photoRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },
    photoBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderColor: "#d7e1f0",
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    photoTxt: {
        color: colors.mediumBlue,
        fontSize: 13,
    },

    // footer
    bottomSafe: {
        backgroundColor: "#eafaff",
        borderTopWidth: 1,
        borderTopColor: "#cfe8f4",
    },
    bottomInner: {
        paddingHorizontal: H_PADDING,
        paddingVertical: 12,
    },

    // empty state
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.darkBlue,
        textAlign: "center",
    },
    emptySubtitle: {
        marginTop: 6,
        fontSize: 14,
        color: "#6C7A93",
        textAlign: "center",
    },
});
