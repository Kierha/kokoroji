import React from "react";
import {
    TouchableOpacity,
    Text,
    View,
    StyleSheet,
    Image,
    ViewStyle,
} from "react-native";
import { colors } from "../styles/colors";

export interface HomeCardProps {
    title: string;
    subtitle?: string;
    illustration: any; // Asset local importé via require()
    onPress: () => void;
    testID?: string;
    style?: ViewStyle;
}

/**
 * Composant carte cliquable affichant un visuel, un titre et un sous-titre optionnel.
 * Utilisé comme élément d’interface pour navigation ou accès rapide.
 *
 * @param title - Titre principal de la carte (texte accessible).
 * @param subtitle - Sous-titre optionnel affiché sous le titre.
 * @param illustration - Image locale affichée en haut de la carte.
 * @param onPress - Callback déclenché au clic.
 * @param testID - Identifiant optionnel pour les tests.
 * @param style - Style optionnel pour personnaliser la carte.
 * @returns JSX.Element - Carte formatée et accessible.
 */
const HomeCard: React.FC<HomeCardProps> = ({
    title,
    subtitle,
    illustration,
    onPress,
    testID,
    style,
}) => {
    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={title}
            testID={testID}
        >
            <View style={styles.inner}>
                <Image source={illustration} style={styles.illustration} />
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 10,
        margin: 0,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 150,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    inner: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    illustration: {
        width: 96,
        height: 96,
        marginBottom: 12,
        resizeMode: "contain",
    },
    title: {
        fontSize: 16,
        color: colors.darkBlue,
        fontWeight: "bold",
        marginBottom: 4,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 12,
        color: colors.mediumBlue,
        opacity: 0.88,
        textAlign: "center",
        marginTop: 2,
    },
});

export default HomeCard;
