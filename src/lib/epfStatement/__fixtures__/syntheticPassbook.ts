import type { EpfShares } from "../parseEpfPassbookText";

/**
 * A made-up EPFO passbook, laid out the way the real ones read through pdf.js, with invented identifiers. Never a real
 * passbook: a real one carries the UAN and date of birth. The identifiers below are what the tests look for in the output
 * to prove none of them leaks.
 */
export const FAKE = {
  uan: "100000000001",
  dateOfBirth: "15-06-1990",
  memberName: "ASHA Q SAMPLE",
  memberId: "XXXXX00000000000042",
  memberIdLast4: "0042",
  establishmentId: "XXXXX0000042",
  establishment: "EXAMPLE SOFTWARE PRIVATE LIMITED",
} as const;

const GROUPS = new Intl.NumberFormat("en-IN");
/** 119356 → "1,19,356", as EPFO prints it. */
export const indian = (n: number): string => GROUPS.format(n);
const three = (s: EpfShares) => `${indian(s.employee)} ${indian(s.employer)} ${indian(s.pension)}`;
const ddmmyyyy = (iso: string, sep: string) => `${iso.slice(8, 10)}${sep}${iso.slice(5, 7)}${sep}${iso.slice(0, 4)}`;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface SyntheticCredit {
  /** "2025-03" */
  wageMonth: string;
  /** "2025-04-01" */
  date: string;
  employee: number;
  employer: number;
  pension?: number;
}

export interface SyntheticOptions {
  /** The year's first calendar year: 2025 for FY 2025-26. */
  startYear: number;
  opening: EpfShares;
  credits: SyntheticCredit[];
  interest: EpfShares;
  printedOn: string;
  /** Overrides, to make a file that doesn't add up or has something the parser must refuse. */
  closing?: EpfShares;
  printedTotal?: EpfShares;
  transferIns?: EpfShares;
  withdrawals?: EpfShares;
  /** Say "Cont. for Due-Month" like the older files do. */
  oldWording?: boolean;
  /** Replace this credit's line (by index) with a line the parser can't read. */
  garbleRow?: number;
}

const sumOf = (credits: SyntheticCredit[], s: keyof EpfShares): number => credits.reduce((t, c) => t + (c[s] ?? 0), 0);
const sharesOfCredits = (credits: SyntheticCredit[]): EpfShares => ({ employee: sumOf(credits, "employee"), employer: sumOf(credits, "employer"), pension: sumOf(credits, "pension") });

/** Each entry is one line of the page; pieces of a line are separated by two spaces, as separate text items would be. */
export function syntheticPassbookLines(o: SyntheticOptions): string[] {
  const total = sharesOfCredits(o.credits);
  const closing = o.closing ?? {
    employee: o.opening.employee + total.employee + o.interest.employee,
    employer: o.opening.employer + total.employer + o.interest.employer,
    pension: o.opening.pension + total.pension + o.interest.pension,
  };
  const zero = { employee: 0, employer: 0, pension: 0 };
  const rows = o.credits.map((c, i) => {
    if (o.garbleRow === i) return `${MONTH[Number(c.wageMonth.slice(5)) - 1]}-${c.wageMonth.slice(0, 4)}  ${ddmmyyyy(c.date, "-")}  CR  Cont. for the Due-Month  not a row`;
    const [y, m] = c.wageMonth.split("-");
    const credited = o.oldWording ? `${c.date.slice(5, 7)}${c.date.slice(0, 4)}` : `${c.date.slice(0, 4)}${c.date.slice(5, 7)}`;
    return `${MONTH[Number(m) - 1]}-${y}  ${ddmmyyyy(c.date, "-")}  CR  ${o.oldWording ? "Cont. for Due-Month" : "Cont. for the Due-Month"}  ${credited}  ${indian(c.employee * 8)}  0  ${indian(c.employee)}  ${indian(c.employer)}  ${indian(c.pension ?? 0)}`;
  });
  return [
    "lnL; iklcqd / Member Passbook",
    `LFkkiuk vkbZMh@uke  |  Establishment ID/Name  ${FAKE.establishmentId} / ${FAKE.establishment}`,
    `lnL; vkbZMh@uke  |  Member ID/Name  ${FAKE.memberId} / ${FAKE.memberName}`,
    `tUe frfFk  |  Date of Birth  ${FAKE.dateOfBirth}`,
    `;w , u  |  UAN  ${FAKE.uan}`,
    `bZih,Q iklcqd [ fo~kh; o"kZ - ${o.startYear}-${o.startYear + 1} ] / EPF Passbook [ Financial Year - ${o.startYear}-${o.startYear + 1} ]`,
    `fooj.k / Particulars  Employee Balance  Employer Balance  Pension Balance`,
    `OB Int. Updated upto 31/03/${o.startYear}  ${three(o.opening)}`,
    `V~kalD'ku / Transaction  osru / Wages  va'knku / Contribution  Wage Month  Date / Type  EPF  EPS  Employee  Employer  Pension`,
    ...rows,
    `Total Contributions for the year [ ${o.startYear} ]  ${three(o.printedTotal ?? total)}`,
    `Total Transfer-Ins/VDRs for the year [ ${o.startYear} ]  ${three(o.transferIns ?? zero)}`,
    `Total Withdrawals for the year [ ${o.startYear} ]  ${three(o.withdrawals ?? zero)}`,
    `Int. Updated upto 31/03/${o.startYear + 1}  ${three(o.interest)}`,
    `Closing Balance as on 31/03/${o.startYear + 1}  ${three(closing)}`,
    `----------------------fooj.k dh lekfIr/End Of Statement----------------------  eqfnzr/Printed On : ${ddmmyyyy(o.printedOn, "-")} 18:28:26`,
    `Disclaimer - Information shown above is based on available data on central server.`,
  ];
}

/** The page as one string, joined the way the app's PDF reader joins text items. */
export const syntheticPassbookText = (o: SyntheticOptions): string => syntheticPassbookLines(o).map((l) => l.split("  ").join(" ")).join(" ");

/**
 * A one-page PDF with these lines, written by hand (Helvetica, no fonts to embed), so a test can run the real PDF reader on
 * it without a binary fixture. Each piece of a line (split on two spaces) is its own text item, as in a real passbook.
 */
export function pdfOfLines(lines: string[]): Uint8Array {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const ops: string[] = ["BT", "/F1 8 Tf"];
  let y = 40 + lines.length * 14;
  for (const line of lines) {
    let x = 20;
    for (const piece of line.split("  ")) {
      ops.push(`1 0 0 1 ${x} ${y} Tm (${escape(piece)}) Tj`);
      x += 5 * piece.length + 14;
    }
    y -= 14;
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1400 ${60 + lines.length * 14}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o2) => `${String(o2).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

/** A passbook as a PDF. */
export const syntheticPassbookPdf = (o: SyntheticOptions): Uint8Array => pdfOfLines(syntheticPassbookLines(o));

/** A year like his FY 2025-26 (12 credits of one amount, interest credited), with an optional change. */
export function aTypicalYear(change: Partial<SyntheticOptions> = {}): SyntheticOptions {
  const months = [["2025-03", "2025-04-01"], ["2025-04", "2025-05-01"], ["2025-05", "2025-06-01"], ["2025-06", "2025-07-01"], ["2025-07", "2025-08-01"], ["2025-08", "2025-09-01"],
    ["2025-09", "2025-10-01"], ["2025-10", "2025-11-01"], ["2025-11", "2025-12-01"], ["2025-12", "2026-01-01"], ["2026-01", "2026-02-01"], ["2026-02", "2026-03-01"]];
  return {
    startYear: 2025,
    opening: { employee: 100000, employer: 100000, pension: 0 },
    credits: months.map(([wageMonth, date]) => ({ wageMonth, date, employee: 10000, employer: 10000 })),
    interest: { employee: 9000, employer: 9000, pension: 0 },
    printedOn: "2026-11-04",
    ...change,
  };
}
