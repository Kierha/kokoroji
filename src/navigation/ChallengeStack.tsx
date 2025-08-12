// src/navigation/ChallengeStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChallengeScreen from "../screens/features/Challenge/ChallengeScreen";

const Stack = createNativeStackNavigator();

export default function ChallengeStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="ChallengeHome"
                component={ChallengeScreen}
                options={{ headerShown: false }}
            />
            {/* You can add more screens related to Challenge here */}
        </Stack.Navigator>
    );
}
