import { describe, expect, it } from "vitest";
import { bankIn, LedgerError, parseFyersLedger, parseGrowwLedger, parseZerodhaLedger } from "./ledgers";

// Made-up lines in each broker's own layout.
const ZERODHA = `particulars,posting_date,cost_center,voucher_type,debit,credit,net_balance
Opening Balance,,,,,,1000.00
Net settlement  for  NSE-Equity with settlement number: 2026101,2026-05-12,NSE-EQ - Z,Book Voucher,900.000000,0.000000,100.00
Funds added using UPI from AB1234 with reference number 111222333,2026-05-12,NSE-EQ - Z,Bank Receipts,0.000000,50000.000000,50100.00
Instant Payout of 20000.0/- to FEDERAL BANK 55550100001234 A/C number as per withdrawal request made on 2026-06-02 with reference number abc999,2026-06-02,NSE-EQ - Z,Bank Payments,20000.000000,0.000000,30100.00
Payout of 2000.0/- to STATE BANK OF INDIA 20300005678 A/C number as per withdrawal request made on 2020-12-15,2020-12-15,NSE-EQ - Z,Bank Payments,2000.000000,0.000000,28100.00
Payout of 2000.0/- to STATE BANK OF INDIA 20300005678 A/C number as per withdrawal request made on 2020-12-15,2020-12-15,NSE-EQ - Z,Bank Payments,2000.000000,0.000000,26100.00
Funds auto-settled to the primary bank account  with reference number zz77,2026-07-03,NSE-EQ - Z,Bank Payments,100.170000,0.000000,0.00
AMC for Demat Account,2026-08-14,NSE-EQ - Z,Journal Entry,88.500000,0.000000,-88.50
Closing Balance,,,,,,-88.50`;

const FYERS = `Report Title,Ledger report
Date Range,From 01/04/2026 to 31/03/2027
Client Name,SOMEONE

Funds Added,20000.00
Closing Balance,0.00

Date,Transaction type,Description,Debit amount,Credit amount,Running balance
17 Apr 2026,Funds withdrawn,Funds sent from your trading account to your bank as part of the mandatory quarterly settlement to State Bank Of India Bank A/C:00000020300005678 Paid By NEFT/RTGS,5000.00,0.00,0.00
06 Apr 2026,Trading,Executed trades for the day in F&O segment,15000.00,0.00,5000.00
02 Apr 2026,Funds added,Funds added to your trading account,0.00,10000.00,20000.00
02 Apr 2026,Funds added,Funds added to your trading account,0.00,10000.00,10000.00
01 Apr 2026,Opening Balance,Opening Balance,0.00,0.00,0.00`;

const GROWW = [
  ["Client Name", "Someone"],
  [],
  ["Transaction Date", "Settlement Date", "Clearing Corporation/Clearing Member", "Segment Type", "Settlement No.", "Bill/Chq No.", "Transaction Type", "Particulars / Narration", "Voucher No.", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"],
  ["04-07-2026", "04-07-2026", "N/A", "STOCK_PAYOUT", "N/A", "x", "Payment", "N/A", "WTD2", 48.27, 0, 0],
  ["03-07-2026", "03-07-2026", "N/A", "GROWW_WITHDRAW", "N/A", "x", "Payment", "N/A", "WTD1", 1000, 0, 48.27],
  ["02-07-2026", "03-07-2026", "CM", "STOCKS_SETTLEMENT", "s", "s", "bill", "N/A", "SET1", 0, 948.27, 1048.27],
  ["02-06-2026", "02-06-2026", "N/A", "UPI", "N/A", "x", "JV", "N/A", "DEP1", 0, 100, 100],
  [],
];

describe("bankIn", () => {
  it("reads the bank and last four a payout names", () => {
    expect(bankIn("Instant Payout of 20000.0/- to FEDERAL BANK 55550100001234 A/C number")).toEqual({ name: "FEDERAL", last4: "1234" });
    expect(bankIn("to State Bank Of India Bank A/C:00000020300005678 Paid By NEFT")).toEqual({ name: "State Bank Of India", last4: "5678" });
    expect(bankIn("Funds auto-settled to the primary bank account")).toBeUndefined();
  });
});

describe("parseZerodhaLedger", () => {
  const rows = parseZerodhaLedger(ZERODHA);
  it("keeps only pay-ins and payouts, with their references (numbered when two have none and match) and the bank a payout names", () => {
    expect(rows.map((r) => [r.date, r.direction, r.amount, r.reference, r.bank?.last4])).toEqual([
      ["2026-05-12", "in", 50000, "zerodha:111222333", undefined],
      ["2026-06-02", "out", 20000, "zerodha:abc999", "1234"],
      ["2020-12-15", "out", 2000, "zerodha:2020-12-15:out:2000", "5678"],
      ["2020-12-15", "out", 2000, "zerodha:2020-12-15:out:2000:2", "5678"],
      ["2026-07-03", "out", 100.17, "zerodha:zz77", undefined],
    ]);
  });
  it("refuses a file that isn't a Zerodha ledger", () => {
    expect(() => parseZerodhaLedger("a,b\n1,2")).toThrow(LedgerError);
  });
});

describe("parseFyersLedger", () => {
  const rows = parseFyersLedger(FYERS);
  it("keeps funds added and withdrawn, and numbers two identical pay-ins on one day so neither is lost", () => {
    expect(rows.map((r) => [r.date, r.direction, r.amount, r.reference, r.bank?.last4])).toEqual([
      ["2026-04-17", "out", 5000, "fyers:2026-04-17:out:5000", "5678"],
      ["2026-04-02", "in", 10000, "fyers:2026-04-02:in:10000", undefined],
      ["2026-04-02", "in", 10000, "fyers:2026-04-02:in:10000:2", undefined],
    ]);
  });
});

describe("parseGrowwLedger", () => {
  it("keeps UPI pay-ins and both kinds of payout, by voucher", () => {
    expect(parseGrowwLedger(GROWW).map((r) => [r.date, r.direction, r.amount, r.reference])).toEqual([
      ["2026-07-04", "out", 48.27, "groww:WTD2"],
      ["2026-07-03", "out", 1000, "groww:WTD1"],
      ["2026-06-02", "in", 100, "groww:DEP1"],
    ]);
  });
});
