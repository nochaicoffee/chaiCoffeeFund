import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SetupGuide, STEPS } from "@/components/setup/SetupGuide";
import { SetupStatusPanel } from "@/components/setup/SetupStatusPanel";
import { loginConfigured, loginRequired, sessionKey } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { appConfig } from "@/lib/appConfig";
import { loadSetupStatus } from "@/lib/setup/loadSetupStatus";

export const metadata: Metadata = { title: "Setup", robots: { index: false } };

/**
 * The setup guide (docs/setup.md): how to get your own copy running, step by step. The guide is public, because a fresh
 * deploy can't sign anyone in yet. What it shows about this server depends on who's looking:
 * - signed in (or running locally with no login): the full checklist, including a read of the Sheet;
 * - signed out, on a host whose sign-in isn't set up: only the four sign-in settings (set or not, never the values),
 *   since the server serves nothing until they're right and this is the page that can tell you so;
 * - signed out, on a host that works: the guide alone. What is configured is nobody else's business.
 */
export default async function SetupPage() {
  const env = process.env;
  const open = !loginRequired(env);
  const signedIn = open || (await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, sessionKey(env)));
  const scope = signedIn ? "full" : !loginConfigured(env) ? "signin" : null;
  const status = scope ? await loadSetupStatus(env, scope === "full") : null;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-extrabold tracking-[0.14em] text-muted uppercase">{appConfig.appName}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-fg">Set up your own copy</h1>
        <p className="max-w-prose text-[15px] text-muted">
          About 30 minutes, all free. You&apos;ll make a Google Sheet that holds your data, a Google Cloud project that lets the app use it, and a Vercel project that runs the app. Everything stays in your accounts.
        </p>
      </header>

      {status && scope ? <SetupStatusPanel status={status} scope={scope} local={open} /> : null}

      <nav aria-label="Steps" className="rounded-card border border-divider bg-surface p-6">
        <h2 className="text-[13px] font-extrabold tracking-wide text-muted uppercase">The steps</h2>
        <ol className="mt-2 grid gap-x-6 gap-y-1 text-[14.5px] sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.id}>
              <a href={`#${step.id}`} className="font-bold text-fg underline-offset-2 hover:underline">
                {index + 1}. {step.title}
              </a>
              {step.optional ? <span className="ml-1.5 text-[12px] text-muted">optional</span> : null}
            </li>
          ))}
        </ol>
      </nav>

      <SetupGuide />
    </div>
  );
}
