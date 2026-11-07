// Made-up figures for the mockups (not Prathik's real numbers). They follow src/app/page.tsx: net worth, its seven parts,
// eight tiles, a bank-balance trend and the attention list.
export const inr = (n) => (n < 0 ? "−" : "") + "₹" + Math.abs(n).toLocaleString("en-IN");
export const lakh = (n) => "₹" + (n / 100000).toFixed(1) + " L";

export const parts = [
  { key: "bank", label: "Bank", value: 842100 },
  { key: "inv", label: "Investments", value: 3120450 },
  { key: "fd", label: "Fixed deposits", value: 1450000 },
  { key: "epf", label: "EPF", value: 986300 },
  { key: "lent", label: "Lent out", value: 120000 },
  { key: "cards", label: "Cards", value: -48720 },
  { key: "loans", label: "Loans", value: -241820 },
];
export const netWorth = parts.reduce((s, p) => s + p.value, 0); // 62,28,310

export const tiles = [
  { key: "cards", label: "Cards outstanding", value: 48720, neg: true, art: "card" },
  { key: "loans", label: "Loans outstanding", value: 241820, neg: true, art: "house" },
  { key: "subs", label: "Subscriptions / month", value: 4860, art: "loop" },
  { key: "inv", label: "Investments (cost basis)", value: 2640000, art: "rocket" },
  { key: "fd", label: "Fixed deposits (est.)", value: 1450000, art: "safe" },
  { key: "epf", label: "EPF (passbook)", value: 986300, art: "sprout" },
  { key: "lent", label: "Lent out (owed to you)", value: 120000, art: "bag" },
  { key: "obl", label: "Monthly obligations", value: 38450, neg: true, art: "calendar" },
];

export const trend = [
  ["Dec", 5.2], ["Jan", 5.9], ["Feb", 5.5], ["Mar", 6.4], ["Apr", 6.8], ["May", 6.1],
  ["Jun", 7.0], ["Jul", 7.4], ["Aug", 7.9], ["Sep", 7.6], ["Oct", 8.1], ["Nov", 8.4],
];

export const attention = [
  { label: "HDFC Regalia statement due", detail: "₹48,720 — next statement ~12 Nov", kind: "card" },
  { label: "Car loan installment #21", detail: "₹18,450 due 7 Dec", kind: "house" },
  { label: "NetApp salary not received", detail: "₹1,92,000 — expected 1 Nov", kind: "coins" },
  { label: "SBI deposit has matured", detail: "₹3,00,000 — not closed yet", kind: "safe" },
  { label: "Hotel Sonali loan", detail: "₹40,000 out 90 days, nothing back", kind: "bag" },
];

export const SECTIONS = ["Overview", "Accounts", "Cards", "Subscriptions", "Income", "Loans", "Lent out", "Insurance", "Fixed Income", "Investments", "Goals"];

export const greeting = {
  eyebrow: "Overview · Fri 7 Nov",
  title: "Good afternoon, Prathik",
  // Bold figures; the real page points each one (hover card), kept as bold here.
  sentence: [
    "You're worth ", ["₹62.3 L", "nw"], " today, with ", ["₹38,450", "obl"], " going out this month and ", ["5 things", "att"], " needing a look.",
  ],
};
