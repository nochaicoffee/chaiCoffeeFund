/**
 * One-time, human-run Gmail OAuth setup. Never invoked by launchd or by an
 * agent — an agent cannot click "Allow" on Google's own consent screen, so
 * this always needs a person at the keyboard.
 *
 * Usage: npx tsx scripts/authorizeGmail.ts
 * Prerequisite: GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET already
 * set in .env.local (from a Google Cloud OAuth 2.0 Desktop-app client).
 */
import { createServer } from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { google } from "googleapis";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(PROJECT_ROOT, ".env.local") });

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
// Duplicated from lib/gmail/client.ts rather than imported from it: that
// module carries `import "server-only"`, which unconditionally throws
// outside Next's own build — including in a plain script run via `tsx`.
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} in .env.local — create a Google Cloud OAuth 2.0 Desktop-app client first.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const clientId = requireEnv("GMAIL_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GMAIL_OAUTH_CLIENT_SECRET");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
  });

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.end(error ? `Authorization failed: ${error}. You can close this tab.` : "Authorized — you can close this tab and return to the terminal.");
      server.close();
      if (error) reject(new Error(error));
      else if (code) resolve(code);
      else reject(new Error("No code or error in redirect"));
    });
    server.listen(REDIRECT_PORT, () => {
      console.log("Open this URL in your browser and click Allow:\n");
      console.log(authUrl);
      console.log(`\nWaiting for the redirect on ${REDIRECT_URI} ...`);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "No refresh_token in the response — Google only issues one the first time a client is authorized. " +
        "Revoke this app's access at https://myaccount.google.com/permissions and run this script again.",
    );
    process.exit(1);
  }

  console.log("\nSuccess. Add this line to .env.local:\n");
  console.log(`GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
