import React, { useCallback, useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import LoginMagicLink from "../screens/LoginMagicLink";
import HomeScreen from "../screens/HomeScreen";
import Loader from "../components/Loader";
import { colors } from "../styles/colors";
import OnboardingStack from "./onBoardingStack";
import { isOnboardingDone } from "../services/onboardingService";

export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Composant AppNavigator : navigation principale conditionnelle selon l'état utilisateur et onboarding.
 * Affiche la stack Login, Home ou Onboarding selon le contexte d'authentification et d'usage.
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

    // Affiche la stack appropriée selon l'état utilisateur et onboarding
    return (
        <NavigationContainer>
            {!user && (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginMagicLink} />
                </Stack.Navigator>
            )}

            {user && onboardingDone && (
                <Stack.Navigator
                    screenOptions={{
                        headerStyle: { backgroundColor: colors.mediumBlue },
                        headerTintColor: colors.white,
                    }}
                >
                    <Stack.Screen name="Home" component={HomeScreen} />
                </Stack.Navigator>
            )}

            {user && !onboardingDone && (
                <OnboardingStack onOnboardingDone={handleOnboardingDone} />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
