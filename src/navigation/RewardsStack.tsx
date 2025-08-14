import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RewardsScreen from "../screens/features/Rewards/RewardsScreen";

/**
 * Stack de navigation pour la section Récompenses.
 * Contient l’écran principal RewardsScreen.
 */
const Stack = createNativeStackNavigator();

export default function RewardsStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="RewardsHome"
                component={RewardsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}
