// Enum-style fields use Title-Case, hyphenated for multi-word values
// (e.g. "Emergency-Fund") — matching the Sheet's actual dropdown option
// text exactly, since Sheets Tables validate against that literal text.

export type AccountType = "Savings" | "Current";
export type AccountPurpose = "Spending" | "Investment" | "Emergency-Fund" | "Loan-Payments";
/** Closed is Inactive with a ₹0 balance on the day (#160): the Sheet's dropdown stays Active or Inactive. */
export type AccountStatus = "Active" | "Inactive";

export interface Account {
  id: string;
  name: string;
  bank: string;
  accountType: AccountType;
  purpose: AccountPurpose;
  startDate: string;
  status: AccountStatus;
  /** The account's card colour. Optional: a row without one shows its purpose's colour (accountColor in lib/aggregate/accounts.ts). */
  color?: CardColor;
  /** Last 4 digits of the account number, text so a leading zero survives. Never the full number. */
  last4?: string;
  /** Password to open this account's statement PDFs. Used only by the Gmail statement import; never sent to the browser (FormAccount carries `hasPdfPassword` instead). */
  statementPdfPassword?: string;
}

/** Where a balance came from. A row with none was typed in, so it reads as Manual. */
export const BALANCE_SOURCES = ["Manual", "Statement"] as const;
export type BalanceSource = (typeof BALANCE_SOURCES)[number];

export interface BalanceSnapshot {
  id: string;
  accountId: string;
  date: string;
  balance: number;
  source?: BalanceSource;
}

export type RecurrenceCycle = "Monthly" | "Quarterly" | "Yearly";

// --- Cards ---

export type CardStatus = "Active" | "Inactive" | "Closed";

/**
 * Every colour a card, an account or a subscription can be given: one palette for all the
 * dashboards (Prathik, 2026-10-23). The text is the Sheets colour dropdowns' options, and each
 * name has its --card-<name>-from/-to/<name> tokens in globals.css. Ordered by hue, each with its
 * darker "dusk" twin after it, for the pickers; the neutrals last. Rose, Forest and Indigo are
 * kept from the earlier palette so saved rows stay valid.
 */
export const COLORS = [
  "Ruby", "Burgundy", "Coral", "Rose", "Pink", "Raspberry", "Magenta", "Plum", "Mulberry", "Orchid", "Violet", "Aubergine",
  "Indigo", "Sapphire", "Cobalt", "Azure", "Ocean", "Navy", "Sky", "Teal", "Spruce", "Jade", "Emerald", "Pine", "Forest",
  "Olive", "Moss", "Amber", "Bronze", "Honey", "Copper", "Rust", "Onyx", "Slate", "Mocha", "Graphite",
] as const;
export type Color = (typeof COLORS)[number];

/** Emerald is also the All Cards tile's colour, so a card or an account can't be given it; a subscription can. */
type NotEmerald = Exclude<Color, "Emerald">;
export const CARD_COLORS = COLORS.filter((c) => c !== "Emerald") as unknown as readonly [NotEmerald, ...NotEmerald[]];
export type CardColor = NotEmerald;

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

/** What a sync reads: card statements, or bank account statements. A row with none is a Cards sync (the tab had no kind before). */
export const SYNC_KINDS = ["Cards", "Accounts"] as const;
export type SyncKind = (typeof SYNC_KINDS)[number];

/** One bank statement email the account sync has looked at, so the next sync knows what to skip. */
export interface AccountStatementEmail {
  id: string;
  messageId: string;
  /** The email's date. Blank only when the email itself couldn't be read. */
  receivedDate?: string;
  subject?: string;
  accountId?: string;
  /** The first and last day the statement covers, once it has been read. */
  periodStart?: string;
  periodEnd?: string;
  result: StatementEmailResult;
  /** Why it failed, or anything else the import did. */
  details?: string;
  attempts: number;
  /** An ISO timestamp, like every *At field. */
  lastTriedAt: string;
}

/** Open: waiting for an answer. Accepted: the statement's balance was written. Kept: the recorded balance stays. Superseded: a corrected statement replaced the question. */
export const REVIEW_STATUSES = ["Open", "Accepted", "Kept", "Superseded"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** A balance a statement disagreed with, left as recorded until it's answered (lib/aggregate/statementBalances.ts). */
export interface BalanceReview {
  id: string;
  accountId: string;
  date: string;
  /** The balance this is about, as recorded. */
  snapshotId: string;
  recordedBalance: number;
  statementBalance: number;
  messageId: string;
  status: ReviewStatus;
  createdAt: string;
  resolvedAt?: string;
}

export const SYNC_TRIGGERS = ["Manual", "Scheduled"] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];

/** Skipped: another sync was already running, so this one did nothing. */
export const SYNC_RUN_STATUSES = ["Running", "Done", "Failed", "Skipped"] as const;
export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number];

/** One run of the Gmail sync: how it was started and what it did. */
export interface SyncRun {
  id: string;
  kind?: SyncKind;
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

/** The colours a subscription can be given, picked freely in Add and Edit: the whole palette. A row from before this column has none, and shows its category's colour. */
export const SUBSCRIPTION_COLORS = COLORS;
export type SubscriptionColor = Color;

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
/** A source's icon on the Income page (#185). Shown as each name's icon, never as text. */
export const INCOME_ICONS = ["Briefcase", "Trend", "Lock", "Pie", "Receipt", "Gift", "Home", "Coins"] as const;
export type IncomeIcon = (typeof INCOME_ICONS)[number];

export interface IncomeSource {
  id: string;
  name: string;
  alias: string;
  category: IncomeCategory;
  frequency: IncomeFrequency;
  expectedAmount: number;
  status: IncomeSourceStatus;
  // The rest were added on the end for the Income page (#185); rows from before have none of them.
  /** A day it's expected; the schedule counts from it both ways. A one-time source's only date. */
  scheduleDate?: string;
  color?: CardColor;
  icon?: IncomeIcon;
  /** The account it usually lands in. */
  accountId?: string;
  /** Text in a bank statement line that marks a deposit as this income (#187). */
  statementMatch?: string;
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
  /** Typed in the app, or read from a bank statement (#187): the same two as a balance's source. Rows from before #185 have none. */
  origin?: BalanceSource;
  /** The statement line it was read from, so a statement read twice adds nothing (#187). */
  statementRef?: string;
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
// Bank EMIs are monthly. Quarterly and yearly were dropped (2026-10-25)
// rather than given their own math, since no real loan uses them.
export type LoanPaymentFrequency = "Monthly";

export interface Loan {
  id: string;
  name: string;
  lenderName: string;
  category: LoanCategory;
  repaymentStructure: RepaymentStructure;
  principalAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
  paymentFrequency: LoanPaymentFrequency;
  /** Processing fee including GST, taken out of the disbursal. */
  processingFee: number;
  disbursementDate: string;
  accountId: string;
  status: LoanStatus;
  /** The first EMI's due date, from the sanction letter. Every later EMI falls on the same day of the month. */
  firstEmiDate: string;
  /** Stamp duty, taken out of the disbursal. */
  stampDuty: number;
  /** Interest from disbursement to the start of the EMI cycle ("pre-EMI" or "gap" interest), taken out of the disbursal. */
  preEmiInterest: number;
  // Added for the Loans page (docs/design/loans.md). All optional, so a row from before reads as the defaults.
  /** What a prepayment usually does on this loan, and each prepayment's default. A row without one reduces the tenure. */
  prepaymentEffect?: LoanPrepaymentEffect;
  /** The loan's colour. A row without one shows its category's (loanColor in lib/aggregate/loans.ts). */
  color?: CardColor;
  /** Where the EMI usually leaves: an account, or a card it's charged to. Never both. */
  emiPaidFromAccountId?: string;
  emiPaidFromCardId?: string;
  /** The bank's prepayment charge, as a percentage of the amount before GST (4 for HDFC's "4% + GST"). Blank is none. */
  prepaymentChargePercent?: number;
  // The bank's limits on part-payments. Warnings only, never blocks (system-design.md, Loan). Blank is no limit.
  /** At most this percentage of the outstanding principal at a time (25 for HDFC). */
  prepaymentMaxPercent?: number;
  /** How many part-payments a financial year (April to March). */
  prepaymentsPerYear?: number;
  /** How many part-payments over the loan's life. */
  prepaymentsInLoan?: number;
  /** How many EMIs must be paid before the first part-payment (1 for HDFC: "only after the first EMI"). */
  prepaymentAfterEmis?: number;
}

export const LOAN_PREPAYMENT_EFFECTS = ["Reduce-Tenure", "Reduce-Emi"] as const;
/** What a prepayment does to the rest of the schedule: the same EMI for fewer months, or a lower EMI to the same end. */
export type LoanPrepaymentEffect = (typeof LOAN_PREPAYMENT_EFFECTS)[number];
/** A prepayment's effect, which can also close the loan (foreclosure). */
export type PrepaymentEffect = LoanPrepaymentEffect | "Close";
export type PrepaymentSource = "Manual" | "Excess-Emi";

/**
 * Principal paid off beyond the EMIs (system-design.md, Loan, "Prepayments"). Saving one rebuilds the pending
 * installments after it; paid installments never change.
 */
export interface LoanPrepayment {
  id: string;
  loanId: string;
  date: string;
  /** The principal it pays off. */
  amount: number;
  /** The bank's charge with GST: a separate debit that doesn't reduce principal. */
  charge: number;
  effect: PrepaymentEffect;
  /** Manual, or Excess-Emi when it's the part of an EMI payment above the EMI. */
  source: PrepaymentSource;
  /** The installment it was paid with, for Excess-Emi: the rebuild starts after that installment. */
  installmentId?: string;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  /** The bank's own figures from its revised schedule. When set, the rebuild uses them instead of its own. */
  bankEmi?: number;
  bankInstallments?: number;
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

// --- Insurance ---

/**
 * What a policy insures, as the Policies tab's kind dropdown lists it. Accident is a personal
 * accident cover, such as the owner-driver cover that goes with a vehicle. The kind decides which
 * fields the forms ask for (a vehicle has an IDV and a no-claim step); the Sheet keeps one shape.
 */
export const POLICY_KINDS = ["Health", "Life", "Motor", "Home", "Accident"] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];

/** A cancelled policy is left out of every total and keeps its payments, as a cancelled subscription does. Lapsed is worked out from the dates, never stored. */
export const POLICY_STATUSES = ["Active", "Cancelled"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];
/** Nothing in the app writes Pending yet (a quote not yet paid); it stays so a row that has it still reads. */
export const POLICY_PAYMENT_STATUSES = ["Pending", "Paid"] as const;
export type PolicyPaymentStatus = (typeof POLICY_PAYMENT_STATUSES)[number];

/** The colours a policy can be given: the whole palette, as for a subscription. */
export const POLICY_COLORS = COLORS;
export type PolicyColor = Color;

/** A term can buy one to five years of cover (a single premium for several years is one payment). */
export const MAX_POLICY_YEARS = 5;
/** The no-claim bonus steps of a motor policy, in percent. The insurer's certificate is the truth; the app can't see claims. */
export const NCB_STEPS = [0, 20, 25, 35, 45, 50] as const;

export interface Policy {
  id: string;
  name: string;
  kind: PolicyKind;
  insurer: string;
  /** Kept whole in the private Sheet. A view must cut it to its last four characters before the page gets it: never hand a whole Policy to a client component. */
  policyNumber?: string;
  /** What it covers, as the page groups policies: "You", "Parents", "Car", "Bike", "Home". */
  covers: string;
  /** More about what it covers, such as a vehicle's model and the end of its registration. */
  coversDetail?: string;
  /** The sum insured, or the IDV for a vehicle: what the current term covers. */
  sumInsured: number;
  status: PolicyStatus;
  /** The day it was cancelled. Optional: a policy can be cancelled without a date. */
  endedOn?: string;
  color?: PolicyColor;
  /** Where it's usually paid from, at most one set. New payments start from it. */
  paidFromAccountId?: string;
  paidFromCardId?: string;
  /** The add-ons and extra covers, separated by commas. */
  addOns?: string;
  claimsPhone?: string;
  documentUrl?: string;
  /** Anything to look up when claiming: waiting periods, deductible, what it excludes. */
  notes?: string;
}

/** One term of a policy: the cover a premium bought and what it cost. Renewing records the next one. */
export interface PolicyPayment {
  id: string;
  policyId: string;
  /** The first day of the cover this premium bought. The last day is `years` later, less one day. */
  periodStart: string;
  /** How many years the premium buys. A single premium for three years is one payment with years 3. */
  years: number;
  /** What was paid, in all, with GST. */
  amount: number;
  /** Blank when the day isn't known: the term start stands in, and the page marks it assumed. */
  paidOn?: string;
  status: PolicyPaymentStatus;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  /** What this term covered (the IDV for a vehicle), when it differs from the policy's current one. */
  sumInsured?: number;
  /** A motor policy's no-claim bonus step on this term, in percent. */
  ncb?: number;
}

// --- Goals ---
// A goal is an earmark, not money: the money already sits in an account the app counts, so a goal never changes
// net worth. What's saved is derived from GoalContributions, never typed as a total (docs/design/goals.md).

/** The fixed category list. Each has a colour and an icon on the page, so there's no icon column. */
export const GOAL_CATEGORIES = ["Vehicle", "Home", "Appliance", "Gadget", "Travel", "Education", "Family", "Health", "Other"] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
/** Need: something breaks or a duty is missed without it. Want: everything else. It decides who gets money first. */
export const GOAL_NECESSITIES = ["Need", "Want"] as const;
export type GoalNecessity = (typeof GOAL_NECESSITIES)[number];
/** The time horizon, picked per goal (Prathik, 2026-10-29): Major is a long-term financial commitment, Minor a short-term thing. Not derived from the amount or the dates. */
export const GOAL_SCALES = ["Minor", "Major"] as const;
export type GoalScale = (typeof GOAL_SCALES)[number];
/** A Fixed date can't slip (a wedding, the old fridge is dead) and is served first; a Flexible one slides if money is short. */
export const GOAL_DATE_TYPES = ["Fixed", "Flexible"] as const;
export type GoalDateType = (typeof GOAL_DATE_TYPES)[number];
/** Funded, overdue, on track and behind are worked out, never stored (the FD `Matured` lesson). */
export const GOAL_STATUSES = ["Active", "Paused", "Done", "Dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
/** A Take-back releases money from a goal: when it's dropped, or the plan changes. */
export const GOAL_CONTRIBUTION_KINDS = ["Set-aside", "Take-back"] as const;
export type GoalContributionKind = (typeof GOAL_CONTRIBUTION_KINDS)[number];
export const GOAL_COLORS = COLORS;
export type GoalColor = Color;

export interface Goal {
  id: string;
  name: string;
  /** A top-level goal's id. A goal with a parent can't have children: one level only. */
  parentId?: string;
  category: GoalCategory;
  necessity: GoalNecessity;
  scale: GoalScale;
  /** This goal's own part. A leaf must be above 0; a parent's can be 0 (its sub-goals hold the rest). */
  amount: number;
  /** Blank is "someday". */
  targetDate?: string;
  /** A row without one reads as Flexible. */
  dateType?: GoalDateType;
  /** When saving began: the expected-pace line counts from it. */
  startDate: string;
  /** What you intend to put aside each month. */
  plannedMonthly?: number;
  status: GoalStatus;
  /** Set when Done: the day it was bought, what it cost, and where it was paid from (an account or a card, at most one). */
  doneOn?: string;
  actualCost?: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  /** A row without one shows its category's colour. */
  color?: GoalColor;
  link?: string;
  notes?: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  date: string;
  /** Above 0. */
  amount: number;
  kind: GoalContributionKind;
  /** Where the money actually sits, for the earmark check. */
  accountId?: string;
  note?: string;
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
/**
 * What kind of holding it is. The market (IND or US) already says where, so these don't repeat
 * it: an Indian equity is `Equity` on `IND`, a US stock `Equity` on `US`. RSU is a `source`, not
 * an asset type: vested NTAP and NTAP bought on the market are one holding.
 */
export const INVESTMENT_ASSET_TYPES = ["Equity", "ETF", "Mutual-Fund", "Debt-Fund", "Gold", "Other"] as const;
export type InvestmentAssetType = (typeof INVESTMENT_ASSET_TYPES)[number];

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
  assetType: InvestmentAssetType;
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
