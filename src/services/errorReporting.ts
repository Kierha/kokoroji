import { addLog, LogType } from './logService';

// Lazy require de sentry-expo pour éviter les problèmes de parsing ESM sous Jest.
// On n'utilise pas d'import statique afin que les tests puissent fonctionner même sans transformer le module.
let _sentry: any | null | undefined;
function getSentry() {
  if (_sentry !== undefined) return _sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _sentry = require('sentry-expo');
  } catch {
    _sentry = null; // Module absent ou non chargeable dans l'environnement (tests)
  }
  return _sentry;
}

/**
 * logAndMaybeReport : centralise la remontée d'erreurs.
 * Toujours : écrit un log local (addLog)
 * Optionnel : envoie à Sentry si opts.sentry = true et que le module est disponible
 */
export async function logAndMaybeReport(
  context: string,
  err: unknown,
  opts: { logType?: LogType | string; familyId?: number | string | null; level?: 'error' | 'warning'; sentry?: boolean; extra?: Record<string, unknown> } = {}
) {
  const allowed: LogType[] = [
    'session',
    'defi',
    'reward',
    'profile',
    'sync',
    'error',
    'debug',
    'system',
    'reward_created',
    'reward_granted',
  ];
  const lt = allowed.includes(opts.logType as LogType) ? (opts.logType as LogType) : 'system';
  const { familyId, level = 'error', sentry = false, extra } = opts;
  const message = err instanceof Error ? err.message : String(err);

  // Ecriture du log local (meilleure robustesse : ne jamais throw ici)
  try {
    await addLog({
      timestamp: new Date().toISOString(),
      family_id: familyId != null ? String(familyId) : '',
      child_ids: '[]',
      log_type: lt,
      level,
      context,
      details: JSON.stringify({ message, ...(extra || {}) }),
      ref_id: undefined,
      device_info: undefined,
    });
  } catch {
    // Ignoré volontairement pour ne pas masquer l'erreur principale
  }

  // Option Sentry
  if (sentry) {
    const S = getSentry();
    if (S) {
      try {
        S?.Native?.withScope?.((scope: any) => {
          scope.setLevel(level);
          scope.setContext('kokoroji', { context, ...(extra || {}) });
          S.Native.captureException(err instanceof Error ? err : new Error(message));
        });
      } catch {
        // Ignoré (pas critique si Sentry échoue)
      }
    }
  }
}

export default { logAndMaybeReport };
