import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionScreen from "../screens/features/Session/SessionScreen";
import ActiveSessionScreen from "../screens/features/Session/ActiveSessionScreen";

/**
 * Stack de navigation pour la section Sessions.
 * Regroupe les écrans liés au déroulement d'une séance.
 *
 * - SessionScreen : écran d'accueil / préparation (sélection, configuration, historique...)
 * - ActiveSessionScreen : écran d'une session en cours (défis, progression, actions)
 */
const Stack = createNativeStackNavigator();

export default function SessionStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="SessionHome"
                component={SessionScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ActiveSession"
                component={ActiveSessionScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}