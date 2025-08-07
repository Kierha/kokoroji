import React from "react";
import { FlatList, Text } from "react-native";
import { ChildItem } from "./ChildItem";
import { colors } from "../styles/colors";

/**
 * Propriétés du composant ChildrenList.
 * @property items Liste des enfants à afficher
 * @property onEdit Callback pour éditer un enfant (par index)
 * @property onDelete Callback pour supprimer un enfant (par index)
 * @property loading Désactive les actions enfants si true
 * @property readonly Si true, passe tous les enfants en lecture seule
 */
type ChildrenListProps = {
    items: any[];
    onEdit?: (index: number) => void;
    onDelete?: (index: number) => void;
    loading?: boolean;
    readonly?: boolean;
};

/**
 * Composant ChildrenList : affiche une liste d'enfants avec actions d'édition et suppression.
 * UX : feedback sur la liste vide, scroll si beaucoup d'enfants.
 * @param items Liste des enfants
 * @param onEdit Callback pour éditer un enfant
 * @param onDelete Callback pour supprimer un enfant
 * @param loading Désactive les actions enfants si true
 * @param readonly Masque les actions si true (profil lecture seule)
 * @returns JSX.Element
 */
export function ChildrenList({ items, onEdit, onDelete, loading, readonly }: ChildrenListProps) {
    return (
        <FlatList
            data={items}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item, index }) => (
                <ChildItem
                    item={item}
                    onEdit={onEdit ? () => onEdit(index) : undefined}
                    onDelete={onDelete ? () => onDelete(index) : undefined}
                    loading={loading}
                    readonly={readonly}
                />
            )}
            showsVerticalScrollIndicator={items.length > 4}
            ListEmptyComponent={
                <Text style={{
                    color: colors.mediumBlue,
                    opacity: 0.7,
                    textAlign: "center"
                }}>
                    Aucun enfant ajouté pour l’instant.
                </Text>
            }
        />
    );
}
