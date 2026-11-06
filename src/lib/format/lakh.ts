import { formatInr } from "./money";

/** ₹10.76L with two decimals, as the design sets the big figures: lakhs from a lakh, crores from a crore, plain rupees below. */
export function lakhParts(value: number): { amount: string; unit: string } {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return { amount: `${sign}${(abs / 1e7).toFixed(2)}`, unit: "Cr" };
  if (abs >= 1e5) return { amount: `${sign}${(abs / 1e5).toFixed(2)}`, unit: "L" };
  return { amount: formatInr(value).replace("₹", ""), unit: "" };
}
export function formatLakh(value: number): string {
  const { amount, unit } = lakhParts(value);
  return `₹${amount}${unit}`;
}
