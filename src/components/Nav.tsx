import Link from "next/link";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/cards", label: "Cards" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/income", label: "Income" },
  { href: "/loans", label: "Loans" },
  { href: "/investments", label: "Investments" },
];

export function Nav() {
  return (
    <nav className="flex w-56 flex-col gap-1 border-r border-black/10 p-4 dark:border-white/10">
      <div className="mb-4 px-2 text-lg font-semibold">Finance Tracker</div>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
