import React, { useState, useRef } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../styles/colors";
import HomeCard from "../../components/HomeCard";
import Footer from "../../components/Footer";
import {
    getParentName,
} from "../../services/onboardingService";
import { getPendingLogs } from "../../services/logService";
import { syncLogsToCloud } from "../../services/syncService";
import { getSyncEnabled, setLastSync } from "../../services/settingsFlagsService";
import type { RootStackParamList } from "../../navigation";

/**
 * Formate le prénom en limitant la longueur à max caractères
 * et ajoute une ellipse si dépassement.
 *
 * @param name - Chaîne du prénom.
 * @param max - Longueur maximale autorisée.
 * @returns Prénom formaté.
 */
function formatName(name: string, max = 13): string {
    if (!name) return "Utilisateur";
    return name.length > max ? name.substring(0, max) + "…" : name;
}

/**
 * Écran d'accueil principal.
 * Affiche un accueil personnalisé avec prénom parent,
 * le solde de Koro-coins,
 * une grille de cartes d'accès aux fonctionnalités clés,
 * et une synchronisation automatique des logs cloud en tâche de fond.
 *
 * Synchronisation limitée à 1 fois par heure.
 *
 * @returns JSX.Element - Composant écran accueil.
 */
export default function HomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [parentName, setParentName] = useState("Utilisateur");
    const [syncInProgress, setSyncInProgress] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_lastSync, setLastSyncState] = useState<Date | null>(null);
    const lastAutoSyncRef = useRef<number | null>(null);
    const koroCoins = 0;

    // Récupère le prénom parent au montage
    React.useEffect(() => {
        getParentName().then(setParentName);
    }, []);

    // Synchronisation automatique au focus, limitée à 1 fois/heure
    useFocusEffect(
        React.useCallback(() => {
            (async () => {
                const syncEnabled = await getSyncEnabled();
                if (!syncEnabled) {
                    console.log("[SYNC] Synchronisation automatique désactivée");
                    return;
                }

                const now = Date.now();
                if (
                    lastAutoSyncRef.current &&
                    now - lastAutoSyncRef.current < 60 * 60 * 1000
                ) {
                    const remaining = Math.ceil(
                        (60 * 60 * 1000 - (now - lastAutoSyncRef.current)) / 1000
                    );
                    console.log(`[SYNC] Prochaine synchro automatique dans ${remaining} secondes`);
                    return;
                }

                try {
                    const pending = await getPendingLogs();
                    console.log("[SYNC] Logs en attente:", pending.length);

                    if (pending.length > 0) {
                        console.log("[SYNC] Début de la synchronisation automatique");
                        setSyncInProgress(true);
                        await syncLogsToCloud();
                        lastAutoSyncRef.current = Date.now();
                        console.log("[SYNC] Synchronisation automatique terminée");

                        const newDate = new Date();
                        setLastSyncState(newDate);
                        await setLastSync(newDate);
                    } else {
                        console.log("[SYNC] Pas de logs en attente, pas de synchro nécessaire");
                    }
                } catch (error) {
                    console.warn("Erreur synchro auto:", error);
                } finally {
                    setSyncInProgress(false);
                }
            })();
        }, [])
    );

    const displayedName = formatName(parentName);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* En-tête avec prénom et solde Koro-coins */}
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.welcome}>Bienvenue,</Text>
                        <Text style={styles.name}>{displayedName} !</Text>
                    </View>
                    <View style={styles.coinsWrapper}>
                        <Image source={require("../../assets/kokoroji-korocoins.png")} style={styles.coinIcon} />
                        <Text style={styles.coinCount}>{koroCoins}</Text>
                    </View>
                </View>

                {/* Grille 2x2 de cartes d’accès */}
                <View style={styles.gridContainer}>
                    <View style={styles.grid}>
                        <View style={styles.row}>
                            <HomeCard
                                title="Gérer mes défis"
                                subtitle="Créer, modifier, suivre"
                                illustration={require("../../assets/kokoroji-gerer-defi.png")}
                                onPress={() => navigation.navigate("ChallengeStack")}
                                testID="homecard-defis"
                                style={styles.card}
                            />
                            <HomeCard
                                title="Démarrer une session"
                                subtitle="Session rapide ou planifiée"
                                illustration={require("../../assets/kokoroji-defi.png")}
                                onPress={() => navigation.navigate("SessionStack")}
                                testID="homecard-session"
                                style={styles.card}
                            />
                        </View>
                        <View style={styles.row}>
                            <HomeCard
                                title="Mes Koro-coins"
                                subtitle="Historique & récompenses"
                                illustration={require("../../assets/kokoroji-korocoins.png")}
                                onPress={() => navigation.navigate("RewardsStack")}
                                testID="homecard-coins"
                                style={styles.card}
                            />
                            <HomeCard
                                title="Profil"
                                subtitle="Famille, options & support"
                                illustration={require("../../assets/kokoroji-profil.png")}
                                onPress={() => navigation.navigate("ProfileStack")}
                                testID="homecard-profil"
                                style={styles.card}
                            />
                        </View>
                    </View>
                </View>

                {/* Indicateur de synchronisation automatique */}
                {syncInProgress && (
                    <View style={styles.syncLoaderFooter}>
                        <ActivityIndicator size="small" color={colors.mediumBlue} />
                        <Text style={styles.syncText}>Synchronisation automatique en cours...</Text>
                    </View>
                )}

                {/* Footer */}
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
    container: {
        flex: 1,
        justifyContent: "flex-start",
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 0,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    welcome: {
        fontSize: 22,
        color: colors.darkBlue,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginBottom: 2,
        lineHeight: 27,
    },
    name: {
        fontSize: 28,
        color: colors.darkBlue,
        fontWeight: "bold",
        letterSpacing: 0.3,
        maxWidth: 190,
        lineHeight: 34,
    },
    coinsWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: 4,
        paddingHorizontal: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        minWidth: 60,
        maxWidth: 120,
    },
    coinIcon: {
        width: 28,
        height: 28,
        marginRight: 8,
        resizeMode: "contain",
        flexShrink: 1,
    },
    coinCount: {
        fontWeight: "bold",
        fontSize: 20,
        color: colors.mediumBlue,
        flexShrink: 1,
        maxWidth: 64,
    },
    gridContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    grid: {
        width: "100%",
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 18,
    },
    card: {
        width: "48%",
    },
    syncLoaderFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 10,
        gap: 6,
    },
    syncText: {
        color: colors.mediumBlue,
        fontWeight: "600",
        marginLeft: 6,
    },
});
