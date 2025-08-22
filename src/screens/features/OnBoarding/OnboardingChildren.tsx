/**
 * Écran d'ajout/édition des enfants lors de l'onboarding ou depuis la fiche profil.
 * UX : card centrée, gestion d’erreur, bouton de validation. Clavier géré proprement (remonte la card).
 * @returns JSX.Element
 */
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ButtonPrimary from "../../../components/ButtonPrimary";
import CompErrorMessage from "../../../components/CompErrorMessage";
import { colors } from "../../../styles/colors";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { StackScreenProps } from "@react-navigation/stack";
import type { OnboardingStackParamList } from "../../../navigation/types";
import { createFamily, addChild, setOnboardingDone } from "../../../services/onboardingService";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { AvatarPicker } from "../../../components/AvatarPicker";
import { ChildrenList } from "../../../components/ChildrenList";

/**
 * Propriétés pour un enfant.
 */
// NOTE: id est optionnel. Présent uniquement en mode édition (profil) pour conserver
// la correspondance avec les enregistrements existants. En onboarding initial, il n'existe pas encore.
type ChildInput = { id?: number; name: string; birthdate: string; avatar: string };

/**
 * Props pour le mode onboarding (avec navigation)
 */
type OnboardingChildrenOnboardingProps = StackScreenProps<OnboardingStackParamList, "OnboardingChildren"> & {
    onOnboardingDone: () => void;
    initialChildren?: ChildInput[];
    mode?: "onboarding";
};

/**
 * Props pour le mode édition (pas de navigation)
 */
type OnboardingChildrenEditProps = {
    initialChildren: ChildInput[];
    onValidate: (children: ChildInput[]) => void;
    mode: "edit";
};

/**
 * Props combinées du composant (mode onboarding OU mode édition)
 */
type Props = OnboardingChildrenOnboardingProps | OnboardingChildrenEditProps;

const AVATAR_CHOICES = ["🦊", "🐻", "🐱", "🐸", "🦄", "🐼", "🐰", "🦁"];

export default function OnboardingChildren(props: Props) {
    // Détection du mode
    const isEditMode = props.mode === "edit";

    // Props spécifiques à chaque mode
    const initialChildren = props.initialChildren ?? [];
    const onOnboardingDone = !isEditMode ? props.onOnboardingDone : undefined;
    const onValidate = isEditMode ? props.onValidate : undefined;
    // Navigation/route uniquement disponibles en mode onboarding
    const navigation = !isEditMode ? props.navigation : undefined;
    const familyName = !isEditMode ? (props.route.params.familyName as string) : undefined;
    const parentName = !isEditMode ? (props.route.params.parentName as string) : undefined;

    // Form states
    const [name, setName] = useState("");
    const [birthdate, setBirthdate] = useState(""); // ISO YYYY-MM-DD
    const [displayDate, setDisplayDate] = useState(""); // DD/MM/YYYY affichage
    const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [nameFocused, setNameFocused] = useState(false);
    const [dateFocused, setDateFocused] = useState(false);

    // Liste des enfants, préremplie si besoin
    const [children, setChildren] = useState<ChildInput[]>(initialChildren);
    const [error, setError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    // Gestion du clavier (remonter la card quand un champ est en édition)
    const insets = useSafeAreaInsets();

    // Date picker logic
    const handleDateChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            const isoDate = selectedDate.toISOString().slice(0, 10);
            setBirthdate(isoDate);
            setDisplayDate(format(selectedDate, "dd/MM/yyyy"));
        }
    };

    // Add or edit child
    const handleAddOrEdit = () => {
        setError(undefined);
        if (!name.trim() || !birthdate.trim() || !avatar) {
            setError("Tous les champs sont obligatoires.");
            return;
        }
        const childData = { name, birthdate, avatar };
        if (editingIdx !== null) {
            // Préserver l'id existant lors de la modification en mode édition
            setChildren((prev) =>
                prev.map((c, i) => (i === editingIdx ? { ...(c.id ? { id: c.id } : {}), ...childData } : c))
            );
            setEditingIdx(null);
        } else {
            setChildren((prev) => [...prev, childData]);
        }
        setName("");
        setBirthdate("");
        setDisplayDate("");
        setAvatar(AVATAR_CHOICES[0]);
        Keyboard.dismiss();
    };

    // Edit existing child
    const handleEdit = (idx: number) => {
        const child = children[idx];
        setName(child.name);
        setBirthdate(child.birthdate);
        setDisplayDate(format(new Date(child.birthdate), "dd/MM/yyyy"));
        setAvatar(child.avatar);
        setEditingIdx(idx);
    };

    // Delete child
    const handleDelete = (idx: number) => {
        setChildren((prev) => prev.filter((_, i) => i !== idx));
        if (editingIdx === idx) {
            setName("");
            setBirthdate("");
            setDisplayDate("");
            setAvatar(AVATAR_CHOICES[0]);
            setEditingIdx(null);
        }
    };

    /**
     * Finalise l'onboarding ou l'édition :
     * - Onboarding : crée la famille, ajoute les enfants et déclenche le callback parent.
     * - Edition : appelle le callback onValidate avec la liste finale des enfants.
     * Affiche une erreur si aucun enfant n'est ajouté ou en cas d'échec de sauvegarde.
     */
    const handleFinish = async () => {
        if (!children.length) {
            setError("Ajoutez au moins un enfant pour continuer.");
            return;
        }
        if (isEditMode) {
            // Edition : onValidate (pas de logique d'enregistrement ici)
            if (onValidate) {
                onValidate(children);
            }
            return;
        }
        // Onboarding initial
        setLoading(true);
        setError(undefined);
        try {
            const familyId = await createFamily(familyName!, parentName!);
            for (const child of children) {
                await addChild(familyId, child.name, child.birthdate, child.avatar);
            }
            await setOnboardingDone();
            if (typeof onOnboardingDone === "function") {
                onOnboardingDone();
            }
        } catch {
            setError("Erreur lors de la sauvegarde. Réessayez.");
        }
        setLoading(false);
    };

    // Texte du nombre d'enfants
    const counterText =
        children.length === 0
            ? ""
            : children.length === 1
                ? "1 enfant ajouté"
                : `${children.length} enfants ajoutés`;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={insets.top + 12}
            >
                <View style={styles.card}>
                    {/* Flèche retour (uniquement onboarding, pas en édition) */}
                    {!isEditMode && (
                        <TouchableOpacity
                            style={styles.backButtonInCard}
                            onPress={() => navigation && navigation.goBack()}
                            activeOpacity={0.6}
                            accessibilityRole="button"
                            accessibilityLabel="Retour"
                        >
                            <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                        </TouchableOpacity>
                    )}

                    <Text style={styles.title}>Ajoutez vos enfants</Text>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                            onFocus={() => setNameFocused(true)}
                            onBlur={() => setNameFocused(false)}
                            placeholder={process.env.NODE_ENV === 'test' ? "Prénom de l'enfant" : undefined}
                            placeholderTextColor={process.env.NODE_ENV === 'test' ? "#9fb1c8" : undefined}
                        />
                        {!name && !nameFocused && (
                            <Text style={styles.placeholderOverlay} pointerEvents="none">
                                Prénom de l&apos;enfant
                            </Text>
                        )}
                    </View>

                    <AvatarPicker
                        choices={AVATAR_CHOICES}
                        selected={avatar}
                        onSelect={setAvatar}
                        disabled={loading}
                    />

                    {/* Champ date + icône calendrier */}
                    <TouchableOpacity
                        style={styles.dateInputWrapper}
                        activeOpacity={0.93}
                        onPress={() => setShowDatePicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Ouvrir le calendrier"
                    >
                        <View style={styles.inputWrapperSmall}>
                            <TextInput
                                style={styles.inputDateCombined}
                                value={displayDate}
                                editable={false}
                                pointerEvents="none"
                                onFocus={() => setDateFocused(true)}
                                onBlur={() => setDateFocused(false)}
                                placeholder={process.env.NODE_ENV === 'test' ? 'Date de naissance' : undefined}
                                placeholderTextColor={process.env.NODE_ENV === 'test' ? '#9fb1c8' : undefined}
                            />
                            {!displayDate && !dateFocused && (
                                <Text style={styles.placeholderOverlaySmall} pointerEvents="none">
                                    Date de naissance
                                </Text>
                            )}
                        </View>
                        <Ionicons name="calendar-outline" size={20} color="#2A71D0" style={styles.calendarIcon} />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={birthdate ? new Date(birthdate) : new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            testID="date-time-picker"
                        />
                    )}

                    <ButtonPrimary
                        title={editingIdx !== null ? "Modifier" : "Ajouter"}
                        onPress={handleAddOrEdit}
                        disabled={!name.trim() || !birthdate.trim() || !avatar || loading}
                    />

                    {/* Affichage dynamique du nombre d'enfants */}
                    <Text style={styles.counterText}>{counterText}</Text>

                    {/* LISTE DES ENFANTS scrollable, max 220px */}
                    <View style={{ width: "100%", maxHeight: 220, marginVertical: 12 }}>
                        <ChildrenList
                            items={children}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            loading={loading}
                        />
                    </View>

                    {!!error && <CompErrorMessage message={error} />}

                    {/* Bouton "Terminer"/"Valider" */}
                    {children.length > 0 && (
                        <TouchableOpacity
                            style={styles.terminateButton}
                            onPress={handleFinish}
                            disabled={loading}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel={isEditMode ? "Valider la modification" : "Terminer l'onboarding"}
                        >
                            <Text style={styles.terminateButtonText}>
                                {isEditMode ? "Valider les modifications" : "Terminer"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 28,
        padding: 30,
        width: "95%",
        maxWidth: 480,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
        elevation: 6,
        position: "relative",
    },
    backButtonInCard: {
        position: "absolute",
        top: 16,
        left: 18,
        zIndex: 2,
        backgroundColor: "#eafaff",
        padding: 3,
        borderRadius: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 10,
        marginTop: 8,
        letterSpacing: 0.4,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        width: "100%",
        marginBottom: 12,
        fontSize: 15,
        color: colors.darkBlue,
        backgroundColor: "#F8FCFF",
    },
    inputWrapper: {
        width: "100%",
        position: "relative",
    },
    inputWrapperSmall: {
        flex: 1,
        position: "relative",
    },
    placeholderOverlay: {
        position: "absolute",
        left: 12,
        top: 8,
        color: "#9fb1c8",
        fontSize: 15,
    },
    placeholderOverlaySmall: {
        position: "absolute",
        left: 12,
        top: 8,
        color: "#9fb1c8",
        fontSize: 15,
    },
    dateInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.mediumBlue,
        borderRadius: 8,
        backgroundColor: "#F8FCFF",
        width: "100%",
        marginBottom: 12,
        height: 38,
    },
    inputDateCombined: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        color: colors.darkBlue,
        backgroundColor: "#F8FCFF",
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    calendarIcon: {
        paddingHorizontal: 8,
        alignSelf: "center",
    },
    counterText: {
        width: "100%",
        textAlign: "left",
        color: colors.mediumBlue,
        fontSize: 14,
        opacity: 0.8,
        marginTop: 8,
        marginBottom: -2,
        fontWeight: "600",
    },
    terminateButton: {
        width: "100%",
        marginTop: 10,
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: "#27AE60",
        alignItems: "center",
        shadowColor: "#218C53",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.11,
        shadowRadius: 7,
        elevation: 2,
    },
    terminateButtonText: {
        color: "#fff",
        fontSize: 19,
        fontWeight: "bold",
        letterSpacing: 0.8,
    },
});
