import React, { useState, useCallback } from "react";
import { TouchableOpacity, StyleSheet, BackHandler } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import OnboardingFamily from "../OnBoarding/OnboardingFamily";
import OnboardingChildren from "../OnBoarding/OnboardingChildren";
import {
    updateFamily,
    deleteChildAndData,
    updateChild,
    addChild,
} from "../../../services/onboardingService";
import AppAlertModal from "../../../components/AppAlertModal";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import { addLog } from "../../../services/logService";

type ChildEdit = {
    id?: number;
    name: string;
    birthdate: string;
    avatar: string;
};

type Props = NativeStackScreenProps<ProfileStackParamList, "EditProfile">;

/**
 * Écran d’édition du profil famille et des enfants.
 * Permet de modifier le nom de famille, le nom du parent,
 * ainsi que la gestion complète des profils enfants (ajout, suppression, modification).
 *
 * Gère la navigation entre étape famille et étape enfants,
 * ainsi que la confirmation de suppression et la gestion du retour Android.
 *
 * Synchronise les modifications en base locale et ajoute des logs.
 *
 * @param route - Contient les paramètres famille et enfants initialisés.
 * @param navigation - Objet navigation pour gérer les actions d’écran.
 * @returns JSX.Element - Composant d’édition du profil complet.
 */
export default function EditProfileScreen({ route, navigation }: Props) {
    const { family, children } = route.params;
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState<"family" | "children">("family");
    const [familyName, setFamilyName] = useState(family.name);
    const [parentName, setParentName] = useState(family.parentName);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [editedChildren, _setEditedChildren] = useState<ChildEdit[]>(children);

    // Gestion modale suppression enfants
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [pendingDeletes, setPendingDeletes] = useState<ChildEdit[]>([]);
    const [finalChildrenCache, setFinalChildrenCache] = useState<ChildEdit[]>([]);

    // Gestion modale confirmation sortie édition (retour Android)
    const [showExitAlert, setShowExitAlert] = useState(false);

    // Gestion du bouton retour Android : affiche la modale si on est sur étape enfants
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (step === "children") {
                    setShowExitAlert(true);
                    return true; // Bloque le comportement par défaut
                }
                return false;
            };
            const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
            return () => subscription.remove();
        }, [step])
    );

    // Passage de l’étape famille à enfants avec mise à jour des noms
    const handleNextFamily = (newFamilyName: string, newParentName: string) => {
        setFamilyName(newFamilyName);
        setParentName(newParentName);
        setStep("children");
    };

    /**
     * Gestion finale de la validation d’édition.
     * Identifie les enfants ajoutés, supprimés, modifiés,
     * puis déclenche la synchronisation des données.
     *
     * @param finalChildren - Liste finale des enfants après édition.
     */
    const handleFinishEdit = async (finalChildren: ChildEdit[]) => {
        const finalIds = new Set(finalChildren.filter((e) => e.id).map((e) => e.id));
        const deleted = editedChildren.filter((e) => e.id && !finalIds.has(e.id));
        const added = finalChildren.filter((e) => !e.id);
        const modified = finalChildren.filter((e) => {
            if (!e.id) return false;
            const init = editedChildren.find((init) => init.id === e.id);
            if (!init) return false;
            return (
                init.name !== e.name ||
                init.birthdate !== e.birthdate ||
                init.avatar !== e.avatar
            );
        });

        if (deleted.length > 0) {
            setPendingDeletes(deleted);
            setFinalChildrenCache(finalChildren);
            setShowDeleteAlert(true);
        } else {
            await syncAll(finalChildren, deleted, added, modified);
        }
    };

    /**
     * Synchronise les modifications famille et enfants en base locale
     * et ajoute un log pour chaque opération.
     *
     * @param finalChildren - Liste finale des enfants.
     * @param deleted - Enfants supprimés.
     * @param added - Enfants ajoutés.
     * @param modified - Enfants modifiés.
     */
    async function syncAll(
        finalChildren: ChildEdit[],
        deleted: ChildEdit[],
        added: ChildEdit[],
        modified: ChildEdit[]
    ) {
        try {
            // Mise à jour famille si changement détecté
            if (familyName !== family.name || parentName !== family.parentName) {
                await updateFamily(family.id, familyName, parentName);
                await addLog({
                    timestamp: new Date().toISOString(),
                    family_id: family.id.toString(),
                    child_ids: "[]",
                    log_type: "profile",
                    level: "info",
                    context: "Modification du profil famille",
                    details: JSON.stringify({
                        before: { name: family.name, parentName: family.parentName },
                        after: { name: familyName, parentName },
                    }),
                });
            }

            // Suppressions enfants avec logs associés
            for (const child of deleted) {
                if (child.id) {
                    await deleteChildAndData(child.id);
                    await addLog({
                        timestamp: new Date().toISOString(),
                        family_id: family.id.toString(),
                        child_ids: `[${child.id}]`,
                        log_type: "profile",
                        level: "info",
                        context: "Suppression d'un enfant",
                        details: JSON.stringify({ child }),
                    });
                }
            }

            // Ajouts enfants avec logs associés
            for (const child of added) {
                const id = await addChild(family.id, child.name, child.birthdate, child.avatar);
                await addLog({
                    timestamp: new Date().toISOString(),
                    family_id: family.id.toString(),
                    child_ids: `[${id}]`,
                    log_type: "profile",
                    level: "info",
                    context: "Ajout d'un enfant",
                    details: JSON.stringify({ child }),
                });
            }

            // Modifications enfants existants avec logs associés
            for (const child of modified) {
                if (child.id) {
                    await updateChild(child.id, child.name, child.birthdate, child.avatar);
                    await addLog({
                        timestamp: new Date().toISOString(),
                        family_id: family.id.toString(),
                        child_ids: `[${child.id}]`,
                        log_type: "profile",
                        level: "info",
                        context: "Modification d'un enfant",
                        details: JSON.stringify({ child }),
                    });
                }
            }

            // Navigation : réinitialise la pile pour éviter retour à l’édition
            navigation.reset({
                index: 0,
                routes: [{ name: "ProfileScreen" }],
            });
        } catch {
            alert("Erreur lors de la mise à jour du profil. Réessayez.");
        }
    }

    // Gestion fermeture écran édition (bouton croix)
    const handleClose = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "ProfileScreen" }],
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Bouton fermeture toujours visible en haut à gauche */}
            <TouchableOpacity
                style={[styles.closeButton, { top: insets.top + 8 }]}
                onPress={handleClose}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Fermer l’édition"
            >
                <Ionicons name="close" size={31} color="#EB5757" />
            </TouchableOpacity>

            {step === "family" ? (
                <OnboardingFamily
                    initialFamilyName={familyName}
                    initialParentName={parentName}
                    onValidate={handleNextFamily}
                    mode="edit"
                />
            ) : (
                <OnboardingChildren
                    initialChildren={editedChildren}
                    onValidate={handleFinishEdit}
                    mode="edit"
                />
            )}

            {/* Modal suppression enfant */}
            <AppAlertModal
                visible={showDeleteAlert}
                title={`Suppression d’enfant${pendingDeletes.length > 1 ? "s" : ""}`}
                message={`Vous êtes sur le point de supprimer ${pendingDeletes.length === 1
                    ? "cet enfant"
                    : `${pendingDeletes.length} enfants`
                    } et toutes les données associées (sessions, récompenses, résultats…).\n\nCette action est irréversible.\n\nPour annuler, cliquez sur "Annuler", puis la croix rouge en haut à gauche de l'écran d'édition.`}
                confirmLabel="Valider"
                onConfirm={async () => {
                    setShowDeleteAlert(false);
                    await syncAll(
                        finalChildrenCache,
                        pendingDeletes,
                        finalChildrenCache.filter((e) => !e.id),
                        finalChildrenCache.filter((e) => {
                            if (!e.id) return false;
                            const init = editedChildren.find((init) => init.id === e.id);
                            if (!init) return false;
                            return (
                                init.name !== e.name ||
                                init.birthdate !== e.birthdate ||
                                init.avatar !== e.avatar
                            );
                        })
                    );
                }}
                onCancel={() => setShowDeleteAlert(false)}
                destructive
            />

            {/* Modal confirmation sortie édition (retour Android) */}
            <AppAlertModal
                visible={showExitAlert}
                title="Quitter l’édition"
                message="Voulez-vous annuler les modifications et quitter sans enregistrer ?"
                confirmLabel="Oui"
                cancelLabel="Non"
                destructive
                onConfirm={() => {
                    setShowExitAlert(false);
                    navigation.goBack();
                }}
                onCancel={() => setShowExitAlert(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#eafaff",
    },
    closeButton: {
        position: "absolute",
        left: 16,
        zIndex: 20,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.09,
        shadowRadius: 3,
        elevation: 2,
    },
});
