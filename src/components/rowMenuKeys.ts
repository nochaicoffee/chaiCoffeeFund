/**
 * Where a row menu's focus goes for a key, over `count` items with focus on `at` (-1 when it isn't
 * on an item): ArrowDown and ArrowUp step and wrap round, Home and End jump. Null for any other key.
 */
export function nextMenuIndex(key: string, at: number, count: number): number | null {
  if (count <= 0) return null;
  const wrap = (i: number) => (i + count) % count;
  if (key === "ArrowDown") return wrap(at + 1);
  if (key === "ArrowUp") return wrap(at - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
