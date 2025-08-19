import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
    getAllChallenges,
    addChallenge,
    updateChallenge,
    deleteChallenge,
    reactivateChallenges,
} from "../../../services/challengeService";
import { proposeAndImportDefaultChallengesCloud } from "../../../services/challengeImportService";
import { isChallengesImported, setChallengesImported } from "../../../services/settingsFlagsService";
import { getFamily } from "../../../services/onboardingService";
import { logAndMaybeReport } from "../../../services/errorReporting";

import DefiItem from "../../../components/ChallengeItem";
import DefiForm from "../../../components/ChallengeForm";
import HistoryModal from "../../../components/HistoryModal";
import Loader from "../../../components/Loader";
import ButtonPrimary from "../../../components/ButtonPrimary";
import ButtonSecondary from "../../../components/ButtonSecondary";
import AppAlertModal from "../../../components/AppAlertModal";

import FilterRow from "../../../components/FilterRow";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { normalize } from "../../../utils/text";

import { colors } from "../../../styles/colors";
import { Defi } from "../../../models/challenge";
import { DefiHistory } from "../../../models/challengeHistory";
import { getDefiHistory, getDefiHistoryDetailed, DefiHistoryDetailed } from "../../../services/challengeHistoryService";

/**
 * Écran de gestion des défis Kokoroji.
 *
 * Permet au parent :
 * - D'afficher, filtrer et rechercher des défis
 * - De créer, modifier et supprimer des défis
 * - De réactiver des défis complétés
 * - De consulter l'historique des défis réalisés
 * - D'importer la liste de défis par défaut au premier lancement
 *
 * Données :
 * - Récupérées en local (SQLite) via les services
 * - Synchronisées avec le cloud selon l'état `is_synced`
 *
 * @returns JSX.Element - Composant écran de gestion des défis
 */

const H_PADDING = 20;
const BOTTOM_BAR_MIN_HEIGHT = 72;

type AlertConfig = {
    visible: boolean;
    title: string;
    message: string;
    destructive: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void | Promise<void>;
};

export default function ChallengeScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [familyId, setFamilyId] = useState<number>();
    const [allChallenges, setAllChallenges] = useState<Defi[]>([]);
    const [history, setHistory] = useState<DefiHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [importDone, setImportDone] = useState<boolean | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingDefi, setEditingDefi] = useState<Defi>();
    const [historyVisible, setHistoryVisible] = useState(false);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 200);

    const [filterBoxOpen, setFilterBoxOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "done" | "todo">("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");

    const [reactivationMode, setReactivationMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [reactivationInfoVisible, setReactivationInfoVisible] = useState(false);

    const [editMode, setEditMode] = useState(false);

    const [alert, setAlert] = useState<AlertConfig>({
        visible: false,
        title: "",
        message: "",
        destructive: false,
        onConfirm: () => { },
    });

    // Charge tous les défis et l'historique
    const loadAll = useCallback(async () => {
        if (!familyId) return;
        setLoading(true);
        const [chs, histo] = await Promise.all([getAllChallenges(familyId), getDefiHistory(familyId)]);
        setAllChallenges(chs);
        setHistory(histo);
        setLoading(false);
    }, [familyId]);

    // Récupération initiale de la famille et état import
    useEffect(() => {
        (async () => {
            setLoading(true);
            const fam = await getFamily();
            if (fam?.id) {
                setFamilyId(Number(fam.id));
                setImportDone(await isChallengesImported());
            }
            setLoading(false);
        })();
    }, []);

    // Charge les données une fois import effectué
    useEffect(() => {
        if (familyId && importDone) loadAll();
    }, [familyId, importDone, loadAll]);

    // Empêche l’édition et la réactivation d’être actives en même temps
    useEffect(() => {
        if (reactivationMode && editMode) setEditMode(false);
    }, [reactivationMode, editMode]);

    // Demande d'import par défaut si nécessaire
    useEffect(() => {
        if (familyId === undefined || importDone !== false) return;
        setAlert({
            visible: true,
            destructive: false,
            title: "Importer les défis Kokoroji ?",
            message: "Voulez-vous importer la liste de défis proposée par Kokoroji ?",
            // Sonar Reliability onConfirm sans retour Promise
            onConfirm: () => {
                setAlert(a => ({ ...a, visible: false }));
                setLoading(true);
                new Promise<void>(resolve => {
                    proposeAndImportDefaultChallengesCloud(familyId, {
                        onImportSuccess: async () => {
                            await setChallengesImported(true);
                            setImportDone(true);
                            await loadAll();
                            resolve();
                        },
                        onImportCancel: async () => {
                            await setChallengesImported(true);
                            setImportDone(true);
                            resolve();
                        },
                    });
                })
                    .catch(err => {
                        // Journalisation structurée + bruit console limité en dev
                        void logAndMaybeReport('Import Defi - ChallengeScreen prompt', err, { logType: 'defi_import', sentry: false });
                        if (__DEV__) console.warn("Import défaut échoué", err); // Dev only
                    })
                    .finally(() => setLoading(false));
            },
            onCancel: () => {
                setAlert(a => ({ ...a, visible: false }));
                // Pas besoin d'async ici
                void setChallengesImported(true);
                setImportDone(true);
            },
        });
    }, [familyId, importDone, loadAll]);

    // Map des défis complétés
    const validatedIds = useMemo(() => new Set(history.map(h => Number(h.defi_id))), [history]);

    // Dernière date de complétion par défi
    const latestCompletedAtById = useMemo(() => {
        const map = new Map<number, string>();
        for (const h of history) {
            const id = Number(h.defi_id);
            const cur = map.get(id);
            if (!cur || (h.completed_at && h.completed_at > cur)) {
                map.set(id, h.completed_at);
            }
        }
        return map;
    }, [history]);

    // Catégories et lieux disponibles (fixes)
    const allCategories = useMemo(() => ["Pédagogique", "Ludique"], []);
    const allLocations = useMemo(() => ["Intérieur", "Extérieur"], []);

    // Comparaison insensible à la casse/accents
    const eq = (a?: string, b?: string) =>
        normalize((a ?? "").trim()) === normalize((b ?? "").trim());

    // Liste filtrée selon recherche et filtres
    const filtered = useMemo(() => {
        const q = normalize(debouncedSearch);
        const hasQ = q.length > 0;

        return allChallenges.filter(c => {
            if (hasQ) {
                const hay = `${normalize(c.title || "")} ${normalize(c.category || "")} ${normalize(c.location || "")}`;
                if (!hay.includes(q)) return false;
            }

            const done = validatedIds.has(Number(c.id));
            if (statusFilter === "done" && !done) return false;
            if (statusFilter === "todo" && done) return false;

            if (categoryFilter !== "all" && !eq(c.category, categoryFilter)) return false;
            if (locationFilter !== "all" && !eq(c.location, locationFilter)) return false;

            return true;
        });
    }, [allChallenges, debouncedSearch, statusFilter, categoryFilter, locationFilter, validatedIds]);

    const hasCompletedDefis = validatedIds.size > 0;

    // Création ou édition de défi
    const handleSubmit = async (payload: Omit<Defi, "id" | "family_id" | "is_synced">) => {
        if (!familyId) return;
        setModalVisible(false);
        if (editingDefi) {
            await updateChallenge({ ...editingDefi, ...payload, family_id: familyId });
        } else {
            await addChallenge({ ...payload, family_id: familyId, is_synced: 0 });
        }
        setEditingDefi(undefined);
        loadAll();
    };

    // Suppression de défi
    const handleDelete = (defi: Defi) =>
        setAlert({
            visible: true,
            title: "Supprimer ce défi ?",
            message: "Cette action est définitive.",
            destructive: true,
            onConfirm: async () => {
                setAlert(a => ({ ...a, visible: false }));
                if (familyId) {
                    await deleteChallenge(Number(defi.id), familyId);
                    loadAll();
                }
            },
            onCancel: () => setAlert(a => ({ ...a, visible: false })),
        });

    // Sélection pour réactivation
    const toggleSelect = (id: number | string) => {
        const n = Number(id);
        const next = new Set(selectedIds);
        void (next.has(n) ? next.delete(n) : next.add(n));
        setSelectedIds(next);
    };

    // Validation réactivation
    const confirmReactivation = async () => {
        if (!familyId || selectedIds.size === 0) return;
        await reactivateChallenges(familyId, Array.from(selectedIds));
        setReactivationMode(false);
        setSelectedIds(new Set());
        loadAll();
    };

    // Loader si données pas encore prêtes
    if (loading || familyId === undefined || importDone === null) return <Loader />;

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            {/* En-tête fixe */}
            <View style={styles.wrapper}>
                <View style={[styles.fixedHeader, { paddingTop: Math.max(insets.top - 28, 0) }]}>
                    {/* Ligne titre + retour */}
                    <View style={styles.headerLine}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Gérer mes défis</Text>
                        <View style={{ width: 26 }} />
                    </View>

                    {/* Recherche + filtres */}
                    <View style={styles.searchWrapper}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher un défi…"
                            placeholderTextColor="#b7c7d8"
                            value={search}
                            onChangeText={setSearch}
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.filtreBtn}
                            onPress={() => setFilterBoxOpen(!filterBoxOpen)}
                            accessibilityLabel="Ouvrir les filtres"
                        >
                            <Text style={styles.filtreTxt}>Filtres</Text>
                        </TouchableOpacity>
                    </View>

                    {filterBoxOpen && (
                        <View style={styles.filterBox}>
                            <FilterRow
                                label="Statut :"
                                options={[
                                    { id: "all", label: "Tous" },
                                    { id: "done", label: "Faits" },
                                    { id: "todo", label: "À faire" },
                                ]}
                                selected={statusFilter}
                                // Typage explicite (options -> union) au lieu de cast any
                                onSelect={(id: string) => setStatusFilter(id as "all" | "done" | "todo")}
                            />
                            <FilterRow
                                label="Catégorie :"
                                options={[{ id: "all", label: "Toutes" }, ...allCategories.map(c => ({ id: c, label: c }))]}
                                selected={categoryFilter}
                                onSelect={setCategoryFilter}
                            />
                            <FilterRow
                                label="Lieu :"
                                options={[{ id: "all", label: "Tous" }, ...allLocations.map(l => ({ id: l, label: l }))]}
                                selected={locationFilter}
                                onSelect={setLocationFilter}
                            />
                        </View>
                    )}

                    {/* Boutons historique + édition */}
                    <View style={styles.topActionsRow}>
                        <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryVisible(true)}>
                            <Text style={styles.historyTxt}>Historique</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.editBtn, editMode && styles.editBtnActive]}
                            onPress={() => {
                                if (reactivationMode) setReactivationMode(false);
                                setEditMode(v => !v);
                            }}
                            accessibilityLabel={editMode ? "Terminer l’édition" : "Activer l’édition"}
                        >
                            <Text style={[styles.editTxt, editMode && styles.editTxtActive]}>
                                {editMode ? "Terminer" : "Éditer"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Liste des défis */}
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => {
                        const done = validatedIds.has(Number(item.id));
                        const selectable = reactivationMode && done;

                        return (
                            <DefiItem
                                {...item}
                                completed={done}
                                completedAt={latestCompletedAtById.get(Number(item.id))}
                                selected={selectedIds.has(Number(item.id))}
                                trashColor="#D11A2A"
                                onPress={selectable ? () => toggleSelect(item.id!) : undefined}
                                showActions={editMode && !reactivationMode}
                                disablePress={editMode && !reactivationMode}
                                onEdit={
                                    !reactivationMode
                                        ? () => {
                                            setEditingDefi(item);
                                            requestAnimationFrame(() => setModalVisible(true));
                                        }
                                        : undefined
                                }
                                onDelete={!reactivationMode ? () => handleDelete(item) : undefined}
                            />
                        );
                    }}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    contentContainerStyle={{
                        paddingHorizontal: H_PADDING,
                        paddingBottom: BOTTOM_BAR_MIN_HEIGHT + insets.bottom + 8,
                        flexGrow: 1,
                    }}
                    style={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>Aucun défi trouvé</Text>
                            <Text style={styles.emptySubtitle}>Ajustez vos filtres ou ajoutez un nouveau défi.</Text>
                        </View>
                    }
                    keyboardShouldPersistTaps="handled"
                />
            </View>

            {/* Barre du bas */}
            <SafeAreaView edges={["bottom"]} style={styles.bottomBarSafe}>
                <View style={styles.bottomBarInner}>
                    {reactivationMode ? (
                        <>
                            <View style={styles.leftBtnWrapper}>
                                <ButtonPrimary
                                    title="Valider"
                                    disabled={selectedIds.size === 0}
                                    onPress={confirmReactivation}
                                    compact
                                    textStyle={{ fontSize: 15 }}
                                />
                            </View>
                            <View style={styles.rightBtnWrapper}>
                                <ButtonSecondary
                                    title="Terminer"
                                    onPress={() => {
                                        setReactivationMode(false);
                                        setSelectedIds(new Set());
                                    }}
                                />
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.leftBtnWrapper}>
                                <ButtonSecondary
                                    title="Réactivation"
                                    disabled={!hasCompletedDefis}
                                    onPress={() => {
                                        if (!hasCompletedDefis) return;
                                        setReactivationInfoVisible(true);
                                    }}
                                />
                            </View>
                            <View style={styles.rightBtnWrapper}>
                                <ButtonPrimary
                                    title="Ajouter un défi"
                                    onPress={() => {
                                        setEditingDefi(undefined);
                                        requestAnimationFrame(() => setModalVisible(true));
                                    }}
                                    compact
                                    textStyle={{ fontSize: 15 }}
                                />
                            </View>
                        </>
                    )}
                </View>
            </SafeAreaView>

            {/* Modales */}
            <DefiForm
                key={editingDefi ? `edit-${editingDefi.id}` : "create"}
                visible={modalVisible}
                onSubmit={handleSubmit}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingDefi(undefined);
                }}
                initialValue={editingDefi}
                editMode={!!editingDefi}
            />

            <HistoryModal<DefiHistoryDetailed>
                visible={historyVisible}
                onClose={() => setHistoryVisible(false)}
                title="Historique des défis réalisés"
                fetchData={() => (familyId ? getDefiHistoryDetailed(familyId) : Promise.resolve([]))}
                renderItem={item => {
                    // Format date JJ/MM/AAAA HH:MM
                    const d = new Date(item.completed_at);
                    const dd = String(d.getDate()).padStart(2, "0");
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const yyyy = d.getFullYear();
                    const hh = String(d.getHours()).padStart(2, "0");
                    const mi = String(d.getMinutes()).padStart(2, "0");
                    const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;

                    return (
                        <>
                            <Text style={{ fontWeight: "700", color: colors.darkBlue }}>
                                {item.title || `Défi #${item.defi_id}`}
                            </Text>
                            <Text style={{ color: colors.darkBlue, marginTop: 2 }}>
                                {dateStr}
                                {item.completed_by ? ` • Validé par ${item.completed_by}` : ""}
                            </Text>
                            {item.participant_names?.length > 0 && (
                                <Text style={{ color: colors.mediumBlue, marginTop: 2 }}>
                                    Participants : {item.participant_names.join(", ")}
                                </Text>
                            )}
                        </>
                    );
                }}
            />

            <AppAlertModal {...alert} />

            {/* Modale d'explication réactivation */}
            <AppAlertModal
                visible={reactivationInfoVisible}
                title="Mode réactivation"
                message={
                    "Sélectionnez dans la liste les défis déjà complétés que vous souhaitez rendre à nouveau disponibles. " +
                    "Appuyez sur Valider pour confirmer ou Terminer pour quitter le mode. Les défis réactivés réapparaîtront comme ‘à faire’."
                }
                confirmLabel="Commencer"
                onConfirm={() => {
                    setReactivationInfoVisible(false);
                    setEditMode(false);
                    setSelectedIds(new Set());
                    setReactivationMode(true);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    wrapper: {
        flex: 1,
    },
    fixedHeader: {
        paddingHorizontal: 20,
        backgroundColor: "#eafaff",
    },
    list: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    headerLine: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.darkBlue,
    },
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    searchInput: {
        flex: 1,
        backgroundColor: "#f4f9ff",
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 15,
        color: colors.darkBlue,
    },
    filtreBtn: {
        marginLeft: 10,
        backgroundColor: colors.mediumBlue,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    filtreTxt: {
        color: colors.white,
        fontWeight: "700",
        fontSize: 14,
    },
    filterBox: {
        marginTop: 14,
        backgroundColor: "#e9f2ff",
        borderRadius: 16,
        padding: 14,
    },
    topActionsRow: {
        marginTop: 12,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    historyBtn: {
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    historyTxt: {
        color: colors.mediumBlue,
        fontWeight: "700",
        fontSize: 14,
    },
    editBtn: {
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    editBtnActive: {
        backgroundColor: colors.mediumBlue,
    },
    editTxt: {
        color: colors.mediumBlue,
        fontWeight: "700",
        fontSize: 14,
    },
    editTxtActive: {
        color: colors.white,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
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
    bottomBarSafe: {
        backgroundColor: "#eafaff",
        borderTopWidth: 1,
        borderTopColor: "#cfe8f4",
    },
    bottomBarInner: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        minHeight: 72,
        gap: 8,
    },
    leftBtnWrapper: {
        flex: 1,
    },
    rightBtnWrapper: {
        flex: 1,
    },
});

