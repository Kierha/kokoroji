/**
 * Navigation principale de l’application Kokoroji.
 * Gère l’accès conditionnel aux écrans selon l’état d’authentification utilisateur.
 * Affiche un écran de chargement tant que l’état n’est pas déterminé.
 */
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import LoginMagicLink from "../screens/LoginMagicLink";
import HomeScreen from "../screens/HomeScreen";
import Loader from "../components/Loader";
import { colors } from "../styles/colors";

const Stack = createNativeStackNavigator();

/**
 * Composant racine de navigation conditionnelle.
 * Redirige vers l’accueil si l’utilisateur est connecté, sinon vers la page de connexion.
 * @returns JSX.Element
 */
const AppNavigator: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader />;
    }

    return (
        <NavigationContainer>
            {user ? (
                <Stack.Navigator
                    screenOptions={{
                        headerStyle: { backgroundColor: colors.mediumBlue },
                        headerTintColor: colors.white,
                    }}
                >
                    <Stack.Screen name="Home" component={HomeScreen} />
                </Stack.Navigator>
            ) : (
                <Stack.Navigator>
                    <Stack.Screen
                        name="Login"
                        component={LoginMagicLink}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
