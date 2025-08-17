import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import ButtonPrimary from "./ButtonPrimary";
import ButtonSecondary from "./ButtonSecondary";
import CompErrorMessage from "./CompErrorMessage";

import { usePhotoAttachment } from "../hooks/usePhotoAttachment";
import { colors } from "../styles/colors";

type Props = {
    sessionId: number;
    familyId: number;
    childIds: number[];
    /** Défi courant */
    defi: {
        id: number | string;
        title: string;
        description?: string | null;
        points_default?: number | null;
        /** Stocké en TEXT dans la BDD (ex: "true"/"false") ou booléen */
        photo_required?: string | null | boolean;
    };
    /** Validation du défi par l’utilisateur */
    onValidate: (defiId: string | number) => Promise<void> | void;
    /** Passage du défi sans validation */
    onSkip: () => void;
    /** Feedback optionnel après ajout d’un média */
    onMediaAdded?: (mediaId: number) => void;
};

function isPhotoRequired(v: Props["defi"]["photo_required"]) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true";
    return false;
}

/**
 * Contrôles d’interaction pour une session active.
 *
 * Affiche :
 * - L’état « photo requise/facultative »
 * - Les actions « Prendre une photo », « PASSER » et « VALIDER »
 *
 * @param sessionId - Identifiant de la session.
 * @param familyId - Identifiant de la famille.
 * @param childIds - Identifiants des participants.
 * @param defi - Données du défi courant.
 * @param onValidate - Callback de validation de défi.
 * @param onSkip - Callback de passage de défi.
 * @param onMediaAdded - Callback optionnel après ajout média.
 * @returns JSX.Element
 */
export default function ActiveSessionControls({
    sessionId,
    familyId,
    childIds,
    defi,
    onValidate,
    onSkip,
    onMediaAdded,
}: Props) {
    const photoNeeded = useMemo(() => isPhotoRequired(defi.photo_required), [defi.photo_required]);

    const { loading: photoLoading, error: photoError, captureAndAttach } = usePhotoAttachment();
    const [actionError, setActionError] = useState<string | null>(null);

    const busy = photoLoading;

    // Capture + attache la photo à la session/défi
    const handleTakePhoto = async () => {
        setActionError(null);
        const id = await captureAndAttach({ sessionId, familyId, childIds, saveToAlbum: true });
        if (id && onMediaAdded) onMediaAdded(id);
    };

    const handleValidate = async () => {
        try {
            setActionError(null);
            await onValidate(defi.id);
        } catch (e: any) {
            setActionError(e?.message ?? "Impossible de valider le défi.");
        }
    };

    const handleSkip = () => {
        setActionError(null);
        onSkip();
    };

    return (
        <View style={styles.container}>
            <View style={[styles.photoBadge, photoNeeded ? styles.badgeYes : styles.badgeNo]}>
                <Text style={styles.badgeText}>
                    {photoNeeded ? "Photo requise" : "Photo facultative"}
                </Text>
            </View>

            <ButtonPrimary
                title={photoLoading ? "Ajout de la photo..." : "Prendre une photo"}
                onPress={handleTakePhoto}
                disabled={busy}
            />

            <View style={styles.row}>
                <ButtonSecondary title="PASSER" onPress={handleSkip} disabled={busy} />
                <View style={{ width: 10 }} />
                <ButtonPrimary title="VALIDER" onPress={handleValidate} disabled={busy} />
            </View>

            {photoError ? <CompErrorMessage message={photoError} /> : null}
            {actionError ? <CompErrorMessage message={actionError} /> : null}
        </View>
    );
}

/* Styles */
const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    photoBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    badgeYes: {
        backgroundColor: "#e6fff0",
        borderColor: "#a6f0c0",
    },
    badgeNo: {
        backgroundColor: "#fff4f4",
        borderColor: "#ffd5d5",
    },
    badgeText: {
        color: colors.darkBlue,
        fontWeight: "700",
        fontSize: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
});
