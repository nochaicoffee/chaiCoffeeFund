import { parseCsv } from "../tradeImport/csv";

/**
 * Reads the money that moved between his bank and a broker out of the broker's own ledger (its funds statement): Zerodha's ledger
 * (.csv), FYERS's yearly ledger report (.csv) and Groww's client fund ledger (.xlsx rows). Trades, charges and settlements are
 * left out, only pay-ins and payouts are kept. Pure: the script that writes them is scripts/importTransfers.ts.
 */

export class LedgerError extends Error {}

export interface LedgerTransfer {
  date: string;
  /** "in": from his bank to the broker (invested). "out": from the broker back to his bank (taken back). */
  direction: "in" | "out";
  amount: number;
  /** The broker's reference, or a stable stand-in when the ledger has none, so a re-run never adds a transfer twice. */
  reference: string;
  /** The bank account a payout names ("to STATE BANK OF INDIA 20300005678"): its bank and last four digits. Pay-ins rarely say. */
  bank?: { name: string; last4: string };
  /** The ledger line, for a person to check. */
  text: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "to FEDERAL BANK 55550100001234 A/C", "to State Bank Of India Bank A/C:00000020300005678": the bank and the account's last four. */
export function bankIn(text: string): LedgerTransfer["bank"] {
  const match = /\bto\s+([A-Za-z][A-Za-z .&]*?)\s*(?:Bank\s+)?(?:A\/C[:\s]*)?(\d{6,})/i.exec(text);
  if (!match) return undefined;
  const name = match[1].replace(/\s+/g, " ").trim();
  return { name, last4: match[2].slice(-4) };
}

/** Zerodha's ledger: a Bank Receipts line is money in, a Bank Payments line money out. */
export function parseZerodhaLedger(text: string): LedgerTransfer[] {
  const rows = parseCsv(text).filter((r) => r.length > 1);
  const header = rows[0]?.map((c) => c.trim());
  const at = (name: string) => header?.indexOf(name) ?? -1;
  const [particulars, date, voucher, debit, credit] = ["particulars", "posting_date", "voucher_type", "debit", "credit"].map(at);
  if ([particulars, date, voucher, debit, credit].some((i) => i < 0)) throw new LedgerError("This isn't a Zerodha ledger: it needs particulars, posting_date, voucher_type, debit and credit columns");
  const out: LedgerTransfer[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(1)) {
    const kind = row[voucher]?.trim();
    if (kind !== "Bank Receipts" && kind !== "Bank Payments") continue;
    const line = row[particulars].trim();
    const amount = round2(Number(kind === "Bank Receipts" ? row[credit] : row[debit]));
    if (!(amount > 0)) continue;
    const ref = /reference number\s+(\S+)/i.exec(line)?.[1];
    // Old payouts carry no reference: two on one day for the same amount are numbered, so neither is taken for a copy of the other.
    const base = `zerodha:${ref ?? `${row[date].trim()}:${kind === "Bank Receipts" ? "in" : "out"}:${amount}`}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ date: row[date].trim(), direction: kind === "Bank Receipts" ? "in" : "out", amount, reference: n === 1 ? base : `${base}:${n}`, ...(kind === "Bank Payments" && bankIn(line) && { bank: bankIn(line) }), text: line });
  }
  return out;
}

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
/** "02 Apr 2026" → "2026-04-02". */
function fyersDate(raw: string): string {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(raw.trim());
  if (!m || !MONTHS[m[2]]) throw new LedgerError(`FYERS: can't read the date ${JSON.stringify(raw)}`);
  return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
}

/** A FYERS ledger report (one per financial year): "Funds added" is money in, "Funds withdrawn" money out. It has no reference, so one is made from the line. */
export function parseFyersLedger(text: string): LedgerTransfer[] {
  const rows = parseCsv(text);
  const headerAt = rows.findIndex((r) => r[0]?.trim() === "Date" && r[1]?.trim() === "Transaction type");
  if (headerAt < 0) throw new LedgerError("This isn't a FYERS ledger report: there is no Date, Transaction type header");
  const out: LedgerTransfer[] = [];
  const seen = new Map<string, number>();
  for (const row of rows.slice(headerAt + 1)) {
    const kind = row[1]?.trim();
    if (kind !== "Funds added" && kind !== "Funds withdrawn") continue;
    const date = fyersDate(row[0]);
    const amount = round2(Number(kind === "Funds added" ? row[4] : row[3]));
    if (!(amount > 0)) continue;
    const base = `fyers:${date}:${kind === "Funds added" ? "in" : "out"}:${amount}`;
    // Two identical lines on one day are two transfers: number them so neither is taken for a copy of the other.
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const line = row[2]?.trim() ?? "";
    out.push({ date, direction: kind === "Funds added" ? "in" : "out", amount, reference: n === 1 ? base : `${base}:${n}`, ...(kind === "Funds withdrawn" && bankIn(line) && { bank: bankIn(line) }), text: line });
  }
  return out;
}

type Cell = string | number | boolean | Date | null | undefined;

/** "04-07-2026" → "2026-07-04". */
function growwDate(raw: Cell): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(raw ?? "").trim());
  if (!m) throw new LedgerError(`Groww: can't read the date ${JSON.stringify(raw)}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Groww's client fund ledger: a UPI line is money in; GROWW_WITHDRAW and STOCK_PAYOUT are money paid out to the bank. */
export function parseGrowwLedger(rows: Cell[][]): LedgerTransfer[] {
  const headerAt = rows.findIndex((r) => String(r[0] ?? "").trim() === "Transaction Date");
  if (headerAt < 0) throw new LedgerError("This isn't a Groww fund ledger: there is no Transaction Date header");
  const header = rows[headerAt].map((c) => String(c ?? "").trim());
  const [segment, voucher, debit, credit] = ["Segment Type", "Voucher No.", "Debit (Rs.)", "Credit (Rs.)"].map((n) => header.indexOf(n));
  if ([segment, voucher, debit, credit].some((i) => i < 0)) throw new LedgerError("Groww's ledger columns have changed: it needs Segment Type, Voucher No., Debit (Rs.) and Credit (Rs.)");
  const out: LedgerTransfer[] = [];
  for (const row of rows.slice(headerAt + 1)) {
    const kind = String(row[segment] ?? "").trim();
    const isIn = kind === "UPI";
    if (!isIn && kind !== "GROWW_WITHDRAW" && kind !== "STOCK_PAYOUT") continue;
    const amount = round2(Number(isIn ? row[credit] : row[debit]));
    if (!(amount > 0)) continue;
    out.push({ date: growwDate(row[0]), direction: isIn ? "in" : "out", amount, reference: `groww:${String(row[voucher] ?? "").trim()}`, text: kind });
  }
  return out;
}
