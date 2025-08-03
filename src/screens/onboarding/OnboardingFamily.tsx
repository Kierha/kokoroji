/**
 * Écran onboarding : création du foyer (nom famille + prénom adulte référent).
 * UX : card compacte centrée, gestion d’erreur, clavier adapté.
 * @returns JSX.Element
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputEmail from "../../components/InputField";
import ButtonPrimary from "../../components/ButtonPrimary";
import CompErrorMessage from "../../components/CompErrorMessage";
import { colors } from "../../styles/colors";
import KoroLogo from "../../assets/kokoroji-simple.png";
import { useNavigation } from "@react-navigation/native";
import type { OnboardingStackParamList } from "../../navigation/types";
import type { StackNavigationProp } from '@react-navigation/stack';


const OnboardingFamily: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<OnboardingStackParamList, 'OnboardingFamily'>>();
    const [familyName, setFamilyName] = useState("");
    const [parentName, setParentName] = useState("");
    const [error, setError] = useState<string | undefined>(undefined);

    /**
     * Valide les champs et navigue vers l'étape suivante si tout est rempli.
     */
    const handleNext = () => {
        setError(undefined);
        if (!familyName.trim() || !parentName.trim()) {
            setError("Merci de remplir tous les champs.");
            return;
        }
        navigation.navigate("OnboardingChildren", { familyName, parentName });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Image source={KoroLogo} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Créons votre foyer</Text>
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
                    onPress={handleNext}
                    disabled={!familyName.trim() || !parentName.trim()}
                    testID="onboarding-next"
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eafaff",
        justifyContent: "center",
        alignItems: "center",
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
