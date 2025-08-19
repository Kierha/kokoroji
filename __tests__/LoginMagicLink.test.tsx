/**
 * Tests unitaires pour l'écran LoginMagicLink
 * Couvre : validation email (erreur), envoi succès, seuil d'alertes Sentry après 3 emails invalides
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import LoginMagicLink from '../src/screens/LoginMagicLink';
import * as Sentry from 'sentry-expo';
import { sendMagicLink } from '../src/services/authService';

// Mock Sentry pour vérifier l'événement métier sans réseau
jest.mock('sentry-expo', () => ({ Native: { withScope: (fn: any) => fn({ setLevel: jest.fn(), setExtra: jest.fn() }), captureMessage: jest.fn() } }));
jest.mock('../src/services/authService', () => ({ sendMagicLink: jest.fn() }));

const navigation = { navigate: jest.fn() } as any;

describe('LoginMagicLink screen', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    /**
     * Vérifie l'affichage d'une erreur après saisie d'email invalide.
     */
    it('affiche une erreur après email invalide', () => {
        const { getByPlaceholderText, getByText } = render(<LoginMagicLink navigation={navigation} />);
        const input = getByPlaceholderText('Entrez votre email');
        fireEvent.changeText(input, 'bad');
        fireEvent.press(getByText('Envoyer le lien magique'));
        getByText('Adresse email invalide. Merci de corriger.');
    });

    /**
     * Vérifie l'appel au service d'envoi sur email valide.
     */
    it('envoie le magic link sur email valide et reset le champ', async () => {
        (sendMagicLink as jest.Mock).mockResolvedValueOnce({ error: null });
        const { getByPlaceholderText, getByText } = render(<LoginMagicLink navigation={navigation} />);
        const input = getByPlaceholderText('Entrez votre email');
        fireEvent.changeText(input, 'user@test.com');
        await act(async () => {
            fireEvent.press(getByText('Envoyer le lien magique'));
        });
        expect(sendMagicLink).toHaveBeenCalledWith('user@test.com');
    });

    /**
     * Vérifie la capture Sentry après 3 emails invalides.
     */
    it('capture un event Sentry après 3 emails invalides', () => {
        const { getByPlaceholderText, getByText } = render(<LoginMagicLink navigation={navigation} />);
        const input = getByPlaceholderText('Entrez votre email');
        for (let i = 0; i < 3; i++) {
            fireEvent.changeText(input, 'bad');
            fireEvent.press(getByText('Envoyer le lien magique'));
        }
        expect((Sentry as any).Native.captureMessage).toHaveBeenCalledWith('auth_invalid_email_attempts');
    });
});
