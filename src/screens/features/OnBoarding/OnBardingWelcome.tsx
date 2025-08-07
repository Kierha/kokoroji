/**
 * Écran d’introduction de l’onboarding.
 * Affiche un message de bienvenue, une illustration et un bouton d’entrée dans le parcours famille.
 * UX : card compacte centrée, sans footer ni scroll parasite.
 * @returns JSX.Element
 */
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ButtonPrimary from "../../../components/ButtonPrimary";
import { colors } from "../../../styles/colors";
import KoroLogo from "../../../assets/kokoroji-simple.png";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from '@react-navigation/stack';

type OnboardingStackParamList = {
    OnboardingWelcome: undefined;
    OnboardingFamily: undefined;
};


/**
 * Composant d'accueil de l'onboarding : message de bienvenue, illustration et bouton d'entrée dans le parcours famille.
 * UX : card compacte centrée, sans footer ni scroll parasite.
 * @returns JSX.Element
 */
const OnboardingWelcome: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<OnboardingStackParamList, 'OnboardingWelcome'>>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Image source={KoroLogo} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Bienvenue sur Kokoroji</Text>
                <Text style={styles.message}>
                    Ici, chaque moment partagé en famille compte. {"\n\n"}
                    <Text style={styles.bold}>
                        Ensemble, créons des souvenirs, inventons des rituels et donnez du sens à votre quotidien.
                    </Text>
                    {"\n\n"}
                    Commencez l’aventure en quelques étapes : tout est pensé pour que la technologie vous rapproche, tout simplement.
                </Text>
                {/* Bouton d'entrée dans le parcours famille */}
                <ButtonPrimary
                    title="Créer mon espace famille"
                    onPress={() => navigation.navigate("OnboardingFamily")}
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
        width: 140,
        height: 140,
        marginBottom: 26,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 12,
        letterSpacing: 1.2,
        textAlign: "center",
    },
    message: {
        color: colors.darkGrey,
        fontSize: 18,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 26,
        opacity: 0.92,
    },
    bold: {
        fontWeight: "600",
        color: colors.mediumBlue,
    },
});

export default OnboardingWelcome;
