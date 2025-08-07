import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/features/Profile/ProfileScreen";
import EditProfileScreen from "../screens/features/Profile/EditProfileScreen";
import SettingsScreen from "../screens/features/Profile/SettingsScreen";
import type { ProfileStackParamList } from "../navigation/types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Navigateur en pile pour les écrans liés au profil utilisateur.
 * Regroupe les écrans : affichage profil, édition profil et paramètres.
 *
 * @returns JSX.Element - Stack Navigator configuré.
 */
export default function ProfileStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="ProfileScreen"
                component={ProfileScreen}
                options={{ headerShown: false }}
            />
            {/* Écran d’édition du profil */}
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
            />
            {/* Écran des paramètres utilisateur */}
            <Stack.Screen
                name="SettingsScreen"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}
