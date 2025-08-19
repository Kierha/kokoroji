/**
 * Tests unitaires pour authService
 * Couvre :
 * - Envoi de magic link (succès + erreur mappée)
 * - Connexion email/mot de passe (transmission des credentials)
 */
import { sendMagicLink, signInWithEmailPassword } from '../src/services/authService';
import { supabase } from '../src/services/supabaseClient';

// Mock client Supabase (isole logique service)
jest.mock('../src/services/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn(), getSession: jest.fn(() => ({ data: { session: null } })) } }
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Vérifie qu'un envoi de magic link sans erreur retourne { error: null }.
   */
  it('sendMagicLink success retourne error null', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ error: null });
    const res = await sendMagicLink('user@test.com');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'user@test.com' });
    expect(res).toEqual({ error: null });
  });

  /**
   * Vérifie le mapping du message d'erreur renvoyé par Supabase.
   */
  it('sendMagicLink mappe message erreur', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ error: { message: 'rate limit' } });
    const res = await sendMagicLink('user@test.com');
    expect(res).toEqual({ error: 'rate limit' });
  });

  /**
   * Vérifie que la fonction signInWithEmailPassword transmet les credentials.
   */
  it('signInWithEmailPassword passe les creds', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });
    const result = await signInWithEmailPassword('a@b.com', 'secret');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
    expect(result).toEqual({ data: {}, error: null });
  });
});
