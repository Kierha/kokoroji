/**
 * Tests unitaires pour le composant InputField
 * Couvre : affichage message d'erreur et propagation onChangeText
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InputField from '../src/components/InputField';

describe('InputField', () => {
    /**
     * Vérifie l'affichage du message d'erreur quand prop error fournie.
     */
    it('affiche le message erreur', () => {
        const { getByText } = render(<InputField value="x" onChangeText={() => { }} error="Erreur" />);
        getByText('Erreur');
    });

    /**
     * Vérifie la propagation onChangeText lors de la saisie.
     */
    it('met à jour la valeur', () => {
        const onChange = jest.fn();
        const { getByPlaceholderText } = render(<InputField value="" onChangeText={onChange} placeholder="Email" />);
        fireEvent.changeText(getByPlaceholderText('Email'), 'a');
        expect(onChange).toHaveBeenCalledWith('a');
    });
});
