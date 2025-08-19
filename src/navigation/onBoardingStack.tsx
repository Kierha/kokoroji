import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingWelcome from "../screens/features/OnBoarding/OnBardingWelcome";
import OnboardingFamily from "../screens/features/OnBoarding/OnboardingFamily";
import OnboardingChildren from "../screens/features/OnBoarding/OnboardingChildren";
import { OnboardingStackParamList } from "./types";

// Prop pour le callback
type OnboardingStackProps = {
    onOnboardingDone: () => void;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Stack de navigation dédiée à l’onboarding.
 * Ne contient que les écrans du parcours d’onboarding famille/enfants.
 * @param onOnboardingDone Callback appelé à la fin de l’onboarding
 * @returns JSX.Element
 */
export default function OnBoardingStack({ onOnboardingDone }: OnboardingStackProps) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />
            <Stack.Screen name="OnboardingFamily">
                {props => (
                    <OnboardingFamily {...props} onNext={
                        (familyName, parentName) => {
                            // Naviguer vers OnboardingChildren en passant familyName/parentName en params
                            props.navigation.navigate("OnboardingChildren", {
                                familyName,
                                parentName
                            });
                        }
                    } />
                )}
            </Stack.Screen>
            <Stack.Screen name="OnboardingChildren">
                {(props) => <OnboardingChildren {...props} onOnboardingDone={onOnboardingDone} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
}
