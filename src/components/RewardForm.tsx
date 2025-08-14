import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import ButtonPrimary from "./ButtonPrimary";
import Loader from "./Loader";
import { addReward, updateReward, type RewardUpdate } from "../services/rewardService";
import { addLog } from "../services/logService";

// Limites de taille pour les champs
const TITLE_MAX = 80;
const DESC_MAX = 280;

/**
 * Calcule la "catégorie" de la récompense en fonction de son coût.
 * @param cost Le coût en Koro-Coins
 * @returns Le niveau de la récompense
 */
type Tier = "basic" | "medium" | "deluxe" | "epic";
const tierOf = (cost: number): Tier => {
    if (cost < 50) return "basic";
    if (cost < 100) return "medium";
    if (cost < 150) return "deluxe";
    return "epic";
};

export type RewardFormValues = {
    id?: number;
    family_id: number;
    title: string;
    description?: string;
    cost: number;
    created_by?: string;
};

type Props = {
    mode: "create" | "edit";
    familyId: number;
    initial?: RewardFormValues | null;
    onCancel: () => void;
    onSaved: () => void;
};

/**
 * Formulaire de création/édition d’une récompense.
 * Affiche dynamiquement la catégorie, effectue les validations et journalise les opérations.
 */
export default function RewardForm({ mode, familyId, initial, onCancel, onSaved }: Props) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [costText, setCostText] = useState(initial?.cost != null ? String(initial.cost) : "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Réinitialise les champs si la récompense change (mode édition)
    useEffect(() => {
        setTitle(initial?.title ?? "");
        setDescription(initial?.description ?? "");
        setCostText(initial?.cost != null ? String(initial.cost) : "");
        setError(null);
    }, [initial]);

    // Conversion texte -> number (coût)
    const costNumber = useMemo(() => {
        const n = Number((costText ?? "").replace(",", "."));
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : NaN;
    }, [costText]);

    // Détermine la catégorie en fonction du coût
    const currentTier: Tier | null = Number.isFinite(costNumber) ? tierOf(costNumber) : null;

    // Détermine si le formulaire est submittable
    const canSubmit = useMemo(
        () => title.trim().length > 0 && Number.isFinite(costNumber) && costNumber >= 0 && !submitting,
        [title, costNumber, submitting]
    );

    const deviceInfo = `${Platform.OS} ${String(Platform.Version ?? "")}`;

    // Soumission du formulaire (création ou édition)
    const onSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);

        const payloadBase = {
            title: title.trim(),
            description: description.trim(),
            cost: costNumber,
        };

        try {
            if (mode === "create") {
                // Création de la récompense
                const newId: number = await addReward({
                    family_id: familyId,
                    ...payloadBase,
                    created_by: "parent",
                });

                await addLog({
                    timestamp: new Date().toISOString(),
                    family_id: String(familyId),
                    child_ids: "[]",
                    log_type: "reward_created",
                    level: "info",
                    context: "Récompense créée",
                    details: JSON.stringify({
                        action: "create",
                        reward_id: newId,
                        title: payloadBase.title,
                        cost: payloadBase.cost,
                        tier: tierOf(payloadBase.cost),
                        has_description: Boolean(payloadBase.description),
                    }),
                    ref_id: String(newId),
                    is_synced: 0,
                    device_info: deviceInfo,
                });

            } else if (mode === "edit" && initial?.id) {
                // Édition d'une récompense existante
                const payload: RewardUpdate = {
                    id: initial.id,
                    family_id: familyId,
                    ...payloadBase,
                };
                await updateReward(payload);

                await addLog({
                    timestamp: new Date().toISOString(),
                    family_id: String(familyId),
                    child_ids: "[]",
                    log_type: "reward",
                    level: "info",
                    context: "Récompense modifiée",
                    details: JSON.stringify({
                        action: "update",
                        reward_id: payload.id,
                        title: payload.title,
                        cost: payload.cost,
                        tier: tierOf(payload.cost),
                    }),
                    ref_id: String(payload.id),
                    is_synced: 0,
                    device_info: deviceInfo,
                });
            }

            onSaved();
        } catch (e: any) {
            // Gestion d'erreur métier/serveur
            const message = e?.message ?? "Erreur inattendue";
            await addLog({
                timestamp: new Date().toISOString(),
                family_id: String(familyId),
                child_ids: "[]",
                log_type: "error",
                level: "error",
                context: mode === "create" ? "Échec création récompense" : "Échec modification récompense",
                details: JSON.stringify({
                    error: message,
                    stack: String(e?.stack ?? ""),
                    input: {
                        title: payloadBase.title,
                        cost: payloadBase.cost,
                        mode,
                        reward_id: initial?.id ?? undefined,
                    },
                }),
                ref_id: initial?.id != null ? String(initial.id) : undefined,
                is_synced: 0,
                device_info: deviceInfo,
            });
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={onCancel}
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Fermer"
                >
                    <Ionicons name="close" size={20} color={colors.danger ?? "#d9534f"} />
                </TouchableOpacity>

                <Text style={styles.header}>
                    {mode === "create" ? "Nouvelle récompense" : "Modifier la récompense"}
                </Text>

                {/* Champ Titre */}
                <View style={styles.field}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Titre *</Text>
                        <Text style={styles.counter}>{`${title.length}/${TITLE_MAX}`}</Text>
                    </View>
                    <TextInput
                        value={title}
                        onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
                        placeholder="Ex. : Temps d’écran bonus"
                        placeholderTextColor="#9fb1c8"
                        style={styles.input}
                        maxLength={TITLE_MAX}
                        returnKeyType="next"
                    />
                </View>

                {/* Champ Description */}
                <View style={styles.field}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.counter}>{`${description.length}/${DESC_MAX}`}</Text>
                    </View>
                    <TextInput
                        value={description}
                        onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
                        placeholder="Détails de la récompense (optionnel)"
                        placeholderTextColor="#9fb1c8"
                        style={[styles.input, styles.multiline]}
                        multiline
                        numberOfLines={4}
                        maxLength={DESC_MAX}
                        textAlignVertical="top"
                    />
                </View>

                {/* Champ Coût */}
                <View style={styles.fieldInline}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Coût (Koro-Coins) *</Text>
                        <TextInput
                            value={costText}
                            onChangeText={(txt) => {
                                const cleaned = txt.replace(/[^\d.,]/g, "");
                                setCostText(cleaned);
                            }}
                            placeholder="Ex. : 50"
                            placeholderTextColor="#9fb1c8"
                            keyboardType="numeric"
                            style={styles.input}
                            maxLength={6}
                        />
                    </View>
                </View>

                {/* Lecture seule : Catégorie automatique */}
                <View style={styles.field}>
                    <Text style={styles.label}>Catégorie (auto) </Text>
                    <View style={styles.chipsRow}>
                        {(["basic", "medium", "deluxe", "epic"] as Tier[]).map((tier) => {
                            const selected = currentTier === tier;
                            return (
                                <View key={tier} style={[styles.chip, selected && styles.chipSelected]}>
                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tier}</Text>
                                </View>
                            );
                        })}
                    </View>
                    <Text style={styles.helper}>
                        La catégorie est déterminée automatiquement par le coût : 0–50 = basic, 50–100 = medium,
                        100–150 = deluxe, 150+ = epic.
                    </Text>
                </View>

                {/* Affichage erreurs et loader */}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {submitting ? (
                    <View style={{ paddingVertical: 8 }}>
                        <Loader />
                    </View>
                ) : null}

                {/* CTA de validation */}
                <View style={styles.actions}>
                    <View style={styles.buttonWidthLimiter}>
                        <ButtonPrimary
                            onPress={onSubmit}
                            disabled={!canSubmit}
                            title={mode === "create" ? "Créer" : "Enregistrer"}
                        />
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
    container: { 
        position: "relative", 
        padding: 16 
    },

    header: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.darkBlue,
        marginBottom: 10,
        textAlign: "center",
        letterSpacing: 0.2,
    },

    closeBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: colors.danger ?? "#d9534f",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        backgroundColor: colors.white,
    },

    field: { 
        marginBottom: 12 
    },

    fieldInline: { 
        flexDirection: "row", 
        alignItems: "flex-start", 
        gap: 10, 
        marginBottom: 10 
    },

    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },

    label: { 
        fontSize: 12.5, 
        color: "#6C7A93", 
        fontWeight: "700" 
    },

    counter: { 
        fontSize: 12, 
        color: "#8fa3b9", 
        fontWeight: "600" 
    },

    input: {
        backgroundColor: "#F5F8FC",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15.5,
        color: colors.darkBlue,
        borderColor: "#dde7f1",
        borderWidth: 1.1,
    },

    multiline: { 
        minHeight: 88 
    },

    chipsRow: { 
        flexDirection: "row", 
        flexWrap: "wrap", 
        gap: 8, 
        marginTop: 6 
    },

    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#eaf2fc",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#d7e5f7",
    },

    chipSelected: { 
        backgroundColor: colors.mediumBlue, 
        borderColor: colors.mediumBlue 
    },

    chipText: { 
        color: colors.mediumBlue, 
        fontWeight: "700", 
        fontSize: 13, 
        textTransform: "capitalize" 
    },

    chipTextSelected: { 
        color: colors.white 
    },

    helper: { 
        marginTop: 6, 
        fontSize: 12, 
        color: "#6C7A93" 
    },

    error: { 
        color: colors.danger, 
        fontSize: 13, 
        marginTop: 2 
    },

    actions: { 
        marginTop: 12, 
        alignItems: "center" 
    },

    buttonWidthLimiter: { 
        alignSelf: "center", 
        width: "70%", 
        maxWidth: 260, 
        minWidth: 160 
    },
});
