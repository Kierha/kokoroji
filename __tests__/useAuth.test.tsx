/**
 * Tests unitaires pour le hook useAuth
 * Couvre : état initial, déconnexion (signOut) et mode bypass dev (signInDevUser)
 */
import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/services/supabaseClient';

// Mock Supabase pour hook useAuth
jest.mock('../src/services/supabaseClient', () => ({
    supabase: { auth: { signOut: jest.fn(), signInWithOtp: jest.fn(), signInWithPassword: jest.fn(), getSession: jest.fn(() => ({ data: { session: null } })), onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) } }
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Vérifie l'état initial : aucun utilisateur authentifié.
     */
    it('initialise avec user null', () => {
        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
        expect(result.current.user).toBeNull();
    });

    /**
     * Vérifie que signOut appelle Supabase et réinitialise l'utilisateur.
     */
    it('signOut appelle supabase et reset user', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
        await act(async () => { await result.current.signOut(); });
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(result.current.user).toBeNull();
    });

    /**
     * Vérifie que le mode bypass dev crée un utilisateur simulé.
     */
    it('signInDevUser crée un user bypass', () => {
        const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
        act(() => { result.current.signInDevUser(); });
        expect(result.current.user?.email).toBe('dev@kokoroji.com');
    });
});