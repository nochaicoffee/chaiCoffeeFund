import { vestCovers } from "@/lib/aggregate/tradeHistory";
import type { BrokerCash } from "@/lib/aggregate/brokerCash";
import { brokerAccountOptions, type BrokerAccountOption } from "@/lib/forms/tradeForms";
import { transferAccounts, type TransferAccounts } from "@/lib/forms/transferForm";
import type { Account, AccountCurrency, Instrument, InvestmentTarget, InvestmentTransaction, Transfer } from "@/lib/sheets/types";

/** A broker cash account a trade can be paid from (or its proceeds land in), with the balance last on record, in its own currency. */
export interface CashOption {
  id: string;
  name: string;
  currency: AccountCurrency;
  balance: number;
  /** The day that balance was read. */
  date: string;
}

export const cashOptions = (cash: BrokerCash[]): CashOption[] => cash.map((c) => ({ id: c.account.id, name: c.account.name, currency: c.account.currency ?? "INR", balance: c.balance, date: c.date }));

/** What the trade forms need from the page: today, the holdings to choose from, the saved trades, the brokerage accounts and their cash. */
export interface TradeFormsData {
  today: string;
  instruments: Pick<Instrument, "symbol" | "market" | "name" | "assetType">[];
  trades: InvestmentTransaction[];
  /** His Brokerage accounts (from Accounts): a trade's broker is one of them. */
  brokerAccounts: BrokerAccountOption[];
  /** The ones with a balance on record, for what a trade leaves in cash. */
  cash: CashOption[];
  /** The accounts the Add transfer form offers: his open rupee banks and his Brokerage accounts. */
  transfer: TransferAccounts | null;
  /** The saved transfers, for one to open its form to edit or delete. */
  transfers: Transfer[];
  /** The targets and limits he has set, for the Your targets and limits form to open filled in. */
  targets: InvestmentTarget[];
}

export function tradeFormsData(trades: InvestmentTransaction[], instruments: Instrument[], today: string, accounts?: Account[], cash: BrokerCash[] = [], targets: InvestmentTarget[] = [], transfers: Transfer[] = []): TradeFormsData {
  return {
    today,
    instruments: instruments.map(({ symbol, market, name, assetType }) => ({ symbol, market, name, assetType })).sort((a, b) => a.name.localeCompare(b.name)),
    trades,
    brokerAccounts: brokerAccountOptions(accounts ?? []),
    cash: cashOptions(cash),
    // Null when the Accounts tab couldn't be read, which the form says rather than offering nothing.
    transfer: accounts ? transferAccounts(accounts) : null,
    transfers,
    targets,
  };
}

/**
 * Which form a saved trade opens: an RSU trade opens the vest form with both trades of that day (the Buy and its sell-to-cover), an
 * ESPP purchase the ESPP form, anything else the trade form. `ids` are the rows the form edits.
 */
export type EditTarget = { kind: "trade"; ids: [string] } | { kind: "vest"; ids: string[]; vest: string; cover?: string } | { kind: "espp"; ids: [string] };

export function editTarget(trades: InvestmentTransaction[], id: string): EditTarget | null {
  const trade = trades.find((t) => t.id === id);
  if (!trade) return null;
  if (trade.source === "RSU") {
    // The same pairing the Trades page shows (two grants vesting on one day each keep their own cover).
    const pairs = vestCovers(trades);
    const vestId = trade.tradeType === "Buy" ? trade.id : [...pairs].find(([, c]) => c.id === trade.id)?.[0];
    if (vestId) {
      const cover = pairs.get(vestId);
      return { kind: "vest", ids: [vestId, ...(cover ? [cover.id] : [])], vest: vestId, ...(cover && { cover: cover.id }) };
    }
    return { kind: "trade", ids: [trade.id] };
  }
  if (trade.source === "ESPP" && trade.tradeType === "Buy") return { kind: "espp", ids: [trade.id] };
  return { kind: "trade", ids: [trade.id] };
}
