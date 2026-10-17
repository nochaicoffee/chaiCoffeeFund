// Enum-style fields use Title-Case, hyphenated for multi-word values
// (e.g. "Emergency-Fund") — matching the Sheet's actual dropdown option
// text exactly, since Sheets Tables validate against that literal text.

export type AccountType = "Savings" | "Current";
export type AccountPurpose = "Spending" | "Investment" | "Emergency-Fund" | "Loan-Payments";
export type AccountStatus = "Active" | "Inactive";

export interface Account {
  id: string;
  name: string;
  bank: string;
  accountType: AccountType;
  purpose: AccountPurpose;
  startDate: string;
  status: AccountStatus;
}

export interface BalanceSnapshot {
  id: string;
  accountId: string;
  date: string;
  balance: number;
}

export type RecurrenceCycle = "Monthly" | "Quarterly" | "Yearly";

// --- Cards ---

export type CardStatus = "Active" | "Inactive" | "Closed";

/** Tile colours a card can be given. Each maps to the --card-<colour> tokens in globals.css; emerald is kept for All Cards. */
export const CARD_COLORS = ["Sapphire", "Ruby", "Onyx", "Violet", "Teal", "Copper"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

/** What a card earns (#75). Shown as "Reward Points" and "Cashback". */
export const CARD_TYPES = ["Reward-Points", "Cashback"] as const;
export type CardType = (typeof CARD_TYPES)[number];

/**
 * The banks that issue cards in India, as the Cards tab's issuer dropdown lists
 * them (#75). Shown without the hyphens ("HDFC Bank"). Other is for a bank not
 * listed yet; add it here and to the Sheet's dropdown together.
 */
export const CARD_ISSUERS = [
  "HDFC-Bank",
  "ICICI-Bank",
  "Axis-Bank",
  "SBI-Card",
  "Kotak-Mahindra-Bank",
  "YES-Bank",
  "IDFC-FIRST-Bank",
  "IndusInd-Bank",
  "AU-Small-Finance-Bank",
  "RBL-Bank",
  "Federal-Bank",
  "CSB-Bank",
  "HSBC",
  "Standard-Chartered",
  "American-Express",
  "Other",
] as const;
export type CardIssuer = (typeof CARD_ISSUERS)[number];

export type StatementStatus = "Pending" | "Paid";

export interface Card {
  id: string;
  name: string;
  alias: string;
  issuer: CardIssuer;
  cardType: CardType;
  creditLimit: number;
  /** Day of the month the statement is generated, 1–31. A short month uses its last day (see cardSchedule.ts). */
  statementDay: number;
  /** Days from a statement to its due date. Each statement's actual due date comes from its PDF. */
  dueDayBuffer: number;
  status: CardStatus;
  /** Password to open this card's statement PDF — used only by the Gmail ingestion pipeline. */
  statementPdfPassword?: string;
  /** Comma-separated extra keywords for matching a statement email to this card, beyond name/alias. */
  emailMatchKeywords?: string;
  /** Last 4 digits of the card number, shown on its tile ("•••• 7042"). Text, so a leading zero survives. */
  last4?: string;
  /** The card's tile colour. Optional only for rows created before it existed. */
  color?: CardColor;
  /** The bank account this card's bill is usually paid from: Mark paid's default. */
  defaultPaidFromAccountId?: string;
}

export interface Statement {
  id: string;
  cardId: string;
  statementDate: string;
  dueDate: string;
  totalAmountDue: number;
  minimumAmountDue: number;
  status: StatementStatus;
  amountPaid?: number;
  /** At most one set — see the cross-cutting payment-source principle. */
  paidFromAccountId?: string;
  paidFromCardId?: string;
  paidDate?: string;
}

// --- Subscriptions ---

export type SubscriptionStatus = "Active" | "Paused";
export type SubscriptionPaymentStatus = "Pending" | "Paid";

export interface Subscription {
  id: string;
  name: string;
  alias: string;
  category: string;
  amount: number;
  billingCycle: RecurrenceCycle;
  billingAnchorDate: string;
  startDate: string;
  status: SubscriptionStatus;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  paymentDate: string;
  amount: number;
  status: SubscriptionPaymentStatus;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

// --- Income ---

export type IncomeCategory = "Salary" | "Investment" | "Other";
export type IncomeFrequency = "Monthly" | "Quarterly" | "Yearly" | "One-Time";
export type IncomeSourceStatus = "Active" | "Inactive";
export type IncomeEntryStatus = "Received" | "Pending";
export type IncomeTag = "Regular" | "Bonus" | "Other";

export interface IncomeSource {
  id: string;
  name: string;
  alias: string;
  category: IncomeCategory;
  frequency: IncomeFrequency;
  expectedAmount: number;
  status: IncomeSourceStatus;
}

export interface IncomeEntry {
  id: string;
  incomeSourceId: string;
  expectedDate: string;
  receivedDate?: string;
  amount: number;
  status: IncomeEntryStatus;
  accountId?: string;
  tag: IncomeTag;
}

// --- Loans ---
// Scoped to personal loans borrowed from a bank — no lending-to-others
// concept here, so there's no "direction" field.

export type LoanCategory = "Personal" | "Auto" | "Home" | "Other";
// Only "Standard-Emi" (true reducing-balance amortization) is designed so
// far. Other structures (pre-deducted interest, interest-only, bullet) need
// their own dedicated design pass before being added here — not inferred
// from old-sheet numbers.
export type RepaymentStructure = "Standard-Emi";
export type LoanStatus = "Active" | "Closed";
export type LoanInstallmentStatus = "Pending" | "Paid";

export interface Loan {
  id: string;
  name: string;
  lenderName: string;
  category: LoanCategory;
  repaymentStructure: RepaymentStructure;
  principalAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
  paymentFrequency: RecurrenceCycle;
  processingFee: number;
  disbursementDate: string;
  accountId: string;
  status: LoanStatus;
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  openingBalance: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  status: LoanInstallmentStatus;
  amountPaid?: number;
  paidDate?: string;
  overdueCharge?: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

// --- Investments ---
// Positions/holdings are never stored as raw rows — they're computed in
// lib/aggregate/investments.ts from this transaction log.

export type InvestmentMarket = "IND" | "US";
export type InvestmentCurrency = "INR" | "USD";
export type TradeType = "Buy" | "Sell";
// How the shares were acquired. RSU vests and ESPP purchases are logged as
// a normal Buy (quantity + price = FMV at vest, or the discounted purchase
// price) — this field just tags which kind, it doesn't change the row shape.
export type InvestmentSource = "Market" | "RSU" | "ESPP";

export interface InvestmentTransaction {
  id: string;
  tradeDate: string;
  symbol: string;
  market: InvestmentMarket;
  currency: InvestmentCurrency;
  tradeType: TradeType;
  source: InvestmentSource;
  quantity: number;
  price: number;
  total: number;
  assetType: string;
  broker: string;
  /** Debited for a Buy, credited for a Sell. */
  settlementAccountId?: string;
  /**
   * USD→INR rate on `tradeDate`, captured once and never recomputed — a
   * historical fact for cost-basis math, distinct from the live rate in
   * `Prices` used for today's portfolio value. Only meaningful when
   * `market` is "US"; leave blank for "IND".
   */
  fxRateToInr?: number;
}

// --- Fixed deposits ---
// Structurally the mirror of a Loan (money placed with a bank rather than
// borrowed from one), but simpler: no repayment schedule, just a principal
// that grows to a bank-quoted maturity value. That maturity amount is
// stored as a fact from the bank, not computed — real FDs compound on
// conventions (quarterly compounding, day-count basis) that vary by bank,
// so guessing the formula risks being confidently wrong, the same mistake
// avoided for Loan EMI math.

export type FixedDepositCompounding = "Cumulative" | "Non-Cumulative";
export type FixedDepositStatus = "Active" | "Matured" | "Closed";

export interface FixedDeposit {
  id: string;
  name: string;
  bankName: string;
  principalAmount: number;
  interestRate: number;
  compoundingType: FixedDepositCompounding;
  /** Only meaningful for Non-Cumulative (interest paid out, not reinvested). */
  payoutFrequency?: RecurrenceCycle;
  startDate: string;
  maturityDate: string;
  /** Bank-quoted, not computed — see the note above. */
  maturityAmount: number;
  accountId?: string;
  status: FixedDepositStatus;
}
