import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";

/** An outside link that opens in a new tab. */
export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-bold text-fg underline underline-offset-2 hover:text-accent-text">
      {children}
    </a>
  );
}

/** A command or snippet to copy, one per block so each has its own Copy. */
export function Code({ children }: { children: string }) {
  return (
    <div className="my-3 flex items-start justify-between gap-3 rounded-2xl bg-fill px-4 py-3">
      <pre className="min-w-0 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-fg">{children}</pre>
      <CopyButton text={children} />
    </div>
  );
}

/** A name of a setting, a button or a file, inline. */
export function Term({ children }: { children: ReactNode }) {
  return <code className="rounded bg-fill px-1.5 py-0.5 font-mono text-[12.5px] text-fg">{children}</code>;
}

/** A note beside a step: what can go wrong, or what the step is for. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="my-3 rounded-2xl bg-warning-tint px-4 py-3 text-[13.5px] text-warning-text">
      <p className="font-extrabold">{title}</p>
      <div className="mt-1 [&_a]:text-warning-text">{children}</div>
    </div>
  );
}

/** One numbered step of the guide. `optional` steps say so, so nobody feels they have to do them. */
export function Step({ n, id, title, optional, children }: { n: number; id: string; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-card border border-divider bg-surface p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-extrabold text-on-ink">
          {n}
        </span>
        <h2 id={`${id}-title`} className="text-lg font-extrabold tracking-tight text-fg">
          {title}
        </h2>
        {optional ? <span className="rounded-full badge-edge badge-face bg-fill px-2.5 py-0.5 text-[11.5px] font-bold text-muted">Optional</span> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 text-[14.5px] leading-relaxed text-muted [&_ol>li]:ml-5 [&_ol>li]:list-decimal [&_ol>li]:pl-1 [&_ul>li]:pl-1 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_strong]:text-fg">{children}</div>
    </section>
  );
}
