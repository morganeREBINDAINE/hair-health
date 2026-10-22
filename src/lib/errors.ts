// Messages d'erreur affichés à l'utilisateur pour une opération cloud échouée.
// Le détail technique est journalisé par l'appelant, jamais affiché.

const NETWORK_PATTERNS = [/network request failed/i, /failed to fetch/i, /network ?error/i, /timeout/i];

/** Vrai si l'échec vient de l'absence de réseau (et non d'une erreur renvoyée par le serveur). */
export function isNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: string; message?: string; code?: string };
  // Une erreur PostgREST / Postgres porte un code : le serveur a bien répondu
  if (err.code) return false;
  if (err.name === 'AuthRetryableFetchError') return true;
  return NETWORK_PATTERNS.some((re) => re.test(err.message ?? ''));
}

/**
 * Message lisible pour une action ratée, ex. `actionError(e, 'enregistrer')`.
 * Réseau → « Connexion requise pour enregistrer » ; sinon → erreur serveur.
 */
export function actionError(e: unknown, action: string): string {
  if (e instanceof Error && e.message === 'Non authentifié') return 'Session expirée : reconnecte-toi';
  if (isNetworkError(e)) return `Connexion requise pour ${action}`;
  return `Impossible de ${action} : erreur serveur, réessaie plus tard`;
}
