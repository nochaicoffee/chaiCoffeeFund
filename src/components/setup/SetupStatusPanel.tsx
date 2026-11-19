import { GROUP_LABELS, type EnvCheck, type SetupGroup } from "@/lib/setup/envChecks";
import { isReady, type SetupStatus } from "@/lib/setup/loadSetupStatus";
import { CreateTabsButton } from "./CreateTabsButton";

const GROUPS: SetupGroup[] = ["sheet", "signin", "gmail", "claude", "cron", "display"];

function Mark({ ok, required }: { ok: boolean; required: boolean }) {
  if (ok) return <span aria-label="Done" className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-tint text-[11px] font-extrabold text-accent-text">✓</span>;
  if (required) return <span aria-label="Needs fixing" className="grid size-5 shrink-0 place-items-center rounded-full bg-negative-tint text-[11px] font-extrabold text-negative">!</span>;
  return <span aria-label="Optional, not set" className="grid size-5 shrink-0 place-items-center rounded-full bg-fill text-[11px] font-extrabold text-muted">–</span>;
}

function Row({ check, deferred }: { check: EnvCheck; deferred: boolean }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <Mark ok={check.ok} required={check.required && !deferred} />
      <div className="min-w-0">
        <code className="text-[13px] font-bold break-all text-fg">{check.name}</code>
        {check.ok ? null : <p className="mt-0.5 text-[13px] text-muted">{check.hint}</p>}
      </div>
    </li>
  );
}

/**
 * Where the setup stands: every setting (set or not, never its value) and, for someone signed in, whether the app
 * can open the Sheet and whether every tab is there. A server component: it's drawn from `loadSetupStatus`, and
 * the one button (building missing tabs) is the only client piece.
 */
export function SetupStatusPanel({ status, scope, local = false }: { status: SetupStatus; scope: "full" | "signin"; local?: boolean }) {
  const ready = scope === "full" && isReady(status, local);
  const groups = scope === "signin" ? (["signin"] as SetupGroup[]) : GROUPS;
  const sheet = status.sheet;

  return (
    <section aria-labelledby="live-check" className="rounded-card border border-divider bg-surface p-6">
      <h2 id="live-check" className="text-lg font-extrabold tracking-tight text-fg">
        {ready ? "Everything the app needs is set up" : scope === "signin" ? "Sign-in isn't set up yet" : "Where your setup stands"}
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        {scope === "signin"
          ? "This server won't show anything until these four settings are right (step 5 below). Sign in to see the full checklist."
          : "Checked just now on this server. Only whether a setting is set is shown, never what it says."}
      </p>

      {scope === "full" ? (
        <div className="mt-4 rounded-2xl bg-fill p-4">
          <h3 className="text-[13px] font-extrabold tracking-wide text-muted uppercase">Connection to your Sheet</h3>
          {status.serviceAccountEmail ? (
            <p className="mt-1 text-[13px] text-muted">
              Share the Sheet, as Editor, with <code className="font-bold break-all text-fg">{status.serviceAccountEmail}</code>
            </p>
          ) : null}
          {sheet.state === "skipped" ? (
            <p className="mt-1 text-[14px] text-fg">Not tried yet: finish the Sheet settings below first (steps 2 to 4).</p>
          ) : sheet.state === "ready" ? (
            <p className="mt-1 text-[14px] text-fg">Connected, and all {sheet.tabs} tabs match what the app expects.</p>
          ) : sheet.state === "error" ? (
            <div className="mt-1 text-[14px] text-fg" role="alert">
              <p className="font-bold">{sheet.problem.message}</p>
              <p className="mt-1 text-muted">{sheet.problem.fix}</p>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-3 text-[14px] text-fg">
              <p>Connected, but the Sheet isn&apos;t complete.</p>
              {sheet.missing.length > 0 ? (
                <>
                  <p className="text-muted">Missing: {sheet.missing.join(", ")}.</p>
                  <CreateTabsButton count={sheet.missing.length} />
                </>
              ) : null}
              {sheet.differing.length > 0 ? (
                <div>
                  <p className="font-bold">These tabs differ from the app. They were left as they are; fix them in the Sheet:</p>
                  <ul className="mt-1 list-disc pl-5 text-[13px] text-muted">
                    {sheet.differing.map(({ tab, problems }) => (
                      <li key={tab}>
                        <span className="font-bold text-fg">{tab}</span>: {problems.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group}>
            <h3 className="text-[13px] font-extrabold tracking-wide text-muted uppercase">{GROUP_LABELS[group]}</h3>
            {local && group === "signin" ? <p className="mt-0.5 text-[13px] text-muted">Running on your computer, nothing asks you to sign in. These are needed on the host (step 6).</p> : null}
            <ul className="divide-y divide-divider">
              {status.checks
                .filter((check) => check.group === group)
                .map((check) => (
                  <Row key={check.name} check={check} deferred={local && check.group === "signin"} />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
