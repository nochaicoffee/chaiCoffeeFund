/**
 * Passbooks are about 120 KB. A Server Action's body is capped at 1 MB by Next (the file travels with its answers), so a bigger
 * file is refused in the browser, where Next's own refusal would be an error page, and again on the server.
 */
export const MAX_PASSBOOK_BYTES = 800_000;
