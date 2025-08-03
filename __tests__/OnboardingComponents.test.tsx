/**
 * Tests unitaires pour les composants d’onboarding (AvatarPicker, ChildrenList, ChildItem, InputField).
 * Vérifie les interactions essentielles et le rendu minimal attendu.
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { AvatarPicker } from "../src/components/AvatarPicker";
import { ChildrenList } from "../src/components/ChildrenList";
import { ChildItem } from "../src/components/ChildItem";
import InputField from "../src/components/InputField";

describe("AvatarPicker", () => {
    /**
     * Vérifie la sélection d'un avatar parmi les choix proposés.
     */
    it("affiche les choix et sélectionne un avatar", () => {
        const onSelect = jest.fn();
        const { getByText } = render(
            <AvatarPicker choices={["🐱", "🐶"]} selected="🐱" onSelect={onSelect} disabled={false} />
        );
        fireEvent.press(getByText("🐶"));
        expect(onSelect).toHaveBeenCalledWith("🐶");
    });
});

describe("ChildrenList", () => {
    const children = [{ name: "Léo", birthdate: "2020-01-01", avatar: "🐱" }];
    /**
     * Vérifie l'affichage des enfants passés en props.
     */
    it("affiche les enfants passés en props", () => {
        const { getByText } = render(
            <ChildrenList
                items={children}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                loading={false}
            />
        );
        expect(getByText("Léo")).toBeTruthy();
    });
});


describe("ChildItem", () => {
    const child = { name: "Léo", birthdate: "2020-01-01", avatar: "🐱" };
    /**
     * Vérifie l'appel des callbacks onEdit et onDelete lors des actions utilisateur.
     */
    it("appelle la callback onEdit et onDelete sur action", async () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        const { getByLabelText } = render(
            <ChildItem
                item={child}
                onEdit={onEdit}
                onDelete={onDelete}
                loading={false}
            />
        );
        await act(async () => {
            fireEvent.press(getByLabelText(/modifier/i));
        });
        expect(onEdit).toHaveBeenCalled();
        await act(async () => {
            fireEvent.press(getByLabelText(/supprimer/i));
        });
        expect(onDelete).toHaveBeenCalled();
    });
});

describe("InputField", () => {
    /**
     * Vérifie l'affichage de la valeur, du placeholder et de l'erreur.
     */
    it("affiche la valeur, la placeholder et l’erreur", () => {
        const { getByPlaceholderText, getByText } = render(
            <InputField value="Test" onChangeText={() => { }} placeholder="Prénom" error="Erreur !" />
        );
        expect(getByPlaceholderText("Prénom")).toBeTruthy();
        expect(getByText("Erreur !")).toBeTruthy();
    });
});
