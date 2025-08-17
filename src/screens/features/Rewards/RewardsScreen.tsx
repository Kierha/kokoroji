    import React, { useEffect, useState, useCallback, useMemo } from "react";
    import {
        View,
        Text,
        StyleSheet,
        FlatList,
        TouchableOpacity,
        TextInput,
        Modal,
        KeyboardAvoidingView,
        Platform,
    } from "react-native";
    import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
    import { Ionicons } from "@expo/vector-icons";
    import { useNavigation } from "@react-navigation/native";
    import { colors } from "../../../styles/colors";

    import Loader from "../../../components/Loader";
    import FilterRow from "../../../components/FilterRow";
    import RewardItem from "../../../components/RewardItem";
    import RewardForm from "../../../components/RewardForm";
    import RewardHistory from "../../../components/RewardHistory";
    import AppAlertModal from "../../../components/AppAlertModal";
    import ChildCarousel, { type CarouselChild } from "../../../components/ChildCarousel";
    import ButtonPrimary from "../../../components/ButtonPrimary";
    import ButtonSecondary from "../../../components/ButtonSecondary";
    import RewardSelectionModal from "../../../components/RewardSelectionModal";

    import { getFamily, getChildren } from "../../../services/onboardingService";
    import { getAllRewards, deleteReward } from "../../../services/rewardService";
    import { getRewardsImportedFlag, setRewardsImportedFlag } from "../../../services/settingsFlagsService";
    import { proposeAndImportDefaultRewardsCloud } from "../../../services/rewardImportService";

    import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
    import { normalize } from "../../../utils/text";

    import { addLog, type LogLevel, type LogType } from "../../../services/logService";

    /* ---------- Layout et constantes ---------- */
    const H_PADDING = 20;
    const BOTTOM_BAR_MIN_HEIGHT = 72;
    const GRID_GAP = 10;

    /* ---------- Types et helpers ---------- */

    type RewardListItem = {
        id: number;
        family_id: number;
        title: string;
        description?: string | null;
        cost: number;
        created_by?: string | null;
    };

    type Tier = "" | "basic" | "medium" | "deluxe" | "epic";

    /**
     * Détermine la catégorie de coût ("tier") à partir d'une valeur numérique.
     */
    const tierOf = (cost: number): Tier => {
        if (cost < 50) return "basic";
        if (cost < 100) return "medium";
        if (cost < 150) return "deluxe";
        return "epic";
    };

    type CostRange = "all" | "0-50" | "50-100" | "100-150" | "150+";
    /**
     * Vérifie si un coût appartient à une plage donnée.
     */
    const inRange = (cost: number, range: CostRange) => {
        switch (range) {
            case "0-50":
                return cost >= 0 && cost < 50;
            case "50-100":
                return cost >= 50 && cost < 100;
            case "100-150":
                return cost >= 100 && cost < 150;
            case "150+":
                return cost >= 150;
            default:
                return true;
        }
    };

    /**
     * Sérialise un objet en JSON en toute sécurité (toujours une string).
     */
    const safeJSONString = (obj: unknown) => {
        try {
            return JSON.stringify(obj ?? {});
        } catch {
            return "{}";
        }
    };

    /**
     * Construit le champ child_ids (JSON string) attendu par app_logs.
     * Toujours un tableau, même vide.
     */
    const childIdsJSON = (ids: (number | string)[]) => {
        return JSON.stringify((ids ?? []).map((x) => String(x)));
    };

    /**
     * Enregistre un log métier pour la feature récompenses.
     * @param params - Détail du log
     */
    async function writeRewardLog(params: {
        familyId?: number | null;
        childIds?: (number | string)[];
        logType: LogType;
        level?: LogLevel;
        context: string;
        details?: Record<string, unknown>;
        refId?: string | number;
    }) {
        const {
            familyId,
            childIds = [],
            logType,
            level = "info",
            context,
            details,
            refId,
        } = params;

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

    /**
     * Écran principal des récompenses.
     * - Gère le CRUD des récompenses, l'import, l'attribution, les filtres et l'historique.
     * - Gestion multi-modale et centralisée des états.
     */
    export default function RewardsScreen() {
        const insets = useSafeAreaInsets();
        const navigation = useNavigation();

        const [familyId, setFamilyId] = useState<number | null>(null);
        const [loading, setLoading] = useState(true);

        const [rewards, setRewards] = useState<RewardListItem[]>([]);

        // Recherche / filtres
        const [search, setSearch] = useState("");
        const debouncedSearch = useDebouncedValue(search, 200);
        const [filterBoxOpen, setFilterBoxOpen] = useState(false);
        const [selectedTier, setSelectedTier] = useState<Tier>("");
        const [costRange, setCostRange] = useState<CostRange>("all");

        // Enfants pour carrousel et attribution
        const [childrenRaw, setChildrenRaw] = useState<
            { id: number; name: string; avatarUri?: string | null; korocoins?: number }[]
        >([]);

        // Etats modales et UI
        const [formVisible, setFormVisible] = useState(false);
        const [editReward, setEditReward] = useState<RewardListItem | null>(null);
        const [historyVisible, setHistoryVisible] = useState(false);
        const [importPromptVisible, setImportPromptVisible] = useState(false);
        const [isManageMode, setIsManageMode] = useState(false);
        const [selectVisible, setSelectVisible] = useState(false);
        const [selectReward, setSelectReward] = useState<RewardListItem | null>(null);

        // Confirmation suppression (modale personnalisée)
        const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

        /**
         * Charge toutes les récompenses pour une famille donnée.
         */
        const loadRewards = useCallback(async (fid: number) => {
            const data = await getAllRewards(fid);
            setRewards((data as RewardListItem[]) ?? []);
            await writeRewardLog({
                familyId: fid,
                logType: "reward",
                context: "Chargement des récompenses",
                details: { count: Array.isArray(data) ? data.length : 0 },
            });
        }, []);

        /**
         * Ferme toutes les modales en cours.
         */
        const closeAllModals = useCallback(() => {
            setFormVisible(false);
            setEditReward(null);
            setHistoryVisible(false);
            setSelectVisible(false);
            setSelectReward(null);
        }, []);

        /**
         * Initialisation de l’écran, chargement famille/récompenses/enfants.
         */
        useEffect(() => {
            (async () => {
                try {
                    const fam = await getFamily();
                    if (!fam?.id) throw new Error("Famille introuvable");
                    setFamilyId(fam.id);

                    await writeRewardLog({
                        familyId: fam.id,
                        logType: "reward",
                        context: "Ouverture écran Récompenses",
                        details: { source: "RewardsScreen.mounted" },
                    });

                    const imported = await getRewardsImportedFlag();
                    if (!imported) {
                        setImportPromptVisible(true);
                        await writeRewardLog({
                            familyId: fam.id,
                            logType: "reward",
                            context: "Proposition d'import des récompenses par défaut",
                            details: { importedFlag: false },
                        });
                    } else {
                        await loadRewards(fam.id);
                    }

                    const ch = await getChildren(fam.id);
                    const mapped = (ch ?? []).map((c: any) => ({
                        id: Number(c.id),
                        name: c.name,
                        avatarUri: c.avatar ?? null,
                        korocoins: Number.isFinite(Number(c.korocoins)) ? Number(c.korocoins) : 0,
                    }));
                    setChildrenRaw(mapped);
                } catch (e: any) {
                    console.error("[RewardsScreen] init error:", e);
                    await writeRewardLog({
                        familyId: null,
                        logType: "error",
                        level: "error",
                        context: "Erreur initialisation RewardsScreen",
                        details: { message: String(e?.message ?? e) },
                    });
                } finally {
                    setLoading(false);
                }
            })();
        }, [loadRewards]);

        /**
         * Gère l'import des récompenses par défaut (après validation utilisateur).
         */
        const handleImportAccept = useCallback(async () => {
            if (!familyId) return;
            try {
                await proposeAndImportDefaultRewardsCloud(familyId);
                await setRewardsImportedFlag(true);
                await loadRewards(familyId);

                await writeRewardLog({
                    familyId,
                    logType: "reward",
                    context: "Import des récompenses par défaut accepté",
                    details: { result: "success" },
                });
            } catch (e: any) {
                await writeRewardLog({
                    familyId,
                    logType: "error",
                    level: "error",
                    context: "Echec import récompenses par défaut",
                    details: { message: String(e?.message ?? e) },
                });
            } finally {
                setImportPromptVisible(false);
            }
        }, [familyId, loadRewards]);

        /**
         * Refus d'import, passage au mode manuel.
         */
        const handleImportDecline = useCallback(async () => {
            await setRewardsImportedFlag(true);
            setImportPromptVisible(false);
            if (familyId) {
                await loadRewards(familyId);
                await writeRewardLog({
                    familyId,
                    logType: "reward",
                    context: "Import des récompenses par défaut refusé",
                });
            }
        }, [familyId, loadRewards]);

        /**
         * Ouvre le formulaire de création de récompense.
         */
        const handleCreate = useCallback(() => {
            closeAllModals();
            setEditReward(null);
            setFormVisible(true);
            void writeRewardLog({
                familyId,
                logType: "reward",
                context: "Ouverture du formulaire de création",
            });
        }, [closeAllModals, familyId]);

        /**
         * Ouvre le formulaire d’édition pour la récompense sélectionnée.
         */
        const handleEdit = useCallback(
            (item: RewardListItem) => {
                closeAllModals();
                setEditReward(item);
                setFormVisible(true);
                void writeRewardLog({
                    familyId,
                    logType: "reward",
                    context: "Ouverture du formulaire d'édition",
                    details: { reward_id: item.id, title: item.title, cost: item.cost },
                    refId: item.id,
                });
            },
            [closeAllModals, familyId]
        );

        /**
         * Callback de sauvegarde (création ou édition).
         * Recharge la liste des récompenses après modification.
         */
        const handleSaved = useCallback(
            async () => {
                if (!familyId) return;
                setFormVisible(false);
                const edited = editReward != null;
                const payload = edited
                    ? { action: "update", reward_id: editReward!.id }
                    : { action: "create" as const };

                await writeRewardLog({
                    familyId,
                    logType: edited ? "reward" : "reward_created",
                    context: edited ? "Récompense mise à jour" : "Récompense créée",
                    details: payload,
                    refId: edited ? editReward!.id : undefined,
                });

                setEditReward(null);
                await loadRewards(familyId);
            },
            [familyId, editReward, loadRewards]
        );

        /**
         * Ouvre la modale de confirmation de suppression.
         */
        const handleDeletePress = useCallback(
            (id: number) => {
                setPendingDeleteId(id);
            },
            []
        );

        /**
         * Confirme la suppression après validation dans la modale personnalisée.
         */
        const confirmDelete = useCallback(async () => {
            if (!familyId || !pendingDeleteId) return;

            await deleteReward(pendingDeleteId, familyId);
            await loadRewards(familyId);
            await writeRewardLog({
                familyId,
                logType: "reward",
                context: "Récompense supprimée",
                refId: pendingDeleteId,
            });
            setPendingDeleteId(null);
        }, [pendingDeleteId, familyId, loadRewards]);

        /**
         * Annule la suppression (fermeture modale confirmation).
         */
        const cancelDelete = useCallback(async () => {
            if (pendingDeleteId && familyId) {
                await writeRewardLog({
                    familyId,
                    logType: "reward",
                    context: "Suppression annulée par l'utilisateur",
                    refId: pendingDeleteId,
                });
            }
            setPendingDeleteId(null);
        }, [pendingDeleteId, familyId]);

        /**
         * Ouvre le modal de sélection d’attributaires (enfants), uniquement hors mode gestion.
         */
        const handleSelect = useCallback(
            (item: RewardListItem) => {
                if (isManageMode) return;
                closeAllModals();
                setSelectReward(item);
                setSelectVisible(true);
                void writeRewardLog({
                    familyId,
                    logType: "reward",
                    context: "Ouverture du modal de sélection d'attributaires",
                    refId: item.id,
                    details: { reward_id: item.id, title: item.title, cost: item.cost },
                });
            },
            [isManageMode, closeAllModals, familyId]
        );

        // Normalisation pour recherche (accents, minuscule)
        const norm = (s: string) => normalize((s ?? "").toString());

        /**
         * Filtres appliqués sur la liste en fonction de la recherche, du tier, et du coût.
         */
        const filteredRewards = useMemo(() => {
            const q = norm(debouncedSearch);
            const hasQ = q.length > 0;

            return rewards.filter((r) => {
                if (hasQ) {
                    const hay = `${norm(r.title)} ${norm(r.description ?? "")}`;
                    if (!hay.includes(q)) return false;
                }
                const okTier = !selectedTier || tierOf(r.cost) === selectedTier;
                const okCost = inRange(r.cost, costRange);
                return okTier && okCost;
            });
        }, [rewards, debouncedSearch, selectedTier, costRange]);

        useEffect(() => {
            if (isManageMode) setHistoryVisible(false);
        }, [isManageMode]);

        if (loading) return <Loader />;

        if (!familyId) {
            return (
                <SafeAreaView style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={styles.center}>
                        <Text style={styles.emptyTitle}>Impossible de récupérer la famille</Text>
                    </View>
                </SafeAreaView>
            );
        }

        const carouselChildren: CarouselChild[] = childrenRaw.map((c) => ({
            id: c.id,
            name: c.name,
            avatar: c.avatarUri ?? "🧒",
            korocoins: c.korocoins ?? 0,
        }));

        return (
            <SafeAreaView style={styles.safe} edges={["top"]}>
                <View style={styles.wrapper}>
                    {/* En-tête fixe */}
                    <View style={[styles.fixedHeader, { paddingTop: Math.max(insets.top - 28, 0) }]}>
                        <View style={styles.headerLine}>
                            <TouchableOpacity
                                onPress={() => {
                                    navigation.goBack();
                                    void writeRewardLog({
                                        familyId,
                                        logType: "reward",
                                        context: "Retour depuis RewardsScreen",
                                    });
                                }}
                                accessibilityLabel="Revenir en arrière"
                            >
                                <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Récompenses</Text>
                            <View style={{ width: 26 }} />
                        </View>

                        {carouselChildren.length > 0 && (
                            <View style={{ paddingBottom: 8 }}>
                                <ChildCarousel data={carouselChildren} />
                            </View>
                        )}

                        {/* Recherche + filtres */}
                        <View style={styles.searchWrapper}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Rechercher une récompense…"
                                placeholderTextColor="#b7c7d8"
                                value={search}
                                onChangeText={(v) => {
                                    setSearch(v);
                                }}
                                autoCorrect={false}
                                autoCapitalize="none"
                                returnKeyType="search"
                                onSubmitEditing={() =>
                                    writeRewardLog({
                                        familyId,
                                        logType: "reward",
                                        context: "Recherche récompenses",
                                        details: { query: search.trim() },
                                    })
                                }
                            />
                            <TouchableOpacity
                                style={styles.filtreBtn}
                                onPress={() => {
                                    const next = !filterBoxOpen;
                                    setFilterBoxOpen(next);
                                    void writeRewardLog({
                                        familyId,
                                        logType: "reward",
                                        context: next ? "Ouverture filtres" : "Fermeture filtres",
                                    });
                                }}
                                accessibilityLabel="Ouvrir les filtres"
                            >
                                <Text style={styles.filtreTxt}>Filtres</Text>
                            </TouchableOpacity>
                        </View>

                        {filterBoxOpen && (
                            <View style={styles.filterBox}>
                                <FilterRow
                                    label="Niveau :"
                                    options={[
                                        { id: "", label: "Tous" },
                                        { id: "basic", label: "Basic" },
                                        { id: "medium", label: "Medium" },
                                        { id: "deluxe", label: "Deluxe" },
                                        { id: "epic", label: "Epic" },
                                    ]}
                                    selected={selectedTier}
                                    onSelect={(id) => {
                                        setSelectedTier((id as Tier) || "");
                                        void writeRewardLog({
                                            familyId,
                                            logType: "reward",
                                            context: "Changement filtre niveau",
                                            details: { tier: id || "all" },
                                        });
                                    }}
                                />
                                <FilterRow
                                    label="Coût :"
                                    options={[
                                        { id: "all", label: "Tous" },
                                        { id: "0-50", label: "0–50" },
                                        { id: "50-100", label: "50–100" },
                                        { id: "100-150", label: "100–150" },
                                        { id: "150+", label: "150+" },
                                    ]}
                                    selected={costRange}
                                    onSelect={(id) => {
                                        setCostRange((id as CostRange) || "all");
                                        void writeRewardLog({
                                            familyId,
                                            logType: "reward",
                                            context: "Changement filtre coût",
                                            details: { range: id },
                                        });
                                    }}
                                />
                            </View>
                        )}

                        <View style={{ height: 12 }} />
                    </View>

                    {/* Grille 2 colonnes */}
                    <FlatList
                        data={filteredRewards}
                        keyExtractor={(it) => String(it.id)}
                        renderItem={({ item }) => (
                            <View style={styles.gridItem}>
                                <RewardItem
                                    id={item.id}
                                    title={item.title}
                                    description={item.description ?? ""}
                                    cost={item.cost}
                                    category={tierOf(item.cost)}
                                    isManageMode={isManageMode}
                                    onEdit={() => handleEdit(item)}
                                    onDelete={() => handleDeletePress(item.id)}
                                    onPress={() => (!isManageMode ? handleSelect(item) : undefined)}
                                />
                            </View>
                        )}
                        numColumns={2}
                        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: H_PADDING }}
                        contentContainerStyle={{
                            gap: GRID_GAP,
                            paddingBottom: insets.bottom + 16,
                            flexGrow: 1,
                        }}
                        style={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>Aucune récompense disponible</Text>
                                <Text style={styles.emptySubtitle}>Ajustez vos filtres ou ajoutez une récompense.</Text>
                            </View>
                        }
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={() =>
                            writeRewardLog({
                                familyId,
                                logType: "reward",
                                context: "Défilement liste récompenses",
                            })
                        }
                    />
                </View>

                {/* Barre du bas */}
                <SafeAreaView edges={["bottom"]} style={styles.bottomBarSafe}>
                    <View style={styles.bottomBarInner}>
                        <View style={styles.leftBtnWrapper}>
                            {isManageMode ? (
                                <ButtonSecondary
                                    title="Ajouter"
                                    onPress={handleCreate}
                                />
                            ) : (
                                <ButtonSecondary
                                    title="Historique"
                                    onPress={() => {
                                        closeAllModals();
                                        setHistoryVisible(true);
                                        void writeRewardLog({
                                            familyId,
                                            logType: "reward",
                                            context: "Ouverture historique des récompenses",
                                        });
                                    }}
                                />
                            )}
                        </View>
                        <View style={styles.rightBtnWrapper}>
                            <ButtonPrimary
                                title={isManageMode ? "Terminer" : "Éditer/Gérer"}
                                onPress={() => {
                                    closeAllModals();
                                    setIsManageMode((s) => {
                                        const next = !s;
                                        void writeRewardLog({
                                            familyId,
                                            logType: "reward",
                                            context: next
                                                ? "Activation mode gestion récompenses"
                                                : "Désactivation mode gestion récompenses",
                                        });
                                        return next;
                                    });
                                }}
                            />
                        </View>
                    </View>
                </SafeAreaView>

                {/* ---------- Modales ---------- */}

                {/* Import première fois */}
                <AppAlertModal
                    visible={importPromptVisible}
                    title="Importer les récompenses par défaut ?"
                    message="Souhaitez-vous importer une liste de récompenses prêtes à l'emploi (vous pourrez les modifier ensuite)."
                    confirmLabel="Valider"
                    cancelLabel="Refuser"
                    onConfirm={handleImportAccept}
                    onCancel={handleImportDecline}
                />

                {/* Formulaire création/édition */}
                <Modal visible={formVisible} transparent animationType="fade" onRequestClose={() => setFormVisible(false)}>
                    <View style={styles.overlay}>
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
                            <View style={styles.formPopup}>
                                <RewardForm
                                    mode={editReward ? "edit" : "create"}
                                    familyId={familyId!}
                                    initial={
                                        editReward
                                            ? {
                                                id: editReward.id,
                                                family_id: editReward.family_id,
                                                title: editReward.title,
                                                description: editReward.description ?? "",
                                                cost: editReward.cost,
                                                created_by: editReward.created_by ?? undefined,
                                            }
                                            : null
                                    }
                                    onCancel={() => {
                                        setFormVisible(false);
                                        setEditReward(null);
                                        void writeRewardLog({
                                            familyId,
                                            logType: "reward",
                                            context: "Fermeture formulaire sans sauvegarde",
                                            details: { mode: editReward ? "edit" : "create" },
                                        });
                                    }}
                                    onSaved={handleSaved}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* Historique (hors mode gestion) */}
                {historyVisible && !isManageMode && (
                    <RewardHistory
                        visible={historyVisible}
                        onClose={() => {
                            setHistoryVisible(false);
                            void writeRewardLog({
                                familyId,
                                logType: "reward",
                                context: "Fermeture historique des récompenses",
                            });
                        }}
                        familyId={familyId!}
                    />
                )}

                {/* Sélection d'attributaires (enfants) */}
                <RewardSelectionModal
                    visible={selectVisible}
                    onClose={() => {
                        setSelectVisible(false);
                        setSelectReward(null);
                        void writeRewardLog({
                            familyId,
                            logType: "reward",
                            context: "Fermeture modal sélection",
                        });
                    }}
                    reward={
                        selectReward
                            ? {
                                id: selectReward.id,
                                title: selectReward.title,
                                description: selectReward.description ?? "",
                                cost: selectReward.cost,
                            }
                            : { id: 0, title: "", description: "", cost: 0 }
                    }
                    childrenData={childrenRaw}
                    onConfirm={async (selectedIds) => {
                        // Attribution réelle à brancher ici si besoin.
                        setSelectVisible(false);
                        setSelectReward(null);

                        await writeRewardLog({
                            familyId,
                            logType: "reward_granted",
                            context: "Attribution de récompense",
                            refId: selectReward?.id,
                            childIds: selectedIds,
                            details: {
                                reward_id: selectReward?.id,
                                title: selectReward?.title,
                                cost: selectReward?.cost,
                                selected_children_count: selectedIds.length,
                            },
                        });

                        // Peut-être à remplacer par une modale personnalisée aussi
                        // Ici on garde Alert pour notifier l'utilisateur que l'attribution a eu lieu
                        // Alert.alert("Attribution", `Enfants sélectionnés : ${selectedIds.length}`);
                    }}
                />

                {/* Confirmation suppression (modale personnalisée) */}
                <AppAlertModal
                    visible={pendingDeleteId !== null}
                    title="Supprimer la récompense"
                    message="Confirmez-vous la suppression ?"
                    confirmLabel="Supprimer"
                    cancelLabel="Annuler"
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                    destructive
                />
            </SafeAreaView>
        );
    }

    /* ---------- Styles ---------- */
    const styles = StyleSheet.create({
        safe: {
            flex: 1,
            backgroundColor: "#eafaff",
        },
        wrapper: {
            flex: 1,
        },
        fixedHeader: {
            paddingHorizontal: H_PADDING,
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
            marginTop: 6,
            marginBottom: 10,
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
            marginTop: 6,
            backgroundColor: "#e9f2ff",
            borderRadius: 16,
            padding: 14,
        },
        gridItem: {
            flex: 1,
            minWidth: 0,
        },
        emptyState: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 40,
        },
        emptyTitle: {
            fontWeight: "800",
            color: colors.darkBlue,
            fontSize: 16,
            textAlign: "center",
        },
        emptySubtitle: {
            color: colors.darkBlue,
            opacity: 0.8,
            textAlign: "center",
            marginTop: 6,
        },
        bottomBarSafe: {
            backgroundColor: "#eafaff",
            borderTopWidth: 1,
            borderTopColor: "#cfe8f4",
        },
        bottomBarInner: {
            flexDirection: "row",
            justifyContent: "center",
            paddingHorizontal: H_PADDING,
            paddingVertical: 12,
            minHeight: BOTTOM_BAR_MIN_HEIGHT,
        },
        leftBtnWrapper: {
            flex: 0.4,
            marginHorizontal: 4,
        },
        rightBtnWrapper: {
            flex: 0.6,
            marginHorizontal: 4,
        },
        center: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        overlay: {
            flex: 1,
            backgroundColor: "rgba(33,41,51,0.23)",
            justifyContent: "center",
            alignItems: "center",
        },
        kav: {
            width: "100%",
            alignItems: "center",
        },
        formPopup: {
            width: "94%",
            maxWidth: 560,
            backgroundColor: colors.white,
            borderRadius: 21,
            padding: 16,
            shadowColor: "#222",
            shadowOpacity: 0.13,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
            maxHeight: "92%",
        },
    });
