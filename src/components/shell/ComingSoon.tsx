import { PageHeader } from "./PageHeader";
import { sectionByHref } from "./sections";

/** Placeholder for a section the roadmap hasn't reached yet, so the sidebar never links to a 404. */
export function ComingSoon({ href }: { href: string }) {
  const section = sectionByHref(href);
  if (!section.comingIn) {
    throw new Error(`${section.label} has no milestone to announce; it shouldn't use ComingSoon.`);
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader section={section.label} title={section.label} />
      <div className="rounded-card border border-dashed border-divider p-8">
        <p className="max-w-prose text-[15px] text-muted">
          {section.label} is planned for milestone <span className="font-bold text-fg">{section.comingIn}</span>. Until
          then, its data stays in the Google Sheet.
        </p>
      </div>
    </div>
  );
}
