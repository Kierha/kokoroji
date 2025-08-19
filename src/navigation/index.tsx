import React, { useCallback, useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import LoginMagicLink from "../screens/LoginMagicLink";
import HomeScreen from "../screens/features/HomeScreen";
import Loader from "../components/Loader";
import { colors } from "../styles/colors";
import OnboardingStack from "./onBoardingStack";
import { isOnboardingDone } from "../services/onboardingService";
import ChallengeStack from "./ChallengeStack";
import SessionStack from "./SessionStack";
import RewardsStack from "./RewardsStack";
import ProfileStack from "./ProfileStack";
import LoginDevScreen from "../screens/dev/LoginDevScreen";

// === TypeScript : déclaration des routes principales ===
export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    ChallengeStack: undefined;
    SessionStack: undefined;
    RewardsStack: undefined;
    ProfileStack: undefined;
    LoginDevScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Composant AppNavigator : navigation principale conditionnelle selon l'état utilisateur et onboarding.
 * Affiche la stack Login, Home ou Onboarding selon le contexte d'authentification et d'usage.
 * Ajout : navigation vers chaque stack "feature" (Challenges, Sessions, Rewards, Profile)
 * @returns JSX.Element
 */
const AppNavigator: React.FC = () => {
    const { user, loading } = useAuth();
    const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

    // Vérifie le flag d'onboarding utilisateur à chaque changement d'utilisateur
    useEffect(() => {
        if (user) {
            isOnboardingDone()
                .then((res) => {
                    setOnboardingDone(res);
                })
                .catch(() => {
                    setOnboardingDone(false);
                });
        } else {
            setOnboardingDone(null);
        }
    }, [user]);

    // Callback appelé à la fin de l'onboarding pour mettre à jour l'état local
    const handleOnboardingDone = useCallback(() => {
        setOnboardingDone(true);
    }, []);

    // Affiche un loader tant que l'état d'authentification ou d'onboarding n'est pas résolu
    if (loading || (user && onboardingDone === null)) {
        return <Loader />;
    }

    // Logs de navigation (supprimés en production pour propreté PFE)
    // if (!user) console.log("[NAV] Aucune session utilisateur -> stack Login");
    // if (user && onboardingDone) console.log("[NAV] Utilisateur connecté + onboarding OK -> stack Home/Features");
    // if (user && !onboardingDone) console.log("[NAV] Utilisateur connecté + onboarding INCOMPLET -> stack Onboarding");

    // Affiche la stack appropriée selon l'état utilisateur et onboarding
    return (
        <NavigationContainer>
            {/* Stack Login + DEV */}
            {!user && (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginMagicLink} />
                    {/* Route DEV, visible seulement en dev */}
                    {__DEV__ && (
                        <Stack.Screen name="LoginDevScreen" component={LoginDevScreen} />
                    )}
                </Stack.Navigator>
            )}

            {/* Stack Home / Features */}
            {user && onboardingDone && (
                <Stack.Navigator
                    initialRouteName="Home"
                    screenOptions={{
                        headerStyle: { backgroundColor: colors.mediumBlue },
                        headerTintColor: colors.white,
                    }}
                >
                    {/* Home principale */}
                    <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                    {/* Stacks "features" */}
                    <Stack.Screen name="ChallengeStack" component={ChallengeStack} options={{ headerShown: false }} />
                    <Stack.Screen name="SessionStack" component={SessionStack} options={{ headerShown: false }} />
                    <Stack.Screen name="RewardsStack" component={RewardsStack} options={{ headerShown: false }} />
                    <Stack.Screen name="ProfileStack" component={ProfileStack} options={{ headerShown: false }} />
                </Stack.Navigator>
            )}

            {/* Stack Onboarding */}
            {user && !onboardingDone && (
                <OnboardingStack onOnboardingDone={handleOnboardingDone} />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
