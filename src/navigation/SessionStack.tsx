// src/navigation/SessionStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionScreen from "../screens/features/Session/SessionScreen";

const Stack = createNativeStackNavigator();

export default function SessionStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="SessionHome"
                component={SessionScreen}
                options={{ headerTitle: "Sessions" }}
            />
        </Stack.Navigator>
    );
}
