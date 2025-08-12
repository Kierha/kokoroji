import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import ButtonPrimary from "./ButtonPrimary";
import AppAlertModal from "./AppAlertModal";
import {
    numericOnly,
    isDefiFormReady,
    validateDefi,
    coerceDefi,
    TITLE_MAX,
    DESC_MAX,
    type FieldErrors,
    type ChallengeFormValues,
} from "../utils/validationChallenge";

type DefiFormProps = {
    visible: boolean;
    onSubmit: (defi: {
        title: string;
        category: string;
        location: string;
        description: string;
        duration_min: number;
        points_default: number; // Koro-Coins
        photo_required: string; // "Oui" | "Non"
        age_min: number;
        age_max: number;
    }) => void;
    onCancel: () => void;
    initialValue?: {
        title?: string | null;
        category?: string | null;
        location?: string | null;
        description?: string | null;
        duration_min?: number | null;
        points_default?: number | null;
        photo_required?: string | null;
        age_min?: number | null;
        age_max?: number | null;
    };
    editMode?: boolean;
};

const CATEGORIES = ["Ludique", "Pédagogique"];
const LOCATIONS = ["Intérieur", "Extérieur"]; // <-- corrigé ici
const PHOTO_OPTIONS = ["Oui", "Non"];

/* ----------------------------- Helpers ----------------------------- */

const toStr = (v: unknown): string => (v == null ? "" : String(v));
const toStrNum = (v: unknown): string => (v == null ? "" : String(v));

/** Normalisation simple FR (sans accents, lowercase) */
const norm = (s: string) =>
    s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();

/** Canonise les anciennes valeurs pour le champ location */
const canonLocation = (s?: string | null): string => {
    const n = norm(toStr(s));
    if (n === "maison" || n === "interieur") return "Intérieur";
    if (n === "exterieur") return "Extérieur";
    return toStr(s);
};

export default function DefiForm({
    visible,
    onSubmit,
    onCancel,
    initialValue,
    editMode = false,
}: DefiFormProps) {
    // States (tous en string pour inputs contrôlés)
    const [title, setTitle] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [location, setLocation] = useState<string>("");
    const [photoRequired, setPhotoRequired] = useState<string>("");
    const [durationMin, setDurationMin] = useState<string>("");
    const [coins, setCoins] = useState<string>("");
    const [ageMin, setAgeMin] = useState<string>("");
    const [ageMax, setAgeMax] = useState<string>("");
    const [description, setDescription] = useState<string>("");

    // Errors par champ
    const [errors, setErrors] = useState<FieldErrors>({});

    // Info-bulles
    const [info, setInfo] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: "",
        message: "",
    });

    // Sync des champs à chaque changement d'initialValue/visible (gère null de SQLite)
    useEffect(() => {
        setTitle(toStr(initialValue?.title));
        setCategory(toStr(initialValue?.category));
        setLocation(canonLocation(initialValue?.location)); // <-- canonisation ici
        setPhotoRequired(toStr(initialValue?.photo_required));
        setDurationMin(toStrNum(initialValue?.duration_min));
        setCoins(toStrNum(initialValue?.points_default));
        setAgeMin(toStrNum(initialValue?.age_min));
        setAgeMax(toStrNum(initialValue?.age_max));
        setDescription(toStr(initialValue?.description));
        setErrors({});
    }, [initialValue, visible]);

    // Form prêt ?
    const isReady = useMemo<boolean>(() => {
        const v: ChallengeFormValues = {
            title,
            category,
            location,
            photo_required: photoRequired,
            duration_min: durationMin,
            points_default: coins,
            age_min: ageMin,
            age_max: ageMax,
            description,
        };
        return isDefiFormReady(v);
    }, [title, category, location, photoRequired, durationMin, coins, ageMin, ageMax, description]);

    const openInfo = (t: string, m: string) => setInfo({ visible: true, title: t, message: m });

    const handleSubmit = () => {
        const v: ChallengeFormValues = {
            title,
            category,
            location: canonLocation(location), // <-- sécurité à la soumission
            photo_required: photoRequired,
            duration_min: durationMin,
            points_default: coins,
            age_min: ageMin,
            age_max: ageMax,
            description,
        };

        const { ok, errors } = validateDefi(v);
        if (!ok) {
            setErrors(errors);
            return;
        }
        setErrors({});
        onSubmit(coerceDefi(v));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
                    <View style={styles.container}>
                        {/* Close (rouge) */}
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.closeBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Fermer"
                        >
                            <Ionicons name="close" size={20} color={colors.danger ?? "#d9534f"} />
                        </TouchableOpacity>

                        <Text style={styles.title}>{editMode ? "Modifier le défi" : "Nouveau défi"}</Text>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 12 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Titre */}
                            <LabeledField label="Titre du défi *" error={errors.title}>
                                <TextInput
                                    style={[styles.input, errors.title && styles.inputError]}
                                    placeholder="Ex. Ranger sa chambre"
                                    placeholderTextColor="#b7c9d8"
                                    value={title}
                                    onChangeText={(t: string) => setTitle(t.slice(0, TITLE_MAX))}
                                    maxLength={TITLE_MAX}
                                />
                            </LabeledField>

                            {/* Catégorie */}
                            <LabeledField label="Catégorie *" error={errors.category}>
                                <ChipGroup options={CATEGORIES} selected={category} onSelect={setCategory} invalid={!!errors.category} />
                            </LabeledField>

                            {/* Lieu */}
                            <LabeledField label="Lieu *" error={errors.location}>
                                <ChipGroup options={LOCATIONS} selected={location} onSelect={setLocation} invalid={!!errors.location} />
                            </LabeledField>

                            {/* Photo requise */}
                            <LabeledField label="Photo requise *" error={errors.photo_required}>
                                <ChipGroup
                                    options={PHOTO_OPTIONS}
                                    selected={photoRequired}
                                    onSelect={setPhotoRequired}
                                    invalid={!!errors.photo_required}
                                />
                            </LabeledField>

                            {/* Durée estimée */}
                            <LabeledField
                                label="Durée estimée (min) *"
                                error={errors.duration_min}
                                info={() =>
                                    openInfo(
                                        "Durée estimée",
                                        "Indiquez une estimation en minutes. Nous l’utilisons pour vous suggérer des défis qui rentrent dans le temps dont vous disposez (ex. 10 min avant le dîner)."
                                    )
                                }
                            >
                                <TextInput
                                    style={[styles.input, errors.duration_min && styles.inputError]}
                                    placeholder="Ex. 15"
                                    placeholderTextColor="#b7c9d8"
                                    value={durationMin}
                                    onChangeText={(txt: string) => setDurationMin(numericOnly(txt))}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </LabeledField>

                            {/* Montant Koro-Coins */}
                            <LabeledField
                                label="Récompense (Koro-Coins) *"
                                error={errors.points_default}
                                info={() =>
                                    openInfo(
                                        "Koro-Coins",
                                        "Nombre de Koro-Coins gagnés quand le défi est réussi. Votre enfant pourra les échanger contre des récompenses que vous aurez définies."
                                    )
                                }
                            >
                                <TextInput
                                    style={[styles.input, errors.points_default && styles.inputError]}
                                    placeholder="Ex. 10"
                                    placeholderTextColor="#b7c9d8"
                                    value={coins}
                                    onChangeText={(txt: string) => setCoins(numericOnly(txt))}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                            </LabeledField>

                            {/* Ages */}
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <LabeledField
                                        label="Âge min *"
                                        error={errors.age_min}
                                        info={() =>
                                            openInfo(
                                                "Âge minimum",
                                                "À partir de quel âge ce défi convient. Nous nous en servons pour ne proposer que des défis adaptés aux enfants présents."
                                            )
                                        }
                                    >
                                        <TextInput
                                            style={[styles.input, errors.age_min && styles.inputError]}
                                            placeholder="Ex. 6"
                                            placeholderTextColor="#b7c9d8"
                                            value={ageMin}
                                            onChangeText={(txt: string) => setAgeMin(numericOnly(txt))}
                                            keyboardType="numeric"
                                            maxLength={3}
                                        />
                                    </LabeledField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <LabeledField
                                        label="Âge max *"
                                        error={errors.age_max}
                                        info={() =>
                                            openInfo(
                                                "Âge maximum",
                                                "Jusqu’à quel âge ce défi reste pertinent. Évite de proposer ce défi aux plus grands si ce n’est plus adapté."
                                            )
                                        }
                                    >
                                        <TextInput
                                            style={[styles.input, errors.age_max && styles.inputError]}
                                            placeholder="Ex. 12"
                                            placeholderTextColor="#b7c9d8"
                                            value={ageMax}
                                            onChangeText={(txt: string) => setAgeMax(numericOnly(txt))}
                                            keyboardType="numeric"
                                            maxLength={3}
                                        />
                                    </LabeledField>
                                </View>
                            </View>

                            {/* Description */}
                            <LabeledField label="Description *" error={errors.description}>
                                <TextInput
                                    style={[styles.input, { minHeight: 64 }, errors.description && styles.inputError]}
                                    placeholder="Détails utiles pour l’enfant et le parent…"
                                    placeholderTextColor="#b7c9d8"
                                    value={description}
                                    onChangeText={(t: string) => setDescription(t.slice(0, DESC_MAX))}
                                    multiline
                                    maxLength={DESC_MAX}
                                />
                            </LabeledField>
                        </ScrollView>

                        {/* CTA unique */}
                        <View style={{ marginTop: 10 }}>
                            <ButtonPrimary title={editMode ? "Enregistrer" : "Créer"} onPress={handleSubmit} disabled={!isReady} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>

            {/* Info popover via AppAlertModal */}
            <AppAlertModal
                visible={info.visible}
                title={info.title}
                message={info.message}
                confirmLabel="Fermer"
                onConfirm={() => setInfo(s => ({ ...s, visible: false }))}
            />
        </Modal>
    );
}

/* ---------------------- Présentation interne ---------------------- */

function LabeledField({
    label,
    children,
    info,
    error,
}: {
    label: string;
    children: React.ReactNode;
    info?: () => void;
    error?: string;
}) {
    return (
        <View style={{ marginBottom: 12 }}>
            <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {info && (
                        <TouchableOpacity onPress={info} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.mediumBlue} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {children}
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

function ChipGroup({
    options,
    selected,
    onSelect,
    invalid,
}: {
    options: string[];
    selected?: string;
    onSelect: (val: string) => void;
    invalid?: boolean;
}) {
    return (
        <View style={[styles.chipsRow, invalid && { marginBottom: 4 }]}>
            {options.map(opt => {
                const isSel = selected === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.chip, isSel && styles.chipSelected, invalid && styles.chipInvalid]}
                        onPress={() => onSelect(opt)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSel }}
                    >
                        <Text style={{ color: isSel ? colors.white : colors.mediumBlue, fontWeight: "700" }}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(33,41,51,0.23)",
        justifyContent: "center",
        alignItems: "center",
    },
    kav: { width: "100%", alignItems: "center" },

    // Grande fenêtre, encore scrollable si besoin
    container: {
        width: "94%",
        maxWidth: 560,
        backgroundColor: colors.white,
        borderRadius: 21,
        padding: 20,
        shadowColor: "#222",
        shadowOpacity: 0.13,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
        minHeight: "74%",
        maxHeight: "92%",
    },

    closeBtn: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: colors.danger ?? "#d9534f",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    title: {
        fontSize: 21,
        fontWeight: "700",
        color: colors.darkBlue,
        marginBottom: 12,
        textAlign: "center",
        letterSpacing: 0.2,
    },
    fieldHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    fieldLabel: {
        fontSize: 14.5,
        fontWeight: "700",
        color: colors.darkBlue,
    },
    input: {
        backgroundColor: "#F5F8FC",
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        fontSize: 16,
        color: colors.darkBlue,
        borderWidth: 1.1,
        borderColor: "#dde7f1",
    },
    inputError: {
        borderColor: colors.danger ?? "#d9534f",
    },
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        backgroundColor: "#eaf2fc",
        borderRadius: 15,
    },
    chipSelected: {
        backgroundColor: colors.mediumBlue,
    },
    chipInvalid: {
        borderWidth: 1,
        borderColor: colors.danger ?? "#d9534f",
    },
    errorText: {
        marginTop: 6,
        color: colors.danger ?? "#d9534f",
        fontSize: 13,
        fontWeight: "600",
    },
});
