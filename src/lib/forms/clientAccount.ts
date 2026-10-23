import type { Account } from "../sheets/types";

/**
 * An account as it may be sent to the browser, or out of an API route: without its statement PDF
 * password, which stays on the server (as a card's does, clientCard.ts). The forms only need to
 * know whether one is saved.
 */
export type ClientAccount = Omit<Account, "statementPdfPassword"> & { hasPdfPassword: boolean };

export function toClientAccount({ statementPdfPassword, ...account }: Account): ClientAccount {
  return { ...account, hasPdfPassword: Boolean(statementPdfPassword) };
}
