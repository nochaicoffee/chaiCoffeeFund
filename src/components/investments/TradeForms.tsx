"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { deleteTrades, undoTrade } from "@/app/investments/tradeActions";
import { editTarget, type EditTarget, type TradeFormsData } from "@/app/investments/tradeFormsData";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { AlertIcon } from "../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS } from "../shell/FormTriggerButton";
import { useUndoToast } from "../shell/UndoToast";
import { ConfirmDialog } from "../subscriptions/forms/ConfirmDialog";
import { InstrumentDialog } from "./InstrumentDialog";
import { TargetsDialog } from "./TargetsDialog";
import { EsppDialog, TradeDialog, VestDialog } from "./TradeDialogs";

/**
 * Opens the trade forms from anywhere on the page: Add a trade, Record an RSU vest, Record an ESPP purchase, Edit (which opens the form
 * that fits the trade) and Delete. A trade just added or deleted gets a toast with Undo for six seconds.
 */

type Open = { kind: "add" } | { kind: "holding" } | { kind: "targets" } | { kind: "vest" } | { kind: "espp" } | { kind: "edit"; id: string } | { kind: "delete"; target: EditTarget };

interface Controls {
  forms: TradeFormsData;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useTradeForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useTradeForms needs a TradeFormsProvider");
  return controls;
}

export function TradeFormsProvider({ forms, children }: { forms: TradeFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const { saved, view } = useUndoToast(undoTrade);
  // The button that opened the form, so focus goes back to it on close (also after Edit → Delete).
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
  const find = (id: string | undefined) => forms.trades.find((t) => t.id === id);
  const target = open?.kind === "edit" ? editTarget(forms.trades, open.id) : null;
  const toDelete = (t: EditTarget) => () => setOpen({ kind: "delete", target: t });
  const done = (message: string) => (undo?: { id: string; message: string }) => saved(undo, message);

  const deleting = open?.kind === "delete" ? open.target : null;
  const deletingRows = deleting ? deleting.ids.map(find).filter((t) => t !== undefined) : [];
  const first = deletingRows[0];

  return (
    <FormsContext.Provider value={{ forms, open: show }}>
      {children}
      {open?.kind === "add" && <TradeDialog forms={forms} onClose={close} onSaved={done("Saved.")} />}
      {open?.kind === "holding" && <InstrumentDialog existing={forms.instruments} onClose={close} onSaved={() => saved(undefined, "Holding added.")} />}
      {open?.kind === "targets" && <TargetsDialog saved={forms.targets} onClose={close} onSaved={() => saved(undefined, "Targets and limits saved.")} />}
      {open?.kind === "vest" && <VestDialog forms={forms} onClose={close} onSaved={done("Saved.")} />}
      {open?.kind === "espp" && <EsppDialog forms={forms} onClose={close} onSaved={done("Saved.")} />}
      {target?.kind === "trade" && <TradeDialog forms={forms} trade={find(target.ids[0])} onClose={close} onSaved={done("Saved.")} onDelete={toDelete(target)} />}
      {target?.kind === "vest" && <VestDialog forms={forms} vest={find(target.vest)} cover={find(target.cover)} onClose={close} onSaved={done("Saved.")} onDelete={toDelete(target)} />}
      {target?.kind === "espp" && <EsppDialog forms={forms} purchase={find(target.ids[0])} onClose={close} onSaved={done("Saved.")} onDelete={toDelete(target)} />}
      {deleting && first && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={deleting.kind === "vest" ? "Delete this RSU vest?" : "Delete this trade?"}
          body={
            deleting.kind === "vest"
              ? `The vest of ${first.symbol} on ${formatDate(first.tradeDate)}${deletingRows.length > 1 ? " and the shares sold to cover its tax" : ""} are removed from the Sheet. You can undo it for a few seconds.`
              : `${formatDate(first.tradeDate)} · ${first.tradeType === "Buy" ? "a buy" : "a sell"} of ${first.quantity} ${first.symbol} for ${formatMoney(first.currency, first.total)} is removed from the Sheet. You can undo it for a few seconds.`
          }
          hidden={{ ids: deleting.ids.join(",") }}
          keepLabel="Keep it"
          confirmLabel={deleting.kind === "vest" ? "Delete vest" : "Delete trade"}
          action={deleteTrades}
          today={forms.today}
          onClose={close}
          onSaved={(undo) => saved(undo, "Deleted.")}
        />
      )}
      {view}
    </FormsContext.Provider>
  );
}

/** The page header's four ways in. */
export function TradeButtons() {
  const { open } = useTradeForms();
  return (
    <>
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="Add trade" onClick={() => open({ kind: "add" })} />
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="RSU vest" onClick={() => open({ kind: "vest" })} />
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="ESPP purchase" onClick={() => open({ kind: "espp" })} />
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="Add holding" onClick={() => open({ kind: "holding" })} />
    </>
  );
}
