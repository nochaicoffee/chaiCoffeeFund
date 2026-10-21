/** The Payment trend's hover card: how wide it is, and where it goes. */
export const CARD_WIDTH = 248;

/**
 * Where a month's hover card goes, from its bar's left edge and width: beside the bar on
 * whichever side it fits (centred over it on a phone), and never past the chart's edges.
 */
export function cardLeft(x: number, barWidth: number, width: number, phone: boolean): number {
  let left = phone ? x + barWidth / 2 - CARD_WIDTH / 2 : x + barWidth + 8;
  if (!phone && left + CARD_WIDTH > width) left = x - 8 - CARD_WIDTH;
  return Math.min(Math.max(0, left), Math.max(0, width - CARD_WIDTH));
}

/** Narrower than this, a chart draws its phone layout. */
export const PHONE = 640;

/** The day after an ISO date. */
export function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** The days Day by day draws: a column a week from the Monday `start`, Monday at the top, from `first` to `last`. */
export interface DayGridShape {
  start: string;
  first: string;
  last: string;
  weeks: number;
}

const clampDay = (date: string, grid: DayGridShape) => (date < grid.first ? grid.first : date > grid.last ? grid.last : date);

/**
 * The day under a point, from its offset from the cells' top-left corner and the step
 * from one cell to the next (a cell and its gap), for dragging a range (5C). A point
 * in a gap belongs to the day before it, and one outside the grid to the nearest day drawn.
 */
export function dayAtPoint(x: number, y: number, step: number, grid: DayGridShape): string {
  const week = Math.min(Math.max(Math.floor(x / step), 0), grid.weeks - 1);
  const weekday = Math.min(Math.max(Math.floor(y / step), 0), 6);
  return clampDay(addDays(grid.start, week * 7 + weekday), grid);
}

const ARROWS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

/** Where an arrow key goes from a day: up and down a day, left and right a week, as the grid is drawn, never past the days drawn. Null for any other key. */
export function stepDay(date: string, key: string, grid: DayGridShape): string | null {
  const by = ARROWS[key];
  return by ? clampDay(addDays(date, by), grid) : null;
}

/**
 * Where a month's card goes (5B): beside the month's weeks, so the days it lights stay
 * in sight. To their right when it fits, else to their left, and never past the edges.
 */
export function besideLeft(x: number, width: number, cardWidth: number, boxWidth: number, gap = 12): number {
  let left = x + width + gap;
  if (left + cardWidth > boxWidth) left = x - gap - cardWidth;
  return Math.min(Math.max(0, left), Math.max(0, boxWidth - cardWidth));
}
