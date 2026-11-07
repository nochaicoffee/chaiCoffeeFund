"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import type { FormState } from "@/lib/forms/formState";
import { readInstrumentForm } from "@/lib/forms/instrumentForm";
import { planTargetWrites, readTargetsForm } from "@/lib/forms/targetsForm";
import { deleteProblem, readEsppForm, readTradeForm, readVestForm, type TradeFormContext, type TradeInput } from "@/lib/forms/tradeForms";
import { parseUsdInrOn, usdInrOnUrl } from "@/lib/prices/usdInrParse";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { accountsRepository } from "@/lib/sheets/accounts";
import { createInstrumentSchema, instrumentsRepository } from "@/lib/sheets/instruments";
import { createInvestmentTransactionSchema, investmentTransactionsRepository, updateInvestmentTransactionSchema } from "@/lib/sheets/investmentTransactions";
import { investmentTargetsRepository } from "@/lib/sheets/investmentTargets";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { InvestmentTransaction } from "@/lib/sheets/types";

/**
 * The trade forms' server actions (docs/design/investments.md, InvForms), used with useActionState like the other dashboards': each
 * reads the fields with lib/forms/tradeForms (plain-word errors by field, a sell can't be more than was held), then writes. An RSU
 * vest saves its two trades in one write. A new trade or vest, and a delete, come back with what Undo takes back.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const ids = (formData: FormData): string[] => {
  const value = formData.get("ids") ?? formData.get("id");
  return typeof value === "string" && value !== "" ? value.split(",") : [];
};
const gone: FormState = { status: "invalid", errors: { form: "This trade isn't in the Sheet any more. Close this and refresh." } };

function failed(action: string, error: unknown): FormState {
  console.error(`[investments] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}
function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.investmentTransactions);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

/** `withAccounts` also reads the Accounts tab, for a trade that names a cash account to be paid from: the other forms never do. */
async function load(withAccounts = false): Promise<TradeFormContext> {
  const [instruments, trades, accounts] = await Promise.all([instrumentsRepository.list(), investmentTransactionsRepository.list(), withAccounts ? accountsRepository.list() : Promise.resolve(null)]);
  return { instruments, trades, ...(accounts && { cashAccountIds: accounts.filter((a) => a.accountType === "Brokerage").map((a) => a.id) }) };
}

/** Frankfurter's USD to INR for a day (the last working day's for a weekend), for the form to prefill and the action to fall back on. */
export async function rateFor(date: string): Promise<{ ok: true; rate: number } | { ok: false; message: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Pick a day first." };
  try {
    const response = await fetch(usdInrOnUrl(date), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { ok: false, message: "The rate service didn't answer." };
    const parsed = parseUsdInrOn(await response.json(), date);
    return parsed.ok ? { ok: true, rate: parsed.rate } : { ok: false, message: "No rate for that day." };
  } catch {
    return { ok: false, message: "The rate service couldn't be reached." };
  }
}

/** A US trade left without a rate gets Frankfurter's for its day, so the form still saves when the prefill didn't arrive. */
async function withRate(raw: Record<string, FormDataEntryValue>, ctx: TradeFormContext, dayField: string): Promise<Record<string, FormDataEntryValue>> {
  const holding = String(raw.holding ?? "");
  const day = String(raw[dayField] ?? "");
  if (!holding.startsWith("US:") || String(raw.fxRateToInr ?? "").trim() !== "" || !ctx.instruments.some((i) => `${i.market}:${i.symbol}` === holding)) return raw;
  const found = await rateFor(day);
  return found.ok ? { ...raw, fxRateToInr: String(found.rate) } : raw;
}

const parseRow = (row: TradeInput) => createInvestmentTransactionSchema.parse(row);
const patchOf = (row: TradeInput) => updateInvestmentTransactionSchema.parse({ ...row, fxRateToInr: row.fxRateToInr ?? "", settlementAccountId: row.settlementAccountId ?? "" }) as Partial<Omit<InvestmentTransaction, "id">>;

const withoutId = (row: InvestmentTransaction): TradeInput => {
  const copy: Partial<InvestmentTransaction> = { ...row };
  delete copy.id;
  return copy as TradeInput;
};

type UndoToken = { op: "added"; ids: string[] } | { op: "deleted"; rows: TradeInput[] };
const token = (value: UndoToken): string => JSON.stringify(value);

/**
 * Save the Your targets and limits form: the eight numbers, a blank one meaning not set. Only what changed is written, one write after another
 * (a tab takes concurrent writes badly), so a failure part-way leaves the rest to a retry from the same form.
 */
export async function saveTargets(_previous: FormState, formData: FormData): Promise<FormState> {
  try {
    const result = readTargetsForm(fields(formData));
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const writes = planTargetWrites(await investmentTargetsRepository.list(), result.input);
    if (writes.create.length > 0) await investmentTargetsRepository.createMany(writes.create);
    for (const { id, percent } of writes.update) await investmentTargetsRepository.update(id, { percent });
    for (const id of writes.remove) await investmentTargetsRepository.remove(id);
    updateTag(CACHE_TAGS.investmentTargets);
    return { status: "saved", at: Date.now() };
  } catch (error) {
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveTargets", error);
  }
}

/** Add a holding (an instrument): what it is and where its price comes from, so the trade forms can offer it. */
export async function saveInstrument(_previous: FormState, formData: FormData): Promise<FormState> {
  try {
    const result = readInstrumentForm(fields(formData), await instrumentsRepository.list());
    if (!result.ok) return { status: "invalid", errors: result.errors };
    await instrumentsRepository.createMany([createInstrumentSchema.parse(result.input)]);
    updateTag(CACHE_TAGS.instruments);
    return { status: "saved", at: Date.now() };
  } catch (error) {
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveInstrument", error);
  }
}

/** Add a trade, or Edit one when the form carries an id. */
export async function saveTrade(_previous: FormState, formData: FormData): Promise<FormState> {
  const [editing] = ids(formData);
  try {
    const ctx = await load(String(formData.get("settlementAccountId") ?? "").trim() !== "");
    if (editing && !ctx.trades.some((t) => t.id === editing)) return gone;
    const result = readTradeForm(await withRate(fields(formData), ctx, "tradeDate"), ctx, todayIso(), editing);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    if (editing) {
      await investmentTransactionsRepository.update(editing, patchOf(result.input.row));
      return refreshed();
    }
    const [created] = await investmentTransactionsRepository.createMany([parseRow(result.input.row)]);
    return refreshed({ id: token({ op: "added", ids: [created.id] }), message: "Trade added." });
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveTrade", error);
  }
}

/** Record an RSU vest (both trades in one write), or Edit one: the form carries the ids of the vest and its sell-to-cover. */
export async function saveVest(_previous: FormState, formData: FormData): Promise<FormState> {
  const [vestId, coverId] = ids(formData);
  try {
    const ctx = await load();
    if (vestId && !ctx.trades.some((t) => t.id === vestId)) return gone;
    const result = readVestForm(await withRate(fields(formData), ctx, "tradeDate"), ctx, todayIso(), ids(formData));
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const { vest, cover } = result.input;
    if (!vestId) {
      const created = await investmentTransactionsRepository.createMany([vest, ...(cover ? [cover] : [])].map(parseRow));
      return refreshed({ id: token({ op: "added", ids: created.map((c) => c.id) }), message: cover ? "Vest recorded: two trades." : "Vest recorded." });
    }
    // Two or three writes in a row, not one: if one fails the rest are not made, and a retry from the form puts them right.
    await investmentTransactionsRepository.update(vestId, patchOf(vest));
    if (cover && coverId) await investmentTransactionsRepository.update(coverId, patchOf(cover));
    else if (cover) await investmentTransactionsRepository.createMany([parseRow(cover)]);
    else if (coverId) await investmentTransactionsRepository.remove(coverId);
    return refreshed();
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveVest", error);
  }
}

/** Record an ESPP purchase, or Edit one. */
export async function saveEspp(_previous: FormState, formData: FormData): Promise<FormState> {
  const [editing] = ids(formData);
  try {
    const ctx = await load();
    if (editing && !ctx.trades.some((t) => t.id === editing)) return gone;
    const result = readEsppForm(await withRate(fields(formData), ctx, "tradeDate"), ctx, todayIso());
    if (!result.ok) return { status: "invalid", errors: result.errors };
    if (editing) {
      await investmentTransactionsRepository.update(editing, patchOf(result.input));
      return refreshed();
    }
    const [created] = await investmentTransactionsRepository.createMany([parseRow(result.input)]);
    return refreshed({ id: token({ op: "added", ids: [created.id] }), message: "ESPP purchase recorded." });
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveEspp", error);
  }
}

/** Delete one trade, or a vest's two together. Refused when a later sell depends on what is deleted. */
export async function deleteTrades(_previous: FormState, formData: FormData): Promise<FormState> {
  const wanted = ids(formData);
  if (wanted.length === 0) return gone;
  try {
    const ctx = await load();
    const rows = ctx.trades.filter((t) => wanted.includes(t.id));
    if (rows.length === 0) return gone;
    const problem = deleteProblem(ctx, wanted);
    if (problem) return { status: "invalid", errors: { form: problem } };
    for (const row of rows) await investmentTransactionsRepository.remove(row.id);
    return refreshed({ id: token({ op: "deleted", rows: rows.map(withoutId) }), message: rows.length === 1 ? "Trade deleted." : "Vest deleted." });
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("deleteTrades", error);
  }
}

/** Takes back what the toast offered: an add is removed, a delete is put back (as new rows, same details). */
export async function undoTrade(raw: string): Promise<{ ok: boolean; message: string }> {
  let written: UndoToken;
  try {
    written = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Couldn't undo it. Change it from the list instead." };
  }
  try {
    if (written.op === "added") {
      const stored = new Set((await investmentTransactionsRepository.list()).map((t) => t.id));
      for (const id of written.ids) if (stored.has(id)) await investmentTransactionsRepository.remove(id);
    } else {
      await investmentTransactionsRepository.createMany(written.rows.map(parseRow));
    }
  } catch (error) {
    console.error("[investments] undoTrade failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Change it from the list instead." };
  }
  updateTag(CACHE_TAGS.investmentTransactions);
  return { ok: true, message: "Put back as it was." };
}
