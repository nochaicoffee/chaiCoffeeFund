/** What `google.auth.GoogleAuth` needs to sign in as the Sheets service account. */
export type ServiceAccountAuth = { keyFile: string } | { credentials: { client_email: string; private_key: string } };

/** `process.env`, or a test's stand-in; only GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SERVICE_ACCOUNT_KEY_FILE are read. */
export type CredentialEnv = Record<string, string | undefined>;

/**
 * The key's JSON, either pasted as it is or as base64 of it (base64 survives a host's settings
 * box, which can mangle the key's line breaks). Throws without ever quoting the value, so a
 * bad paste can't put the private key into a log.
 */
function parseKey(value: string): { client_email: string; private_key: string } {
  const text = value.trim();
  let json: unknown;
  try {
    json = JSON.parse(text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8"));
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY isn't the service account's JSON key, or base64 of it");
  }
  const key = json as { client_email?: unknown; private_key?: unknown } | null;
  if (typeof key?.client_email !== "string" || typeof key.private_key !== "string") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY has no client_email and private_key: it should be the whole key file");
  }
  return { client_email: key.client_email, private_key: key.private_key };
}

/**
 * Where the Sheets service account's key comes from. On a host there's no file to point at, so
 * `GOOGLE_SERVICE_ACCOUNT_KEY` holds the key itself; on the laptop `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`
 * names the file under `secrets/`. The setting wins when both are there.
 */
export function serviceAccountAuth(env: CredentialEnv): ServiceAccountAuth {
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim()) return { credentials: parseKey(env.GOOGLE_SERVICE_ACCOUNT_KEY) };
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) return { keyFile: env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE };
  throw new Error("Missing required environment variable: GOOGLE_SERVICE_ACCOUNT_KEY (the key's JSON, on a host) or GOOGLE_SERVICE_ACCOUNT_KEY_FILE (a path, locally)");
}
