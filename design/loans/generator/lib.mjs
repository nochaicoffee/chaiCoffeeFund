// Sample data, money math, formatting and the shell for the Loans canvas.
// Every loan, amount and date here is made up. "Today" is Oct 25, 2026.
// The shapes are the app's own (src/lib/sheets/types.ts: Loan, LoanInstallment); the schedule is a port of
// lib/schedule/generateInstallments.ts and the sums are what lib/aggregate/loans.ts holds, written here only so
// every figure on a board agrees with every other.

export const TODAY = "2026-10-25";

// ---------- Dates ----------
export function addMonthsUTC(iso, months) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const monthKey = (iso) => iso.slice(0, 7);
export function monthsFrom(startKey, n) {
  const out = [];
  let d = `${startKey}-01`;
  for (let i = 0; i < n; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); }
  return out;
}
export const YEAR = monthsFrom("2026-01", 12);
export const NOW_KEY = monthKey(TODAY);
export const dayOfYear = (iso) => daysBetween("2026-01-01", iso);

// ---------- Formatting ----------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dt = (iso) => new Date(`${iso}T00:00:00Z`);
export const inr = (n) => `${n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const inrL = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")}L` : Math.abs(n) >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : inr(n));
export const inrS = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : Math.abs(n) >= 1000 ? `₹${Math.round(n / 1000)}k` : inr(n));
export const fmt = (iso) => `${MON[dt(iso).getUTCMonth()]} ${dt(iso).getUTCDate()}`;
export const fmtY = (iso) => `${fmt(iso)}, ${dt(iso).getUTCFullYear()}`;
export const fmtDow = (iso) => `${DOW[dt(iso).getUTCDay()]}, ${fmt(iso)}`;
export const dow = (iso) => DOW[dt(iso).getUTCDay()];
export const monName = (key) => MON[Number(key.slice(5, 7)) - 1];
export const monFull = (key) => MONTH[Number(key.slice(5, 7)) - 1];
export const monYear = (key) => `${monName(key)} ${key.slice(0, 4)}`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const inDays = (iso) => { const n = daysBetween(TODAY, iso); return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : `${-n} days ago`; };


// ---------- Sample data (made up) ----------
/** The accounts and cards EMIs are paid from (a subset of the Accounts and Cards pages' samples). */
export const ACCOUNTS = {
  hdfc: { name: "HDFC Salary", initial: "H", color: "sapphire" },
  icici: { name: "ICICI Invest", initial: "I", color: "violet" },
  regalia: { name: "HDFC Regalia (card)", initial: "R", color: "ruby" },
};
/**
 * Loan: name, lenderName, category (Personal | Auto | Home | Other), principalAmount, annualInterestRate, tenureMonths,
 * processingFee, disbursementDate, accountId, status. `color`, `icon` and `paidFrom` (the account or card the EMI usually
 * leaves) are proposed new columns, like Subscriptions' colour and charged-to. Only Standard-Emi exists (ADR 0004).
 */
export const LOANS = [
  { id: "home", name: "Home loan", lenderName: "SBI", category: "Home", principalAmount: 2800000, annualInterestRate: 8.7, tenureMonths: 240, processingFee: 14000, stampDuty: 3500, disbursementDate: "2023-06-02", firstEmiDate: "2023-07-12", accountId: "hdfc", paidFrom: "hdfc", status: "Active", prepaymentEffect: "Reduce-Tenure", prepayCharge: null, limits: null, color: "sapphire", icon: "home", late: (n) => n % 13 === 0, lateDays: 3, charge: 400 },
  { id: "car", name: "Car loan", lenderName: "ICICI Bank", category: "Auto", principalAmount: 700000, annualInterestRate: 9.2, tenureMonths: 60, processingFee: 7000, stampDuty: 500, disbursementDate: "2024-03-01", firstEmiDate: "2024-04-05", accountId: "hdfc", paidFrom: "hdfc", status: "Active", prepaymentEffect: "Reduce-Tenure", prepayCharge: { pct: 3, gst: 18, tiers: [] }, limits: null, color: "copper", icon: "car", late: (n) => n % 9 === 0, lateDays: 2, charge: 250 },
  { id: "pers", name: "Personal loan", lenderName: "HDFC Bank", category: "Personal", principalAmount: 300000, annualInterestRate: 11.5, tenureMonths: 36, processingFee: 4500, stampDuty: 400, disbursementDate: "2025-02-24", firstEmiDate: "2025-03-28", accountId: "hdfc", paidFrom: "regalia", status: "Active", prepaymentEffect: "Reduce-Emi", prepayCharge: { pct: 4, gst: 18, tiers: [[24, 3], [36, 2]] }, limits: { maxPct: 25, perFy: 1, perLife: 2 }, color: "violet", icon: "user", late: (n) => n === 7, lateDays: 4, charge: 300 },
  { id: "lap", name: "Laptop loan", lenderName: "Axis Bank", category: "Other", principalAmount: 120000, annualInterestRate: 13, tenureMonths: 12, processingFee: 1200, stampDuty: 0, disbursementDate: "2025-04-10", firstEmiDate: "2025-05-15", accountId: "icici", paidFrom: "icici", status: "Closed", prepaymentEffect: "Reduce-Tenure", prepayCharge: null, limits: null, color: "teal", icon: "laptop", late: () => false, lateDays: 0, charge: 0 },
];
/** Pre-EMI interest: the odd days from disbursement to the start of the EMI cycle, actual/365 (the bank quotes it; the sample works it out). */
for (const l of LOANS) { const cycle = addMonthsUTC(l.firstEmiDate, -1); l.preEmiInterest = Math.max(0, Math.round((l.principalAmount * l.annualInterestRate / 100 * daysBetween(l.disbursementDate, cycle)) / 365)); }
/** What actually reached the account: the principal less the processing fee, stamp duty and pre-EMI interest (lib/aggregate/loans.ts netDisbursedAmount). The EMI stays on the full principal. */
export const netDisbursed = (l) => l.principalAmount - l.processingFee - l.stampDuty - l.preEmiInterest;
export const loan = (id) => LOANS.find((l) => l.id === id);
export const ACTIVE = LOANS.filter((l) => l.status === "Active");
export const SALARY = 138500; // Income's sample salary, used only for "share of salary" (a proposed figure)

// ---------- The schedule: a port of lib/schedule/generateInstallments.ts (true reducing-balance EMI, ADR 0004) ----------
const round2 = (v) => Math.round(v * 100) / 100;
export const emiOf = (principal, annualRate, n) => { const r = annualRate / 12 / 100; return round2(r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1)); };
function generate(l) {
  const r = l.annualInterestRate / 12 / 100, n = l.tenureMonths, emi = emiOf(l.principalAmount, l.annualInterestRate, n);
  const out = [];
  let open = l.principalAmount;
  for (let k = 1; k <= n; k++) {
    const due = addMonthsUTC(l.firstEmiDate, k - 1), interestDue = Math.round(open * r), last = k === n;
    const principalDue = last ? round2(open) : round2(emi - interestDue);
    out.push({ loanId: l.id, installmentNumber: k, dueDate: due, openingBalance: round2(open), principalDue, interestDue, totalDue: round2(principalDue + interestDue), status: "Pending" });
    open = round2(open - principalDue);
  }
  return out;
}
export const generateSchedule = generate;
/** LoanInstallment rows. Everything due on or before today is Paid; a few were paid late (with an overdue charge). */
export const INST = LOANS.flatMap((l) => generate(l).map((i) => {
  if (i.dueDate > TODAY) return { ...i, paidFrom: l.paidFrom };
  const late = l.late(i.installmentNumber), paidDate = late ? addDays(i.dueDate, l.lateDays) : i.dueDate, overdueCharge = late ? l.charge : 0;
  return { ...i, status: "Paid", paidDate, overdueCharge, amountPaid: round2(i.totalDue + overdueCharge), paidFrom: l.paidFrom };
}));
export const instOf = (id) => INST.filter((i) => i.loanId === id);

// ---------- Money math (what lib/aggregate/loans.ts holds or will hold) ----------
const sum = (xs) => xs.reduce((t, x) => t + x, 0);
export function summarise(l) {
  const ins = instOf(l.id), paid = ins.filter((i) => i.status === "Paid"), pend = ins.filter((i) => i.status === "Pending");
  const outstanding = round2(sum(pend.map((i) => i.principalDue)));
  return {
    loan: l, ins, paidN: paid.length, n: ins.length, emi: ins[0].totalDue, outstanding,
    principalRepaid: round2(l.principalAmount - outstanding),
    repaidPct: (l.principalAmount - outstanding) / l.principalAmount,
    interestPaid: round2(sum(paid.map((i) => i.interestDue))), interestLeft: round2(sum(pend.map((i) => i.interestDue))),
    interestTotal: round2(sum(ins.map((i) => i.interestDue))), totalPaid: round2(sum(paid.map((i) => i.amountPaid))),
    lateN: paid.filter((i) => i.paidDate > i.dueDate).length, lateCharges: sum(paid.map((i) => i.overdueCharge ?? 0)),
    next: pend[0] ?? null, end: ins.at(-1).dueDate, left: pend.length,
  };
}
export const SUM = LOANS.map(summarise);
export const sum_ = (id) => SUM.find((s) => s.loan.id === id);
export const AS = SUM.filter((s) => s.loan.status === "Active");
export const OWE = sum(AS.map((s) => s.outstanding));
export const BORROWED = sum(AS.map((s) => s.loan.principalAmount));
export const REPAID = BORROWED - OWE;
export const REPAID_PCT = REPAID / BORROWED;
export const EMI_TOTAL = sum(AS.map((s) => s.emi));
export const INTEREST_LEFT = sum(AS.map((s) => s.interestLeft));
export const INTEREST_PAID = sum(AS.map((s) => s.interestPaid));
export const INTEREST_ALL = sum(AS.map((s) => s.interestTotal));
export const PRE_EMI = sum(AS.map((s) => s.loan.preEmiInterest));
/** Charges: processing fee and stamp duty (prepayment charges join them once there are prepayments). Pre-EMI interest counts with interest. */
export const CHARGES = sum(AS.map((s) => s.loan.processingFee + s.loan.stampDuty));
export const FEES = CHARGES;
export const DEBT_FREE = AS.map((s) => s.end).sort().at(-1);
export const NEXT_DUE = AS.map((s) => s.next).filter(Boolean).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
export const NEXT_LOAN = loan(NEXT_DUE.loanId);
export const UPCOMING = AS.flatMap((s) => s.ins.filter((i) => i.status === "Pending").slice(0, 2)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
export const DUE_SOON = INST.filter((i) => i.status === "Pending" && daysBetween(TODAY, i.dueDate) <= 7 && loan(i.loanId).status === "Active");
export const LATE_N = sum(AS.map((s) => s.lateN));
export const PAID_N = sum(AS.map((s) => s.paidN));
export const SALARY_SHARE = EMI_TOTAL / SALARY;
/** Whole months from today to a date (a month counts once its day has been reached). */
export const monthsTo = (iso) => { let m = 0; while (addMonthsUTC(TODAY, m + 1) <= iso) m++; return m; };
/** Years, months and days from today to a date. */
export const untilYmd = (iso) => { const m = monthsTo(iso); return { y: Math.floor(m / 12), m: m % 12, d: daysBetween(addMonthsUTC(TODAY, m), iso) }; };
export const yearsMonths = (m) => ({ y: Math.floor(m / 12), m: m % 12 });
export const ymTxt = (m) => { const { y, m: mo } = yearsMonths(m); return [y ? plural(y, "year") : "", mo ? plural(mo, "month") : ""].filter(Boolean).join(" ") || "this month"; };
/** Outstanding principal of a loan at the end of a month (0 before it was taken). */
export function balanceAt(l, ym, cutoff = `${ym}-31`) {
  if (ym < monthKey(l.disbursementDate)) return 0;
  const paidOff = sum(instOf(l.id).filter((i) => i.dueDate <= cutoff).map((i) => i.principalDue));
  return Math.max(0, round2(l.principalAmount - paidOff));
}
/** What leaves in a month across loans (by due date), per loan. */
export const emiIn = (ym, l) => round2(sum(instOf(l.id).filter((i) => monthKey(i.dueDate) === ym).map((i) => i.totalDue)));
export const emiMonth = (ym, loans = LOANS) => round2(sum(loans.map((l) => emiIn(ym, l))));
export const lastEmiOf = (l) => instOf(l.id).at(-1);

// ---------- Icons ----------
const ic = (d, s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  overview: (s) => ic('<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>', s ?? 17),
  accounts: (s) => ic('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M3 10l9-6 9 6"></path><path d="M9 21v-6"></path><path d="M15 21v-6"></path>', s ?? 17),
  cards: (s) => ic('<rect x="2" y="6" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>', s ?? 17),
  subs: (s) => ic('<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>', s ?? 17),
  income: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 17),
  loans: (s) => ic('<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>', s ?? 17),
  fixed: (s) => ic('<rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>', s ?? 17),
  invest: (s) => ic('<line x1="4" y1="20" x2="4" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="20" y1="20" x2="20" y2="14"></line>', s ?? 17),
  x: (s) => ic('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s ?? 14, 2.2),
  plus: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', s ?? 14, 2.5),
  refresh: (s) => ic('<path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline>', s ?? 15),
  chev: (s) => ic('<polyline points="6 9 12 15 18 9"></polyline>', s ?? 12, 2.5),
  chevR: (s) => ic('<polyline points="9 6 15 12 9 18"></polyline>', s ?? 12, 2.5),
  chevL: (s) => ic('<polyline points="15 6 9 12 15 18"></polyline>', s ?? 12, 2.5),
  arrowR: (s) => ic('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline>', s ?? 13, 2.5),
  check: (s) => ic('<polyline points="20 6 9 17 4 12"></polyline>', s ?? 12, 3),
  up: (s) => ic('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>', s ?? 11, 2.6),
  down: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>', s ?? 11, 2.6),
  search: (s) => ic('<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', s ?? 13, 2.2),
  cal: (s) => ic('<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', s ?? 14),
  info: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>', s ?? 12, 2.2),
  alert: (s) => ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>', s ?? 14, 2.2),
  clock: (s) => ic('<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>', s ?? 12, 2.2),
  menu: (s) => ic('<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>', s ?? 20),
  more: (s) => ic('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>', s ?? 16, 2.6),
  link: (s) => ic('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"></path><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"></path>', s ?? 13),
  lock: (s) => ic('<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>', s ?? 12),
  pencil: (s) => ic('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>', s ?? 13, 2.2),
  briefcase: (s) => ic('<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="3" y1="13" x2="21" y2="13"></line>', s ?? 14),
  trend: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 14),
  sprout: (s) => ic('<path d="M12 21v-8"></path><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z"></path><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5Z"></path>', s ?? 14),
  pie: (s) => ic('<path d="M21 12A9 9 0 1 1 12 3v9Z"></path><path d="M15 3.5A9 9 0 0 1 20.5 9H15Z"></path>', s ?? 14),
  receipt: (s) => ic('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="12" x2="15" y2="12"></line>', s ?? 14),
};

// Icons for the loans
I.home = (s) => ic('<path d="M3 11 12 4l9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path>', s ?? 14);
I.car = (s) => ic('<path d="M5 16V11l2-5h10l2 5v5"></path><path d="M3 16h18v3H3z"></path><circle cx="7.5" cy="16" r="0.6"></circle><circle cx="16.5" cy="16" r="0.6"></circle>', s ?? 14);
I.user = (s) => ic('<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"></path>', s ?? 14);
I.laptop = (s) => ic('<rect x="4" y="5" width="16" height="11" rx="1.5"></rect><path d="M2 20h20"></path>', s ?? 14);
I.flag = (s) => ic('<path d="M5 21V4"></path><path d="M5 4h12l-2 4 2 4H5"></path>', s ?? 12);
I.hourglass = (s) => ic('<path d="M6 3h12"></path><path d="M6 21h12"></path><path d="M7 3c0 5 5 6 5 9s-5 4-5 9"></path><path d="M17 3c0 5-5 6-5 9s5 4 5 9"></path>', s ?? 14);
export const loanIcon = (l, size = 14) => I[l.icon](size);

// ---------- Small parts ----------
export const grad = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
/** A mark's fill (bars, ribbons): the colour, a touch lighter on top. */
export const fill = (s, a = 180) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${typeof s === "string" ? s : s.color}) 80%,white),var(--card-${typeof s === "string" ? s : s.color}))`;
export const col = (s) => `var(--card-${typeof s === "string" ? s : s.color})`;
/** A loan's tile: its icon on its card gradient. */
export const mono = (l, size = 32) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad(l.color)};${l.status === "Closed" ? "filter:grayscale(.85);opacity:.6" : ""}">${loanIcon(l, Math.round(size * 0.5))}</span>`;
export const allMono = (size = 32) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad("emerald", 150)}">${I.loans(Math.round(size * 0.5))}</span>`;
export const via = (id) => { const a = ACCOUNTS[id]; return `<span class="via"><span class="minibank" style="background:${grad(a.color)}">${a.initial}</span>${a.name}</span>`; };
export const sampleTag = (extra = "") => `<span class="sample">Sample data, made up${extra}</span>`;
export const derivedTag = (t = "Worked out") => `<span class="pill pill-derived">${I.link(10)} ${t}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "fixed", "invest"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "loans" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function header({ eyebrow = "Loans · Today", title = "Good afternoon, Prathik", lede, actions, back }) {
  return `<header class="pg-head"><div class="pg-text"><div class="eyebrow">${back ? `<span style="display:inline-flex;align-items:center;gap:6px">${I.chevL(11)}${eyebrow}</span>` : eyebrow}</div><h1>${title}</h1>${lede ? `<div class="lede">${lede}</div>` : ""}</div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const btn = (label, { kind = "ghost", icon = "", cls = "", style = "" } = {}) => `<span class="btn btn-${kind} ${cls}"${style ? ` style="${style}"` : ""}>${icon}${label}</span>`;
export const iconBtn = (icon, label, cls = "") => `<span class="btn btn-icon ${cls}" aria-label="${label}">${icon}</span>`;
export function select({ value, options = [], open = false, kind = "pill", icon = "", align = "", width = "" }) {
  const opts = options.map((o) => (o === "-" ? `<div class="lb-divider"></div>` : o.group ? `<div class="lb-group">${o.group}</div>` : `<div class="opt" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span>${o.meta ? `<span class="opt-meta">${o.meta}</span>` : ""}<span class="opt-check">${I.check(12)}</span></div>`)).join("");
  return `<details class="sel sel--${kind}"${open ? " open" : ""}${width ? ` style="width:${width}"` : ""}><summary class="sel-trigger">${icon ? `<span class="sel-icon">${icon}</span>` : ""}<span class="sel-value">${value}</span><span class="sel-chev">${I.chev()}</span></summary><div class="pop${align ? ` ${align}` : ""}"><div class="lb">${opts}</div></div></details>`;
}
export function seg(items, { cls = "" } = {}) {
  return `<span class="seg ${cls}">${items.map((it) => `<span class="seg-i${it.on ? " on" : ""}">${it.label}${it.count != null ? `<em>${it.count}</em>` : ""}</span>`).join("")}</span>`;
}
export const greetingActions = () => `${btn("Add loan", { icon: I.plus() })}${btn("Mark EMI paid", { kind: "primary", icon: I.check(14) })}`;

// ---------- A prepayment, worked out (lib/schedule rebuild, with the proposed interest rule; every figure is an estimate) ----------
/** The bank's prepayment charge rate (with GST) for a loan after n EMIs, as a percent of the amount. */
export function chargeRate(l, paidN) {
  if (!l.prepayCharge) return 0;
  const { pct, gst, tiers } = l.prepayCharge;
  const base = tiers.reduce((p, [after, t]) => (paidN >= after ? t : p), pct);
  return base * (1 + gst / 100);
}
/** Warnings for a prepayment against the loan's own limits (warnings, not blocks). */
export function limitChecks(l, s, amount) {
  if (!l.limits) return [];
  const cap = (s.outstanding * l.limits.maxPct) / 100;
  return [
    { ok: s.paidN >= 1, text: "After the first EMI" },
    { ok: amount <= cap, text: `At most ${l.limits.maxPct}% of the outstanding principal`, detail: `${inr(cap)} here${amount > cap ? `, this is ${inr(amount)}` : ""}` },
    { ok: true, text: `Once a financial year (0 so far this year)` },
    { ok: true, text: `Twice in the loan's life (0 so far)` },
  ];
}
/**
 * Prepay `amount` today. Paid EMIs never change; the pending ones are rebuilt from the balance less the amount.
 * Reduce-Tenure keeps the EMI and ends sooner. Reduce-Emi keeps the number of EMIs and lowers the EMI. Close pays the whole outstanding principal.
 * Proposed interest rule: the next EMI's interest is a normal month on the new balance plus actual/365 interest on the prepaid amount for the days since the last EMI.
 */
export function prepay(l, amount, effect, date = TODAY) {
  const s = sum_(l.id), r = l.annualInterestRate / 12 / 100, pend = s.ins.filter((i) => i.status === "Pending");
  const lastDue = s.ins.filter((i) => i.status === "Paid").at(-1).dueDate, days = daysBetween(lastDue, date);
  const amt = effect === "Close" ? s.outstanding : Math.min(amount, s.outstanding);
  const dayInterest = Math.round((amt * l.annualInterestRate / 100 * days) / 365);
  const charge = round2((amt * chargeRate(l, s.paidN)) / 100);
  if (effect === "Close") return { amount: amt, charge, effect, days, dayInterest, emi: 0, rows: [], months: 0, interest: 0, interestSaved: s.interestLeft - dayInterest, end: date, payoff: round2(amt + dayInterest), series: [s.outstanding, 0], s };
  const bal0 = round2(s.outstanding - amt);
  const emi = effect === "Reduce-Emi" ? emiOf(bal0 + dayInterest / (1 + r), l.annualInterestRate, pend.length) : s.emi;
  const rows = []; let bal = bal0, k = 0;
  while (bal > 0.5 && k < 600) {
    const first = k === 0, interest = Math.round(bal * r) + (first ? dayInterest : 0);
    const last = effect === "Reduce-Emi" ? k === pend.length - 1 : emi - interest >= bal;
    const principal = last ? round2(bal) : round2(emi - interest);
    rows.push({ n: s.paidN + 1 + k, due: addMonthsUTC(l.firstEmiDate, s.paidN + k), principal, interest, total: round2(principal + interest), open: round2(bal) });
    bal = round2(bal - principal); k++;
  }
  const interest = sum(rows.map((x) => x.interest));
  return { amount: amt, charge, effect, days, dayInterest, emi, rows, months: rows.length, interest, interestSaved: s.interestLeft - interest, end: rows.at(-1).due, series: [s.outstanding, bal0, ...rows.map((x) => round2(x.open - x.principal))], s };
}
