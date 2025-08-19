import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import Loader from "./Loader";

type HistoryModalProps<T> = {
    visible: boolean;
    onClose: () => void;
    title: string;
    /**
     * Fonction asynchrone de récupération des données
     * @param params search : texte recherché
     * @param params startDate : date de début au format AAAA-MM-JJ
     * @param params endDate : date de fin au format AAAA-MM-JJ
     */
    fetchData: (params: { search?: string; startDate?: string; endDate?: string }) => Promise<T[]>;
    /** Rendu personnalisé d’un élément de la liste */
    renderItem: (item: T) => React.ReactNode;
};

/**
 * Formate une date en chaîne AAAA-MM-JJ (UTC) pour utilisation API.
 */
function formatDateYYYYMMDD(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}

/**
 * Formate une date en chaîne JJ/MM/AAAA (UTC) pour affichage utilisateur.
 */
function formatDateDDMMYYYY(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${da}/${m}/${y}`;
}

/**
 * Modal d’historique générique avec recherche et filtres par dates.
 * Affiche une liste paginée ou un état vide si aucun résultat ne correspond aux critères.
 */
export default function HistoryModal<T>({
    visible,
    onClose,
    title,
    fetchData,
    renderItem,
}: HistoryModalProps<T>) {
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<T[]>([]);

    // Réinitialise les filtres à l'ouverture
    useEffect(() => {
        if (visible) {
            setSearch("");
            setStartDate(undefined);
            setEndDate(undefined);
        }
    }, [visible]);

    const startDateStr = useMemo(() => (startDate ? formatDateYYYYMMDD(startDate) : undefined), [startDate]);
    const endDateStr = useMemo(() => (endDate ? formatDateYYYYMMDD(endDate) : undefined), [endDate]);

    // Charge les données selon les filtres
    useEffect(() => {
        if (!visible) return;
        let cancel = false;
        (async () => {
            setLoading(true);
            const res = await fetchData({
                search: search || undefined,
                startDate: startDateStr,
                endDate: endDateStr,
            });
            if (!cancel) setItems(res);
            setLoading(false);
        })();
        return () => {
            cancel = true;
        };
    }, [visible, search, startDateStr, endDateStr, fetchData]);

    // Focus automatique sur le champ recherche
    const searchInputRef = useRef<TextInput>(null);
    useEffect(() => {
        if (visible) setTimeout(() => searchInputRef.current?.focus(), 300);
    }, [visible]);

    // Gestion des sélecteurs de dates
    const onChangeStart = (_e: DateTimePickerEvent, date?: Date) => {
        setShowStartPicker(false);
        if (date) setStartDate(date);
    };
    const onChangeEnd = (_e: DateTimePickerEvent, date?: Date) => {
        setShowEndPicker(false);
        if (date) setEndDate(date);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>{title}</Text>

                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Recherche..."
                        placeholderTextColor="#b7c9d8"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />

                    <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                            <TouchableOpacity
                                style={styles.dateBtn}
                                onPress={() => setShowStartPicker(true)}
                                accessibilityLabel="Choisir la date de début (Du)"
                            >
                                <Text style={styles.dateLabel}>Du</Text>
                                <Ionicons name="calendar-outline" size={16} color={colors.mediumBlue} style={{ marginHorizontal: 6 }} />
                                <Text style={styles.dateValue}>
                                    {startDate ? formatDateDDMMYYYY(startDate) : "-"}
                                </Text>
                            </TouchableOpacity>
                            {startDate && (
                                <TouchableOpacity
                                    onPress={() => setStartDate(undefined)}
                                    accessibilityLabel="Effacer la date de début"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#9fb1c8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.dateField}>
                            <TouchableOpacity
                                style={styles.dateBtn}
                                onPress={() => setShowEndPicker(true)}
                                accessibilityLabel="Choisir la date de fin (Au)"
                            >
                                <Text style={styles.dateLabel}>Au</Text>
                                <Ionicons name="calendar-outline" size={16} color={colors.mediumBlue} style={{ marginHorizontal: 6 }} />
                                <Text style={styles.dateValue}>
                                    {endDate ? formatDateDDMMYYYY(endDate) : "-"}
                                </Text>
                            </TouchableOpacity>
                            {endDate && (
                                <TouchableOpacity
                                    onPress={() => setEndDate(undefined)}
                                    accessibilityLabel="Effacer la date de fin"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#9fb1c8" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate ?? new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "inline" : "default"}
                            onChange={onChangeStart}
                            maximumDate={endDate}
                        />
                    )}
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate ?? new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "inline" : "default"}
                            onChange={onChangeEnd}
                            minimumDate={startDate}
                        />
                    )}

                    <View style={styles.resultsArea}>
                        {loading ? (
                            <Loader />
                        ) : items.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>Aucun résultat trouvé</Text>
                                <Text style={styles.emptySubtitle}>
                                    Aucun élément ne correspond à vos critères. Modifiez la recherche ou la période.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={items}
                                keyExtractor={(_, idx) => idx.toString()}
                                renderItem={({ item }) => <View style={styles.item}>{renderItem(item)}</View>}
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 8 }}
                                showsVerticalScrollIndicator
                            />
                        )}
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fermer l’historique">
                        <Text style={styles.closeText}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(34,45,51,0.19)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        width: "95%",
        backgroundColor: colors.white,
        borderRadius: 17,
        padding: 18,
        maxHeight: "87%",
        shadowColor: "#000",
        shadowOpacity: 0.11,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 2 },
        elevation: 10,
    },
    title: {
        fontSize: 19,
        fontWeight: "700",
        color: colors.darkBlue,
        marginBottom: 10,
        textAlign: "center",
    },
    searchInput: {
        backgroundColor: "#F4F7FA",
        borderRadius: 9,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: colors.darkBlue,
        borderColor: "#e5eaf2",
        borderWidth: 1,
    },
    dateRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: 8,
        marginBottom: 6,
    },
    dateField: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4F7FA",
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#e5eaf2",
        paddingRight: 6,
    },
    dateBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    dateLabel: {
        fontSize: 12,
        color: "#6C7A93",
        fontWeight: "700",
    },
    dateValue: {
        fontSize: 12,
        color: colors.darkBlue,
        fontWeight: "700",
    },
    resultsArea: {
        marginTop: 6,
        marginBottom: 6,
        maxHeight: 420,
    },
    list: {
        maxHeight: 420,
    },
    emptyState: {
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
    item: {
        backgroundColor: "#F7FAFF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 7,
    },
    closeBtn: {
        alignSelf: "center",
        marginTop: 10,
        paddingHorizontal: 18,
        paddingVertical: 11,
        backgroundColor: "#e3e8f5",
        borderRadius: 12,
    },
    closeText: {
        color: colors.mediumBlue,
        fontWeight: "600",
        fontSize: 15,
    },
});
