// src/navigation/RewardsStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RewardsScreen from "../screens/features/Rewards/RewardsScreen";

const Stack = createNativeStackNavigator();

export default function RewardsStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="RewardsHome"
                component={RewardsScreen}
                options={{ headerTitle: "Rewards" }}
            />
        </Stack.Navigator>
    );
}
