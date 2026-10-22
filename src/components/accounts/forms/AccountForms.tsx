"use client";

import { createContext, useContext, useRef, useState, type ReactNode, type Ref } from "react";
import { closeAccount, deleteBalance, reopenAccount } from "@/app/accounts/actions";
import type { AccountsFormsData, HistoryRow } from "@/app/accounts/views";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { AccountFormDialog } from "./AccountFormDialog";
import { BalanceFormDialog } from "./BalanceFormDialog";
import { CheckInDialog } from "./CheckInDialog";
import { EditBalanceDialog } from "./EditBalanceDialog";

/**
 * Opens the Accounts forms (#165) from anywhere on the page: Add and Edit account, Update
 * balance, the monthly check-in, Close and Reopen, and editing or deleting one balance. With
 * sample data every button shows disabled: it never reaches the Sheet.
 */

type Open =
  | { kind: "add" }
  | { kind: "edit"; id: string }
  | { kind: "balance"; id?: string }
  | { kind: "check-in" }
  | { kind: "close"; id: string }
  | { kind: "reopen"; id: string }
  | { kind: "edit-balance"; row: HistoryRow }
  | { kind: "delete-balance"; row: HistoryRow };

interface Controls {
  forms: AccountsFormsData;
  disabledReason?: string;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useAccountForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useAccountForms needs an AccountFormsProvider");
  return controls;
}

export function AccountFormsProvider({ forms, children }: { forms: AccountsFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const disabledReason = forms.demo ? "Sample data can't be changed" : undefined;
  // The button that opened the form, so focus goes back to it on close.
  const opener = useRef<HTMLElement | null>(null);
  const show = (next: Open) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(next);
  };
  const close = () => {
    setOpen(null);
    const back = opener.current;
    setTimeout(() => back?.isConnected && back.focus(), 0);
  };
  const account = open && "id" in open && open.id ? forms.accounts.find((a) => a.id === open.id) : undefined;
  const balance = open?.kind === "edit-balance" || open?.kind === "delete-balance" ? open.row : undefined;

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o) }}>
      {children}
      {open?.kind === "add" && <AccountFormDialog forms={forms} onClose={() => close()} />}
      {open?.kind === "edit" && account && <AccountFormDialog account={account} forms={forms} onClose={() => close()} />}
      {open?.kind === "balance" && <BalanceFormDialog accountId={open.id} forms={forms} onClose={() => close()} />}
      {open?.kind === "check-in" && <CheckInDialog forms={forms} onClose={() => close()} />}
      {open?.kind === "close" && account && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={`Close ${account.name}?`}
          body={`A ₹0 balance is recorded on the day and it moves to Closed, so its history stays.${account.balance ? ` It still holds ${formatInr(account.balance)}: move that first, or it drops out of your totals.` : ""}${account.paysALoan ? " A loan's EMIs are paid from it, so choose another account for them." : ""}`}
          date={{ name: "endDate", label: "Closed on", initial: forms.today, help: "Its balance is ₹0 from this day." }}
          hidden={{ id: account.id }}
          keepLabel="Keep it open"
          confirmLabel="Close account"
          action={closeAccount}
          today={forms.today}
          onClose={() => close()}
        />
      )}
      {open?.kind === "reopen" && account && (
        <ConfirmDialog
          tone="neutral"
          icon={<span className="text-sm font-extrabold">↺</span>}
          title={`Reopen ${account.name}?`}
          body="It's an open account again and counts in your totals. Add its balance to start it up."
          hidden={{ id: account.id }}
          keepLabel="Not now"
          confirmLabel="Reopen"
          action={reopenAccount}
          today={forms.today}
          onClose={() => close()}
        />
      )}
      {open?.kind === "edit-balance" && balance && <EditBalanceDialog row={balance} amount={balance.balance} forms={forms} onDelete={() => setOpen({ kind: "delete-balance", row: balance })} onClose={() => close()} />}
      {open?.kind === "delete-balance" && balance && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this balance?"
          body={`${balance.balanceText} for ${balance.accountName} on ${balance.dateText} is removed from the Sheet, and can't be undone. The balance before it is carried forward instead.`}
          hidden={{ id: balance.id }}
          keepLabel="Keep it"
          confirmLabel="Delete balance"
          action={deleteBalance}
          today={forms.today}
          onClose={() => close()}
        />
      )}
    </FormsContext.Provider>
  );
}

/** A button that opens a form. With sample data it stays focusable but disabled, with the reason as a tooltip. */
export function FormTrigger({ className, label, onClick, ref }: { className: string; label: string; onClick: () => void; ref?: Ref<HTMLButtonElement> }) {
  const { disabledReason } = useAccountForms();
  return (
    <button ref={ref} type="button" onClick={disabledReason ? undefined : onClick} aria-disabled={disabledReason ? true : undefined} title={disabledReason} className={`${className} ${disabledReason ? "cursor-not-allowed opacity-60" : ""}`}>
      {label}
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}

const HEADER_PRIMARY = "flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0";
const HEADER_GHOST = "flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-0";

/** The page header's Update balances (the check-in) and Add account, as in the design. */
export function HeaderFormButtons() {
  const { open, forms } = useAccountForms();
  return (
    <>
      {forms.accounts.some((a) => !a.closed) && <FormTrigger className={HEADER_GHOST} label="Update balances" onClick={() => open({ kind: "check-in" })} />}
      <FormTrigger className={HEADER_PRIMARY} label="Add account" onClick={() => open({ kind: "add" })} />
    </>
  );
}

const HERO_PRIMARY = "min-h-9 rounded-full bg-white px-4 text-xs font-extrabold text-[var(--ink)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white";
const HERO_SOFT = "min-h-9 rounded-full bg-on-card-fill px-4 text-xs font-bold text-on-card hover:bg-on-card-line-top focus-visible:outline-2 focus-visible:outline-white";

/** The open card's buttons: Update balance, Edit and Close for an account (Reopen and Edit when closed); the check-in and Add account for All. */
export function HeroButtons({ pickId, kind, closed }: { pickId: string; kind: "all" | "account"; closed: boolean }) {
  const { open } = useAccountForms();
  if (kind === "all") {
    return (
      <div className="flex flex-wrap gap-2">
        <FormTrigger className={HERO_PRIMARY} label="Update balances" onClick={() => open({ kind: "check-in" })} />
        <FormTrigger className={HERO_SOFT} label="Add account" onClick={() => open({ kind: "add" })} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {closed ? (
        <FormTrigger className={HERO_PRIMARY} label="Reopen" onClick={() => open({ kind: "reopen", id: pickId })} />
      ) : (
        <FormTrigger className={HERO_PRIMARY} label="Update balance" onClick={() => open({ kind: "balance", id: pickId })} />
      )}
      <FormTrigger className={HERO_SOFT} label="Edit" onClick={() => open({ kind: "edit", id: pickId })} />
      {!closed && <FormTrigger className={HERO_SOFT} label="Close" onClick={() => open({ kind: "close", id: pickId })} />}
    </div>
  );
}
