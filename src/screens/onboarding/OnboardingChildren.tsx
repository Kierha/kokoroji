import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    TextInput,
    Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ButtonPrimary from "../../components/ButtonPrimary";
import CompErrorMessage from "../../components/CompErrorMessage";
import { colors } from "../../styles/colors";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { StackScreenProps } from "@react-navigation/stack";
import type { OnboardingStackParamList } from "../../navigation/types";
import { createFamily, addChild, setOnboardingDone } from "../../services/onboardingService";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { AvatarPicker } from "../../components/AvatarPicker";
import { ChildrenList } from "../../components/ChildrenList";

// Types complets avec props natifs + prop custom
type Props = StackScreenProps<OnboardingStackParamList, "OnboardingChildren"> & {
    onOnboardingDone: () => void;
};

type ChildInput = { name: string; birthdate: string; avatar: string };

const AVATAR_CHOICES = ["🦊", "🐻", "🐱", "🐸", "🦄", "🐼", "🐰", "🦁"];

/**
 * Écran d'ajout des enfants lors de l'onboarding.
 * Permet à l'utilisateur de saisir les informations de chaque enfant avant de finaliser la création du foyer.
 * @param props Props de navigation et callback de fin d'onboarding
 * @returns JSX.Element
 */
export default function OnboardingChildren(props: Props) {

    const { route, navigation, onOnboardingDone } = props;
    const { familyName, parentName } = route.params;

    // Form states
    const [name, setName] = useState("");
    const [birthdate, setBirthdate] = useState(""); // ISO YYYY-MM-DD
    const [displayDate, setDisplayDate] = useState(""); // DD/MM/YYYY affichage
    const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    const [children, setChildren] = useState<ChildInput[]>([]);
    const [error, setError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);

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
            setChildren((prev) => prev.map((c, i) => (i === editingIdx ? childData : c)));
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
     * Finalise l'onboarding : crée la famille, ajoute les enfants et déclenche le callback parent.
     * Affiche une erreur si aucun enfant n'est ajouté ou en cas d'échec de sauvegarde.
     */
    const handleFinish = async () => {
        if (!children.length) {
            setError("Ajoutez au moins un enfant pour continuer.");
            return;
        }
        setLoading(true);
        setError(undefined);
        try {
            const familyId = await createFamily(familyName, parentName);
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
            <View style={styles.card}>
                {/* Flèche retour */}
                <TouchableOpacity
                    style={styles.backButtonInCard}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel="Retour"
                >
                    <Ionicons name="arrow-back" size={26} color={colors.mediumBlue} />
                </TouchableOpacity>

                <Text style={styles.title}>Ajoutez vos enfants</Text>

                <TextInput
                    style={styles.input}
                    value={name}
                    placeholder="Prénom de l'enfant"
                    onChangeText={setName}
                    editable={!loading}
                />

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
                    <TextInput
                        style={styles.inputDateCombined}
                        placeholder="Date de naissance"
                        value={displayDate}
                        editable={false}
                        pointerEvents="none"
                    />
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
                        items={children} // <- prop renommée en items
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        loading={loading}
                    />
                </View>

                {!!error && <CompErrorMessage message={error} />}

                {/* Bouton "Terminer" n'apparaît que si un enfant est présent */}
                {children.length > 0 && (
                    <TouchableOpacity
                        style={styles.terminateButton}
                        onPress={handleFinish}
                        disabled={loading}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Terminer l'onboarding"
                    >
                        <Text style={styles.terminateButtonText}>Terminer</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eafaff",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 12,
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
