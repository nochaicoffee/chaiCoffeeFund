import { formatPercent } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { digitColumns } from "./digitColumns";

const FORMATS = { inr: formatInr, percent: (fraction: number) => formatPercent(fraction) } as const;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A number that rolls to a new value digit by digit, like a meter (#117), as
 * the details card's numbers do when another card is selected or a bill is
 * paid. Each digit is a column of 0–9 that slides to its value, the rightmost
 * first. Columns are keyed by their place from the right, so React keeps each
 * one from render to render and CSS slides it from its old digit; no state, so
 * it works from the server too. The first render is the number as it is, and
 * for reduced motion the digits change at once. Screen readers, and copying,
 * get the number as text.
 */
export function RollingNumber({ value, format }: { value: number; format: keyof typeof FORMATS }) {
  const text = FORMATS[format](value);
  return (
    <>
      <span className="sr-only">{text}</span>
      {/* Unselectable, so copying the number gives the text above rather than every column's ten digits. */}
      <span aria-hidden="true" className="select-none">
        {digitColumns(text).map((column) =>
          column.digit === null ? (
            <span key={column.place}>{column.char}</span>
          ) : (
            // One line tall and clipped to it; the invisible 0 gives the column its width and baseline.
            <span key={column.place} className="relative inline-block [clip-path:inset(0_-0.1em)]">
              <span className="invisible">0</span>
              <span
                className="absolute inset-x-0 top-0 flex flex-col items-center ease-out motion-safe:transition-transform motion-safe:duration-700"
                style={{ transform: `translateY(calc(${column.digit} * -1lh))`, transitionDelay: `${column.place * 40}ms` }}
              >
                {DIGITS.map((digit) => (
                  <span key={digit} className="h-[1lh]">
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
    </>
  );
}
