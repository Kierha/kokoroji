/**
 * Écran onboarding/édition : création ou modification du foyer (nom famille + prénom adulte référent).
 * UX : card compacte centrée, gestion d’erreur, clavier adapté, logo.
 * Titre dynamique selon le mode, bouton toujours “Suivant”.
 * @returns JSX.Element
 */
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import InputEmail from "../../../components/InputField";
import ButtonPrimary from "../../../components/ButtonPrimary";
import CompErrorMessage from "../../../components/CompErrorMessage";
import { colors } from "../../../styles/colors";
import KoroLogo from "../../../assets/kokoroji-simple.png";

/**
 * Props du mode Onboarding (callback onNext)
 */
type OnboardingFamilyOnboardingProps = {
    initialFamilyName?: string;
    initialParentName?: string;
    onNext: (familyName: string, parentName: string) => void;
    mode?: "onboarding";
};

/**
 * Props du mode édition (callback onValidate)
 */
type OnboardingFamilyEditProps = {
    initialFamilyName: string;
    initialParentName: string;
    onValidate: (familyName: string, parentName: string) => void;
    mode: "edit";
};

/**
 * Props combinées (mode onboarding OU édition)
 */
type Props = OnboardingFamilyOnboardingProps | OnboardingFamilyEditProps;

const OnboardingFamily: React.FC<Props> = (props) => {
    // Mode édition ou onboarding ?
    const isEditMode = props.mode === "edit";
    // States initiaux selon le mode (édition pré-rempli, onboarding vide)
    const [familyName, setFamilyName] = useState(props.initialFamilyName || "");
    const [parentName, setParentName] = useState(props.initialParentName || "");
    const [error, setError] = useState<string | undefined>(undefined);

    // Décale le KeyboardAvoidingView en fonction du safe area (haut)
    const insets = useSafeAreaInsets();

    /**
     * Validation : callback dépendant du mode
     */
    const handleSubmit = () => {
        setError(undefined);
        if (!familyName.trim() || !parentName.trim()) {
            setError("Merci de remplir tous les champs.");
            return;
        }
        if (isEditMode) {
            (props as OnboardingFamilyEditProps).onValidate(familyName.trim(), parentName.trim());
        } else {
            (props as OnboardingFamilyOnboardingProps).onNext(familyName.trim(), parentName.trim());
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={insets.top + 12}
            >
                <View style={styles.card}>
                    <Image source={KoroLogo} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.title}>
                        {isEditMode ? "Modifier votre foyer" : "Créons votre foyer"}
                    </Text>
                    <Text style={styles.message}>
                        Donnez un nom à votre famille et indiquez l’adulte référent.
                    </Text>
                    <InputEmail
                        value={familyName}
                        onChangeText={setFamilyName}
                        placeholder="Nom du foyer"
                        autoCapitalize="words"
                    />
                    <InputEmail
                        value={parentName}
                        onChangeText={setParentName}
                        placeholder="Votre prénom"
                        autoCapitalize="words"
                        textContentType="name"
                    />
                    {!!error && <CompErrorMessage message={error} />}
                    <View style={{ height: 18 }} />
                    <ButtonPrimary
                        title="Suivant"
                        onPress={handleSubmit}
                        disabled={!familyName.trim() || !parentName.trim()}
                        testID="onboarding-next"
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 28,
        paddingVertical: 38,
        paddingHorizontal: 30,
        paddingBottom: 32,
        width: "95%",
        maxWidth: 480,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 9,
    },
    logo: {
        width: 110,
        height: 110,
        marginBottom: 20,
    },
    title: {
        fontSize: 27,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 10,
        letterSpacing: 1,
    },
    message: {
        color: colors.darkGrey,
        fontSize: 15,
        textAlign: "center",
        marginBottom: 22,
        lineHeight: 22,
        opacity: 0.95,
    },
});

export default OnboardingFamily;
