import { Code, Ext, Note, Step, Term } from "./parts";

/** The steps in order, for the "On this page" list. */
export const STEPS: readonly { id: string; title: string; optional?: boolean }[] = [
  { id: "code", title: "Copy the code" },
  { id: "cloud", title: "A Google Cloud project" },
  { id: "key", title: "A service account and its key" },
  { id: "sheet", title: "Your Google Sheet" },
  { id: "signin", title: "Sign-in with Google" },
  { id: "vercel", title: "Deploy on Vercel" },
  { id: "tabs", title: "Build the Sheet's tabs" },
  { id: "gmail", title: "Gmail statement import", optional: true },
  { id: "claude", title: "Connect Claude", optional: true },
  { id: "sync", title: "The daily sync", optional: true },
];

const REPO = "https://github.com/nochaicoffee/chaiCoffeeFund";

/**
 * The setup guide: static text, the same on every visit, and the same as docs/setup.md in the repo. It is public on
 * purpose (a fresh deploy can't sign anyone in yet), so it names settings and links, and never reads a value.
 * Google moves its console's menus now and then; each step says what to look for, not only where to click.
 */
export function SetupGuide() {
  return (
    <div className="flex flex-col gap-4">
      <Step n={1} id="code" title="Copy the code">
        <p>
          You need a free <Ext href="https://github.com/signup">GitHub</Ext> account. Nothing is installed on your computer: every step is in a browser. Fork the repository so Vercel can deploy your copy, and so you can pull updates later.
        </p>
        <ol>
          <li>
            Open <Ext href={REPO}>{REPO.replace("https://", "")}</Ext> and press <strong>Fork</strong>, then <strong>Create fork</strong>.
          </li>
        </ol>
        <Note title="Who this is for">
          Everyone who uses the app runs <strong>their own copy</strong>, with their own Google Sheet and their own sign-in. Nothing is shared between copies. The app is built for India first: rupees as the base currency, lakh formatting, and parsers for Indian banks&apos; statements. Everything except the Gmail import works for anyone.
        </Note>
      </Step>

      <Step n={2} id="cloud" title="A Google Cloud project">
        <p>Google Cloud is where you switch on the APIs the app talks to. It&apos;s free for this use.</p>
        <ol>
          <li>
            <Ext href="https://console.cloud.google.com/projectcreate">Create a project</Ext> (any name, such as <Term>chai-coffee-fund</Term>).
          </li>
          <li>
            Open <Ext href="https://console.cloud.google.com/apis/library/sheets.googleapis.com">Google Sheets API</Ext> in that project and press <strong>Enable</strong>.
          </li>
          <li>
            If you&apos;ll import statements from Gmail (step 8), also enable the <Ext href="https://console.cloud.google.com/apis/library/gmail.googleapis.com">Gmail API</Ext>.
          </li>
        </ol>
      </Step>

      <Step n={3} id="key" title="A service account and its key">
        <p>
          The app reads and writes your Sheet as a robot account called a <strong>service account</strong>. You&apos;ll share the Sheet with it in the next step, the way you&apos;d share with a person.
        </p>
        <ol>
          <li>
            Open <Ext href="https://console.cloud.google.com/iam-admin/serviceaccounts">Service accounts</Ext>, press <strong>Create service account</strong>, name it, and skip the optional role and access steps.
          </li>
          <li>
            Open the new account, go to <strong>Keys</strong>, then <strong>Add key</strong>, <strong>Create new key</strong>, <strong>JSON</strong>. A <Term>.json</Term> file downloads. Leave it in your Downloads folder for now: you&apos;ll paste what&apos;s inside it into Vercel in step 6.
          </li>
        </ol>
        <Note title="Can't create a key?">
          A Google Workspace (work or school) account may block service account keys by policy. Use a personal Gmail account for the project, or ask the Workspace admin to allow it.
        </Note>
        <p>
          Treat the key like a password. <strong>Never paste it anywhere but Vercel.</strong> Once step 6 is done, delete the downloaded file (if you need a key on your own computer later, make a new one the same way). If it ever leaks, delete the key in Google Cloud and make a new one.
        </p>
      </Step>

      <Step n={4} id="sheet" title="Your Google Sheet">
        <ol>
          <li>
            Make an empty spreadsheet at <Ext href="https://sheets.new">sheets.new</Ext>. Name it anything.
          </li>
          <li>
            Press <strong>Share</strong> and add the service account&apos;s email as an <strong>Editor</strong>. It looks like <Term>name@project.iam.gserviceaccount.com</Term> and is shown on the service account&apos;s page in Google Cloud (it&apos;s also the <Term>client_email</Term> line in the key file).
          </li>
          <li>
            Copy the spreadsheet&apos;s ID from its address: the long part between <Term>/d/</Term> and <Term>/edit</Term>. You&apos;ll paste it into Vercel in step 6.
          </li>
        </ol>
        <p>
          You never type into the Sheet by hand. The app builds every tab itself (step 7) and writes every row.
        </p>
      </Step>

      <Step n={5} id="signin" title="Sign-in with Google">
        <p>
          The app is private: only the one Google account you name can sign in. This takes an OAuth client from the same Google Cloud project.
        </p>
        <ol>
          <li>
            Open <Ext href="https://console.cloud.google.com/apis/credentials/consent">the OAuth consent screen</Ext> (Google calls it Google Auth Platform now) and set it up: choose <strong>External</strong>, give it a name, and your email as the contact.
          </li>
          <li>
            Open <Ext href="https://console.cloud.google.com/apis/credentials">Credentials</Ext>, <strong>Create credentials</strong>, <strong>OAuth client ID</strong>, type <strong>Web application</strong>.
          </li>
          <li>
            Leave <strong>Authorized redirect URIs</strong> empty for now: your app&apos;s address doesn&apos;t exist until step 6, where you add it. (If the form insists on one, enter <Term>http://localhost:3000/login/google/callback</Term>.)
          </li>
          <li>
            Copy the client ID and secret, and choose the one address allowed in and a random signing secret: at least 32 random characters, the kind your password manager&apos;s generator makes (or <Term>openssl rand -base64 48</Term>). They go into Vercel in step 6; this is what they look like:
          </li>
        </ol>
        <Code>{`GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAIL=you@gmail.com
SESSION_SECRET=(32 or more random characters)`}</Code>
        <Note title="Keep the screen in Testing, but add yourself">
          While the consent screen is in <strong>Testing</strong>, only the test users you list can sign in: add your own address under <strong>Audience</strong>, <strong>Test users</strong>. Signing in asks only for your email, so Testing is fine for it. (The Gmail import in step 8 is different.)
        </Note>
      </Step>

      <Step n={6} id="vercel" title="Deploy on Vercel">
        <p>
          Vercel&apos;s free <strong>Hobby</strong> plan is enough. A production build refuses to serve anything until sign-in is set up, so add the settings <em>before</em> the first deploy.
        </p>
        <ol>
          <li>
            Sign up at <Ext href="https://vercel.com/signup">vercel.com</Ext> with GitHub, then <Ext href="https://vercel.com/new">Add New, Project</Ext> and pick your fork. Don&apos;t press Deploy yet.
          </li>
          <li>
            Open <strong>Environment Variables</strong> and add these for Production.
          </li>
        </ol>
        <div className="my-2 overflow-x-auto rounded-2xl border border-divider">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-fill text-fg">
              <tr>
                <th className="px-4 py-2 font-extrabold">Setting</th>
                <th className="px-4 py-2 font-extrabold">What to put</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {[
                ["GOOGLE_SERVICE_ACCOUNT_KEY", "The whole key file, pasted: open the downloaded .json in a text editor, select all, copy (step 3)."],
                ["GOOGLE_SHEETS_SPREADSHEET_ID", "The Sheet's ID (step 4)."],
                ["GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET", "From the OAuth client (step 5)."],
                ["ALLOWED_EMAIL", "The one address that may sign in."],
                ["SESSION_SECRET", "32 or more random characters (step 5)."],
                ["OWNER_NAME (optional)", "The name in your greeting."],
                ["NEXT_PUBLIC_TIME_ZONE (optional)", "Your zone, such as America/New_York. India's if left out."],
              ].map(([name, what]) => (
                <tr key={name}>
                  <td className="px-4 py-2 align-top font-mono text-[12px] font-bold break-all text-fg">{name}</td>
                  <td className="px-4 py-2 text-muted">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol start={3}>
          <li>
            Press <strong>Deploy</strong>. When it finishes, copy the address (<Term>https://your-project.vercel.app</Term>).
          </li>
          <li>
            Back in Google Cloud, add <Term>https://your-project.vercel.app/login/google/callback</Term> to the OAuth client&apos;s redirect URIs (step 5). Without it, sign-in fails with a redirect error.
          </li>
          <li>
            In Vercel, <strong>Settings, Functions</strong>: leave <strong>Fluid Compute</strong> on (the daily sync needs it), and pick the region nearest you (Mumbai for India). Changing the region needs a redeploy.
          </li>
          <li>
            Open your address and sign in. Then go on to step 7 at once: until the tabs exist, the other pages have nothing to read.
          </li>
        </ol>
        <p>
          Use only the production address. Preview deployments can&apos;t sign in, and they share the same Sheet. A setting changed in Vercel takes effect on the next deploy.
        </p>
      </Step>

      <Step n={7} id="tabs" title="Build the Sheet's tabs">
        <p>
          Open <Term>https://your-project.vercel.app/setup</Term> while signed in. The checklist at the top should show your Sheet as connected.
        </p>
        <ol>
          <li>
            Press <strong>Create the missing tabs</strong>. It makes about 36 tabs, each a Sheets Table with the right columns and dropdowns, and checks them. It only ever adds tabs, so pressing it again is safe.
          </li>
          <li>Open the Overview. It is empty on purpose: add an account first, then its balance.</li>
        </ol>
        <p>
          If a later update of the app adds a tab, this page offers the same button again.
        </p>
      </Step>

      <Step n={8} id="gmail" title="Gmail statement import" optional>
        <p>
          The app can read bank and card statements from your Gmail, <strong>read-only</strong> (it can&apos;t send, change or delete mail), and turn them into balances and dues. It&apos;s optional, and it&apos;s the one part that depends on your banks:
        </p>
        <ul className="ml-5 list-disc">
          <li>
            <strong>Card statements</strong>: HDFC, ICICI, Axis, SBI Card, Kotak, YES, CSB and American Express.
          </li>
          <li>
            <strong>Bank account statements</strong>: HDFC (email and NetBanking), Slice, Jupiter, Canara and SBI.
          </li>
        </ul>
        <p>Without it, you add statements and balances by hand in the app, and nothing else is affected.</p>
        <Note title="The one step that needs a terminal">
          Google&apos;s Allow screen has to talk to a program on your own computer once. You need <strong>Node 20.9 or newer</strong> for that, only for steps 3 and 4 below. Skip this whole step if you&apos;d rather not.
        </Note>
        <ol>
          <li>
            In Gmail, make two labels (for example <Term>Card statements</Term> and <Term>Account statements</Term>) and a filter for each that labels your banks&apos; statement emails.
          </li>
          <li>
            In Google Cloud, <strong>Create credentials, OAuth client ID</strong>, type <strong>Desktop app</strong>. Keep its ID and secret.
          </li>
        </ol>
        <ol start={3}>
          <li>
            On your computer, clone your fork and install (see &quot;Running it on your own computer&quot; below). Put the client ID and secret in <Term>.env.local</Term>:
          </li>
        </ol>
        <Code>{`GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...`}</Code>
        <ol start={4}>
          <li>
            Run the one-time authorization. Open the link it prints, press Allow, and copy the <Term>GMAIL_OAUTH_REFRESH_TOKEN=</Term> line it prints:
          </li>
        </ol>
        <Code>npm run authorize-gmail</Code>
        <ol start={5}>
          <li>
            Add all five Gmail settings to Vercel (the client ID, the secret, the token, and the two label names exactly as written in Gmail, as <Term>GMAIL_STATEMENT_LABEL</Term> and <Term>GMAIL_ACCOUNT_STATEMENT_LABEL</Term>), then redeploy.
          </li>
        </ol>
        <Note title="Publish the consent screen, or the token expires in 7 days">
          While the consent screen is in <strong>Testing</strong>, Google expires the Gmail token after a week and the import stops. In Google Cloud, set <strong>Publishing status</strong> to <strong>In production</strong>. Google will show an &quot;unverified app&quot; warning when you allow access: that&apos;s expected for your own app, press Advanced and continue.
        </Note>
        <p>
          Many banks send statements as password-protected PDFs. Each card and account in the app has a field for that password; it stays on your server and is never shown back.
        </p>
      </Step>

      <Step n={9} id="claude" title="Connect Claude" optional>
        <p>
          Your app can be a connector for Claude, so you can say &quot;add a 500 rupee grocery spend&quot; and Claude writes the record, through the same checks the pages use. Claude can add and change records but can&apos;t delete any.
        </p>
        <ol>
          <li>
            Make a secret (32 or more random characters, as in step 5) and add it to Vercel as <Term>MCP_ACCESS_TOKEN</Term>. Redeploy. Without it the endpoint is off.
          </li>
          <li>
            In Claude, <strong>Settings, Connectors, Add custom connector</strong>. The URL is <Term>https://your-project.vercel.app/api/mcp</Term>. Under advanced settings add a header <Term>Authorization</Term> with the value <Term>Bearer</Term>, a space, then your token.
          </li>
          <li>
            In Claude Code, instead: <Term>claude mcp add --transport http chaicoffee https://your-project.vercel.app/api/mcp --header &quot;Authorization: Bearer &lt;token&gt;&quot;</Term>
          </li>
        </ol>
        <p>If the token leaks, change it in Vercel and in the connector. Nothing else uses it.</p>
      </Step>

      <Step n={10} id="sync" title="The daily sync" optional>
        <p>
          If you use the Gmail import, Vercel can run it for you every night. Add a secret as <Term>CRON_SECRET</Term> in Vercel (32 or more random characters) and redeploy; Vercel then calls the sync by itself once a day. The next morning, check <strong>Vercel, your project, Logs</strong> for the run. You can always press <strong>Sync statements</strong> in the app instead.
        </p>
        <p>
          <strong>Not using Gmail?</strong> Leave <Term>CRON_SECRET</Term> unset. The daily call is then refused and does nothing.
        </p>
      </Step>

      <section id="local" className="rounded-card border border-divider bg-surface p-6">
        <h2 className="text-lg font-extrabold tracking-tight text-fg">Running it on your own computer</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
          Not needed to use the app. It&apos;s for the Gmail authorization (step 8) and for changing the code. You need <strong>Node 20.9 or newer</strong>.
        </p>
        <Code>{`git clone https://github.com/<your-name>/chaiCoffeeFund.git
cd chaiCoffeeFund
npm install
cp .env.example .env.local`}</Code>
        <p className="text-[14.5px] leading-relaxed text-muted">
          <Term>.env.local</Term> stays on your computer: git ignores it, so nothing in it is ever committed. For the Gmail authorization it needs only the client ID and secret. To run the app itself, set the key file and Sheet ID too (<Term>GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/service-account.json</Term> with a key file in a <Term>secrets</Term> folder (make a new key as in step 3 if you deleted the first), and <Term>GOOGLE_SHEETS_SPREADSHEET_ID</Term>), then <Term>npm run dev</Term> opens it at <Term>http://localhost:3000</Term> without asking you to sign in. <Term>npm run create-sheet</Term> builds the tabs from a second terminal, the same as the button in step 7. To try sign-in locally, add <Term>http://localhost:3000/login/google/callback</Term> to the OAuth client&apos;s redirect URIs and put all four sign-in settings in <Term>.env.local</Term>; <Term>ALLOWED_EMAIL</Term> turns the login on locally, and then <Term>npm run create-sheet</Term> can&apos;t run until you remove it again.
        </p>
      </section>

      <section className="rounded-card border border-divider bg-surface p-6">
        <h2 className="text-lg font-extrabold tracking-tight text-fg">When something doesn&apos;t work</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-relaxed text-muted">
          <li>
            <strong className="text-fg">Every page says login isn&apos;t set up (503).</strong> One of the four sign-in settings is missing in Vercel, or it was added after the last deploy. The checklist at the top of this page says which.
          </li>
          <li>
            <strong className="text-fg">Google says &quot;redirect_uri_mismatch&quot;.</strong> The address in your browser isn&apos;t in the OAuth client&apos;s redirect URIs, character for character (https, no trailing slash).
          </li>
          <li>
            <strong className="text-fg">&quot;The caller does not have permission&quot;.</strong> The Sheet isn&apos;t shared with the service account as an Editor (step 4).
          </li>
          <li>
            <strong className="text-fg">&quot;Requested entity was not found&quot;.</strong> The spreadsheet ID is wrong. Copy it again from the address bar.
          </li>
          <li>
            <strong className="text-fg">The pages are empty.</strong> A new Sheet has no rows yet, so every figure starts blank. Add an account first, then its balance.
          </li>
          <li>
            <strong className="text-fg">I changed a setting and nothing happened.</strong> Vercel settings apply to the next deploy: redeploy. <Term>NEXT_PUBLIC_TIME_ZONE</Term> is baked into the build, so it needs a redeploy too.
          </li>
          <li>
            <strong className="text-fg">Getting updates.</strong> On your fork&apos;s GitHub page press <strong>Sync fork</strong>; Vercel redeploys by itself. The app never changes your Sheet&apos;s existing tabs. If an update adds a tab, this page offers to create it.
          </li>
        </ul>
        <p className="mt-4 text-[13px] text-muted">
          The same steps, with the reasoning, are in <Term>docs/setup.md</Term> in the repository. Your data is only ever in your own Sheet and your own Vercel project.
        </p>
      </section>
    </div>
  );
}
