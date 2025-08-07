// src/screens/features/ChallengeScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ChallengeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Challenge - Work in progress</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#eafaff" },
    text: { fontSize: 20, color: "#1E365C", fontWeight: "600" },
});
