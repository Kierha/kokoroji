import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../styles/colors";
import { getFamily, getChildren } from "../../../services/onboardingService";
import Footer from "../../../components/Footer";
import ChildCard from "../../../components/ChildCard";
import MetricCard from "../../../components/MetricCard";
import { handleSupport } from "../../../utils/support";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import type { Child } from "../../../models/child";

type Family = {
    id: number;
    name: string;
    parentName: string;
};

type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, "ProfileScreen">;

/**
 * Écran profil affichant les informations de la famille,
 * la liste des enfants, des métriques clés, ainsi que
 * des boutons pour accéder aux paramètres et au support.
 *
 * Récupère les données en local via services et gère
 * la navigation vers l'édition du profil.
 *
 * @param navigation - Objet navigation React Navigation.
 * @returns JSX.Element - Composant écran profil.
 */
export default function ProfileScreen({ navigation }: ProfileScreenProps) {
    const [family, setFamily] = useState<Family | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        getFamily().then((f) => {
            setFamily(f);
            if (f?.id) {
                getChildren(f.id).then((enfants) => {
                    setChildren(
                        (enfants ?? []).map((c) => ({
                            ...c,
                            avatar: c.avatar ?? "🧒",
                            name: c.name ?? "",
                            birthdate: c.birthdate ?? "",
                            korocoins: c.korocoins ?? 0,
                        }))
                    );
                });
            }
        });
    }, []);

    // Navigation vers l'écran d'édition avec données préparées
    const handleEditProfile = () => {
        if (!family) return;
        navigation.navigate("EditProfile", {
            family,
            children: children.map((c) => ({
                id: c.id,
                name: c.name ?? "",
                birthdate: c.birthdate ?? "",
                avatar: c.avatar ?? "🧒",
                korocoins: c.korocoins ?? 0,
            })),
        });
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            {/* Bouton retour absolu en haut à gauche */}
            <TouchableOpacity
                style={[styles.backBtn, { top: insets.top + 2, left: 7 }]}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Retour"
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
                <Ionicons name="arrow-back" size={27} color={colors.mediumBlue} />
            </TouchableOpacity>

            <View style={styles.wrapper}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Carte infos famille */}
                    <View style={styles.profileCard}>
                        <Text style={styles.familyLabel}>Nom de la famille</Text>
                        <View style={styles.profileHeader}>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.familyName}>{family?.name || "Famille"}</Text>
                                <View style={styles.parentRow}>
                                    <Text style={styles.parentLabel}>Parent référent : </Text>
                                    <Text style={styles.parentName}>{family?.parentName || "—"}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleEditProfile}
                                style={styles.editIcon}
                                accessibilityRole="button"
                                accessibilityLabel="Modifier profil"
                            >
                                <Ionicons name="pencil" size={22} color={colors.mediumBlue} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Liste enfants affichée en grille */}
                    <View style={styles.childrenCard}>
                        <Text style={styles.childrenLabel}>Enfants :</Text>
                        <FlatList
                            data={children}
                            numColumns={2}
                            keyExtractor={(item, index) => item.id?.toString() ?? `child-${index}`} // 
                            renderItem={({ item }) => (
                                <ChildCard
                                    avatar={item.avatar}
                                    name={item.name}
                                    korocoins={item.korocoins}
                                />
                            )}
                            columnWrapperStyle={{
                                justifyContent: "space-between",
                                paddingHorizontal: 8,
                            }}
                            contentContainerStyle={{ paddingVertical: 10 }}
                            scrollEnabled={false}
                        />
                    </View>

                    {/* Section indicateurs métriques */}
                    <View style={styles.metricsRow}>
                        <MetricCard title="Activités réalisées (7 derniers jours)">
                            <Text style={styles.metricValue}>0</Text>
                        </MetricCard>
                        <MetricCard title="Photos récentes">
                            <Text style={{ color: "#888", fontSize: 13, textAlign: "center" }}>
                                À venir
                            </Text>
                        </MetricCard>
                    </View>

                    {/* Boutons accès paramètres et support */}
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={styles.profileBtn}
                            onPress={() => navigation.navigate("SettingsScreen")}
                        >
                            <Ionicons
                                name="settings-outline"
                                size={19}
                                color={colors.mediumBlue}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.btnText}>Paramètres</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.profileBtn, { backgroundColor: "#f6faff" }]}
                            onPress={handleSupport}
                        >
                            <Ionicons
                                name="mail-outline"
                                size={18}
                                color={colors.mediumBlue}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.btnText, { color: colors.mediumBlue }]}>
                                Contact/Support
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <Footer />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    backBtn: {
        position: "absolute",
        zIndex: 22,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 5,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    wrapper: {
        flex: 1,
        justifyContent: "space-between",
    },
    scrollContainer: {
        padding: 14,
        paddingBottom: 24,
        alignItems: "center",
    },
    profileCard: {
        width: "100%",
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 18,
        marginBottom: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.11,
        shadowRadius: 12,
        elevation: 5,
    },
    familyLabel: {
        fontSize: 16,
        color: colors.mediumBlue,
        fontWeight: "600",
        marginBottom: 2,
        marginLeft: 2,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginTop: 1,
    },
    familyName: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 4,
    },
    parentRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
        flexWrap: "wrap",
    },
    parentLabel: {
        fontSize: 16,
        color: colors.mediumBlue,
        fontWeight: "600",
        marginRight: 2,
    },
    parentName: {
        fontSize: 18,
        color: colors.darkBlue,
        fontWeight: "700",
    },
    editIcon: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#E9F2FB",
    },
    childrenCard: {
        width: "100%",
        backgroundColor: colors.white,
        borderRadius: 22,
        marginBottom: 20,
        paddingVertical: 14,
        paddingHorizontal: 8,
        shadowColor: "#000",
        shadowOpacity: 0.09,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    childrenLabel: {
        fontSize: 19,
        fontWeight: "bold",
        color: colors.darkBlue,
        marginBottom: 7,
        marginLeft: 4,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 22,
    },
    buttonsContainer: {
        width: "100%",
        marginBottom: 6,
    },
    profileBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 12,
        marginBottom: 13,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    btnText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.darkBlue,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.mediumBlue,
    },
});
