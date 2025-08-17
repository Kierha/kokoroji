import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import ButtonPrimary from "./ButtonPrimary";
import CompErrorMessage from "./CompErrorMessage";
import ChildCard from "./ChildCard";
import type { SessionConfig } from "../models/sessionConfig";

type ChildLite = {
    id: number;
    name: string;
    birthdate: string; // "YYYY-MM-DD"
    avatar?: string | null;
    korocoins?: number;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: (config: SessionConfig) => void;
    familyId: number;
    childrenData: ChildLite[];
    initial?: Partial<SessionConfig>;
};

const DURATIONS = [15, 30, 60] as const;
const DEFAULT_LOOKBACK_DAYS = 30;

type CategoryFilter = "all" | "Ludique" | "Pédagogique";

/* ---------- Helpers métier locaux ---------- */
function ageFromBirthdate(birthdate: string): number {
    const d = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return Math.max(0, age);
}

/** Normalise un libellé (accents/casse) pour comparaison ou stockage. */
const normalizeTag = (s?: string | null) =>
    (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Mappe une valeur potentiellement normalisée ("ludique"/"pedagogique") vers le libellé d’UI. */
function toDisplayCategory(c?: string | null): CategoryFilter {
    const n = normalizeTag(c);
    if (n === "ludique") return "Ludique";
    if (n === "pedagogique") return "Pédagogique";
    return "all";
}

/**
 * Modal de configuration préalable à une session / défi aléatoire.
 * Permet de sélectionner participants, catégorie, lieu et durée (prédéfinie ou personnalisée),
 * puis retourne une configuration normalisée (accents retirés / lowercase) via onConfirm.
 */
export default function SessionConfigModal({
    visible,
    onClose,
    onConfirm,
    familyId,
    childrenData,
    initial,
}: Props) {
    // Type de session (non édité ici)
    const [type, setType] = useState<"random" | "bundle">(initial?.type ?? "random");

    const [duration, setDuration] = useState<number | undefined>(
        initial?.plannedDurationMin ?? 30
    );
    const [location, setLocation] = useState<string | undefined>(
        initial?.location ?? "interieur"
    );

    // Catégorie pour l’UI : libellés capitalisés, conversion lors de la confirmation
    const [category, setCategory] = useState<CategoryFilter>(toDisplayCategory(initial?.category));

    const computedTitle = useMemo(
        () => (type === "random" ? "Configurer le défi aléatoire" : "Configurer la session"),
        [type]
    );

    const LOOKBACK_DAYS = DEFAULT_LOOKBACK_DAYS;

    const [selected, setSelected] = useState<number[]>(initial?.childIds ?? []);
    const [error, setError] = useState<string | null>(null);

    // Durée personnalisée : prioritaire sur les boutons prédéfinis si valeur > 0
    const [customDuration, setCustomDuration] = useState<string>("");

    useEffect(() => {
        if (!visible) return;
        setType(initial?.type ?? "random");
        setDuration(initial?.plannedDurationMin ?? 30);
        setLocation(initial?.location ?? "interieur");
        setSelected(initial?.childIds ?? []);
        setCustomDuration("");
        setCategory(toDisplayCategory(initial?.category));
        setError(null);
    }, [visible, initial]);

    // Âge moyen des participants sélectionnés
    const avgAge = useMemo(() => {
        if (!selected.length) return 0;
        const ages = selected
            .map((id) => childrenData.find((c) => c.id === id))
            .filter(Boolean)
            .map((c) => ageFromBirthdate((c as ChildLite).birthdate));
        if (!ages.length) return 0;
        return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }, [selected, childrenData]);

    // Durée retenue (champ numérique prioritaire)
    const effectiveDuration: number | undefined = useMemo(() => {
        const n = Number(customDuration);
        if (customDuration.trim().length > 0 && Number.isFinite(n) && n > 0) return Math.round(n);
        return duration;
    }, [customDuration, duration]);

    // Validation formulaire minimale
    const canConfirm = useMemo(() => {
        return Boolean(familyId) && selected.length > 0 && (!effectiveDuration || effectiveDuration > 0);
    }, [familyId, selected, effectiveDuration]);

    const toggleSelect = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    // Prépare et émet la configuration normalisée
    const handleConfirm = () => {
        if (!selected.length) {
            setError("Sélectionnez au moins un participant.");
            return;
        }
        if (customDuration.trim().length > 0) {
            const n = Number(customDuration);
            if (!Number.isFinite(n) || n <= 0) {
                setError("Durée personnalisée invalide.");
                return;
            }
        }

        const baseCfg: SessionConfig = {
            familyId,
            childIds: selected,
            type,
            plannedDurationMin: effectiveDuration,
            location: location ? normalizeTag(location) : undefined, // normalisation "interieur"/"exterieur"
            lookbackDays: LOOKBACK_DAYS,
        };

        const cfg: SessionConfig =
            category === "all"
                ? baseCfg
                : { ...baseCfg, category: normalizeTag(category) }; // "ludique"/"pedagogique"

        onConfirm(cfg);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    {/* En-tête */}
                    <View style={styles.topBar}>
                        <Text style={styles.title}>{computedTitle}</Text>
                        <TouchableOpacity onPress={onClose} accessibilityLabel="Fermer" style={styles.closeCircleAbs}>
                            <Ionicons name="close" size={16} color={colors.danger} />
                        </TouchableOpacity>
                    </View>

                    {/* Contenu */}
                    <ScrollView style={{ maxHeight: "100%" }} contentContainerStyle={{ paddingBottom: 6 }}>
                        {/* Participants */}
                        <Text style={styles.sectionTitle}>Sélectionner les participants</Text>

                        <ScrollView
                            horizontal
                            contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 2 }}
                            showsHorizontalScrollIndicator
                        >
                            {childrenData.map((item) => {
                                const active = selected.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => toggleSelect(item.id)}
                                        style={[styles.childWrap, active && styles.childWrapActive]}
                                        activeOpacity={0.9}
                                    >
                                        <ChildCard
                                            avatar={item.avatar ?? "🧒"}
                                            name={item.name}
                                            korocoins={item.korocoins ?? 0}
                                        />
                                        <View style={styles.ageBadge}>
                                            <Text style={styles.ageText}>{ageFromBirthdate(item.birthdate)} ans</Text>
                                        </View>
                                        {active ? (
                                            <View style={styles.checkMark}>
                                                <Ionicons name="checkmark" size={14} color={colors.white} />
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Résumé */}
                        <View style={styles.badgesRow}>
                            <View style={styles.badge}>
                                <Ionicons name="people-outline" size={14} color={colors.mediumBlue} />
                                <Text style={styles.badgeText}> {selected.length} participant(s)</Text>
                            </View>
                            <View style={styles.badge}>
                                <Ionicons name="hourglass-outline" size={14} color={colors.mediumBlue} />
                                <Text style={styles.badgeText}> Âge moyen : {avgAge} ans</Text>
                            </View>
                        </View>

                        {/* Catégorie */}
                        <Text style={styles.subTitle}>Catégorie</Text>
                        <View style={[styles.row, styles.centerRow]}>
                            {[
                                { id: "all", label: "Toutes" },
                                { id: "Ludique", label: "Ludique" },
                                { id: "Pédagogique", label: "Pédagogique" },
                            ].map((opt) => {
                                const active = category === (opt.id as CategoryFilter);
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => setCategory(opt.id as CategoryFilter)}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Lieu */}
                        <Text style={styles.subTitle}>Lieu</Text>
                        <View style={[styles.row, styles.centerRow]}>
                            {["interieur", "exterieur"].map((loc) => {
                                const active = location === loc;
                                return (
                                    <TouchableOpacity
                                        key={loc}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => setLocation(loc)}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                            {loc === "interieur" ? "Intérieur" : "Extérieur"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Durée */}
                        <Text style={styles.subTitle}>Durée prévue</Text>
                        <View style={[styles.row, styles.centerRow]}>
                            {DURATIONS.map((d) => {
                                const active = customDuration.trim().length === 0 && duration === d;
                                return (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => {
                                            setDuration(d);
                                            setCustomDuration("");
                                        }}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} min</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TextInput
                            value={customDuration}
                            onChangeText={(txt) => setCustomDuration(txt.replace(/[^\d]/g, ""))}
                            keyboardType="number-pad"
                            style={styles.inputSmall}
                            placeholder="Durée perso (min)"
                            placeholderTextColor="#9fb1c8"
                        />

                        {/* Erreur */}
                        {error ? <CompErrorMessage message={error} /> : null}

                        {/* CTA */}
                        <View style={styles.ctaRow}>
                            <ButtonPrimary title="Valider" onPress={handleConfirm} disabled={!canConfirm} />
                        </View>
                    </ScrollView>
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
    topBar: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 4,
        marginBottom: 6,
    },
    title: {
        fontSize: 19,
        fontWeight: "700",
        color: colors.darkBlue,
        textAlign: "center",
        marginTop: 8,
    },
    closeCircleAbs: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.danger,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: colors.darkBlue,
        marginTop: 6,
        marginBottom: 6,
    },
    subTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: colors.darkBlue,
        marginTop: 6,
        marginBottom: 6,
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    centerRow: {
        justifyContent: "center",
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5eaf2",
        backgroundColor: "#F4F7FA",
        minWidth: 120,
        alignItems: "center",
    },
    chipActive: {
        backgroundColor: colors.mediumBlue,
        borderColor: colors.mediumBlue,
    },
    chipText: {
        color: colors.darkBlue,
        fontWeight: "600",
        fontSize: 13,
    },
    chipTextActive: {
        color: colors.white,
    },
    inputSmall: {
        alignSelf: "center",
        marginTop: 8,
        width: 160,
        backgroundColor: "#F4F7FA",
        borderRadius: 9,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: colors.darkBlue,
        borderColor: "#e5eaf2",
        borderWidth: 1,
    },
    childWrap: {
        marginRight: 8,
        position: "relative",
    },
    childWrapActive: {
        transform: [{ scale: 0.98 }],
        opacity: 0.95,
    },
    checkMark: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.mediumBlue,
        alignItems: "center",
        justifyContent: "center",
    },
    ageBadge: {
        alignSelf: "center",
        marginTop: 4,
        backgroundColor: "#eef4ff",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: "#dbe6ff",
    },
    ageText: {
        color: colors.mediumBlue,
        fontWeight: "700",
        fontSize: 11,
    },
    badgesRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 6,
        marginBottom: 6,
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
    },
    badgeText: {
        color: colors.darkBlue,
        fontWeight: "700",
        fontSize: 12,
    },
    ctaRow: {
        marginTop: 14,
        alignItems: "center",
    },
});
