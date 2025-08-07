import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import { colors } from "../styles/colors";

type ProgressBarProps = {
    progress: number;    // Valeur de progression entre 0 et 1
    disabled?: boolean;  // Indique si la barre est désactivée (affichage atténué)
    height?: number;     // Hauteur personnalisable de la barre
};

/**
 * Barre de progression animée avec affichage du pourcentage.
 * Supporte état désactivé avec styles adaptés.
 *
 * @param progress - Valeur de progression (0 à 1).
 * @param disabled - Active le mode désactivé (opacité réduite).
 * @param height - Hauteur de la barre (en pixels).
 * @returns JSX.Element - Composant barre de progression animée.
 */
export default function ProgressBar({
    progress,
    disabled = false,
    height = 9,
}: ProgressBarProps) {
    const safeProgress = Math.max(0, Math.min(1, progress)); // Clamp entre 0 et 1
    const animatedValue = useRef(new Animated.Value(safeProgress)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: safeProgress,
            duration: 350,
            useNativeDriver: false,
        }).start();
    }, [safeProgress, animatedValue]);

    const percent = Math.round(safeProgress * 100);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.track,
                    { height, backgroundColor: disabled ? "#e7ebef" : "#e1f1fc" },
                ]}
            >
                <Animated.View
                    style={[
                        styles.bar,
                        {
                            width: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", "100%"],
                            }),
                            backgroundColor: disabled ? "#bfc4cc" : colors.mediumBlue,
                            height,
                            opacity: disabled ? 0.55 : 1,
                        },
                    ]}
                />
            </View>
            <Text
                style={[
                    styles.percentText,
                    { color: disabled ? "#bfc4cc" : colors.mediumBlue },
                ]}
                accessible
                accessibilityLabel={`Progression ${percent}%`}
            >
                {percent}%
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    track: {
        flex: 1,
        borderRadius: 6,
        overflow: "hidden",
        marginRight: 11,
    },
    bar: {
        borderRadius: 6,
        height: "100%",
    },
    percentText: {
        minWidth: 38,
        textAlign: "right",
        fontSize: 15,
        fontWeight: "600",
        opacity: 0.92,
    },
});
