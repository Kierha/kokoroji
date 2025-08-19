/**
 * Résumé consolidé d'une session pour affichage synthétique (fin de session / tableau de bord).
 * @property sessionId Identifiant de la session
 * @property startedAt Date de début
 * @property endedAt Date de fin
 * @property participants Participants (identifiant + nom minimal)
 * @property defisCompleted Nombre de défis complétés
 * @property korocoinsAwarded Total de Korocoins attribués
 */
export interface SessionSummary {
  sessionId: number;
  startedAt: Date;
  endedAt: Date;
  participants: { id: number; name: string }[];
  defisCompleted: number;
  korocoinsAwarded: number;
}
