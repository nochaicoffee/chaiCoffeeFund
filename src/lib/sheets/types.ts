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
  /**
   * Last 4 digits of the card number, shown on its tile ("•••• 7042"). Text, so a leading zero survives.
   * Optional: the statement import fills it in from the PDF, and checks it on every statement after (#78).
   */
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

// --- Statement sync (#82) ---

/** What happened to one statement email: its statement was added, was already in the Sheet, or couldn't be read. */
export const STATEMENT_EMAIL_RESULTS = ["Imported", "Duplicate", "Failed"] as const;
export type StatementEmailResult = (typeof STATEMENT_EMAIL_RESULTS)[number];

/** One statement email the Gmail sync has looked at, so the next sync knows what to skip. */
export interface StatementEmail {
  id: string;
  messageId: string;
  /** The email's date. Blank only when the email itself couldn't be read. */
  receivedDate?: string;
  subject?: string;
  cardId?: string;
  result: StatementEmailResult;
  /** Why it failed, or anything else the import did, like filling in the card's last 4. */
  details?: string;
  /** The statement it added, or the one already in the Sheet. */
  statementId?: string;
  attempts: number;
  /** An ISO timestamp, like every *At field. */
  lastTriedAt: string;
}

export const SYNC_TRIGGERS = ["Manual", "Scheduled"] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];

/** Skipped: another sync was already running, so this one did nothing. */
export const SYNC_RUN_STATUSES = ["Running", "Done", "Failed", "Skipped"] as const;
export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number];

/** One run of the Gmail sync: how it was started and what it did. */
export interface SyncRun {
  id: string;
  trigger: SyncTrigger;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt?: string;
  imported?: number;
  duplicates?: number;
  failed?: number;
  /** New emails left for the next sync, when this one ran out of time. */
  remaining?: number;
  /** Why it failed or was skipped. */
  details?: string;
}

// --- Subscriptions ---

/** Paused and cancelled subscriptions are left out of every total. A cancelled one keeps its payments (#124). */
export type SubscriptionStatus = "Active" | "Paused" | "Cancelled";
/**
 * Skipped is a renewal that didn't charge, stored as a ₹0 payment (#125). Nothing in the
 * app writes Pending, since upcoming renewals are computed from the schedule; it stays
 * so a row that has it still reads.
 */
export type SubscriptionPaymentStatus = "Pending" | "Paid" | "Skipped";

/**
 * What a subscription is for, as the Subscriptions tab's category dropdown lists
 * it (#124). Shown without the hyphen ("Cloud storage"). Each has a colour on the
 * Subscriptions page, so a subscription needs no colour of its own.
 */
export const SUBSCRIPTION_CATEGORIES = ["Streaming", "Music", "Software", "Cloud-Storage", "Fitness", "Food", "Shopping", "News", "Utilities", "Other"] as const;
export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];

/**
 * The colours a subscription can be given (Prathik, 2026-10-21): picked freely in Add and
 * Edit, not from its category. The card palette and All's emerald, plus seven more in the
 * same deep-gradient style. Each is a token set in globals.css (--card-<name>-from/-to and
 * a swatch). A row from before this column has none, and shows its category's colour.
 */
export const SUBSCRIPTION_COLORS = ["Emerald", "Sapphire", "Ruby", "Onyx", "Violet", "Teal", "Copper", "Amber", "Rose", "Indigo", "Forest", "Plum", "Ocean", "Slate"] as const;
export type SubscriptionColor = (typeof SUBSCRIPTION_COLORS)[number];

export interface Subscription {
  id: string;
  name: string;
  alias: string;
  category: SubscriptionCategory;
  amount: number;
  billingCycle: RecurrenceCycle;
  billingAnchorDate: string;
  startDate: string;
  status: SubscriptionStatus;
  /** The day it was cancelled. Optional: a subscription can be cancelled without a date. */
  endDate?: string;
  /**
   * When it last started again after a pause or a cancellation (#128). The renewals
   * between its last payment before then and this date weren't expected, so they're
   * never flagged as not recorded.
   */
  resumedOn?: string;
  /** Its colour, chosen in Add and Edit. */
  color?: SubscriptionColor;
  /**
   * Where it's usually charged, at most one set, as on payments: a bank account, or a card.
   * New payments start from it. A card-charged subscription is already inside that card's
   * statement, so totals of everything you spend count it only there (monthlySpendOffCards in
   * lib/aggregate/subscriptions.ts, used by the Overview's monthly obligations).
   */
  defaultPaidFromAccountId?: string;
  defaultPaidFromCardId?: string;
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
