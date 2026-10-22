import type { Card } from "../sheets/types";

/**
 * A card as it may be sent to the browser: without its statement PDF password,
 * which stays on the server (#51: "never shown again after saving"). The forms
 * only need to know whether one is saved.
 */
export type ClientCard = Omit<Card, "statementPdfPassword"> & { hasPdfPassword: boolean };

export function toClientCard({ statementPdfPassword, ...card }: Card): ClientCard {
  return { ...card, hasPdfPassword: Boolean(statementPdfPassword) };
}
