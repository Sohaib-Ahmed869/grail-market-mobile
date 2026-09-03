// Squarified treemap layout.
//
// The point of a treemap here is that it says two things at once: how big the
// move was (area) and which way it went (colour). A rail of equal cards can
// only say the second, and only in the order they happen to be listed.
//
// Squarified rather than the naive slice-and-dice, which produces long thin
// slivers as soon as one value dominates — and one value always dominates a
// list of price moves. Slivers are unreadable and untappable, and the whole
// value of the picture is that the big one looks big.
//
// Pure, because the arithmetic is fiddly and the failure mode is a tile with
// a negative width, which renders as nothing at all rather than as an error.

export type Tile<T> = { item: T; x: number; y: number; w: number; h: number };

type Rect = { x: number; y: number; w: number; h: number };

/** Worst aspect ratio in a row if `next` were added to it. Lower is better. */
function worst(row: number[], next: number | null, side: number, total: number): number {
  const vals = next == null ? row : [...row, next];
  if (!vals.length) return Infinity;
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0 || side <= 0) return Infinity;
  // Areas are scaled so the row's sum fills `side` times the row's depth.
  const scale = (side * side) / (sum * sum);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  return Math.max(max * scale * total, total / (min * scale));
}

/**
 * Lay `items` out in `rect`, area proportional to `value`.
 *
 * Items with a value of zero or less are dropped rather than given a
 * zero-size tile: a rectangle with no area is a thing you cannot see or tap,
 * and leaving it in the list makes every count downstream wrong.
 */
export function treemap<T>(
  items: T[],
  value: (item: T) => number,
  rect: Rect,
): Tile<T>[] {
  const live = items
    .map((item) => ({ item, v: Math.max(0, value(item)) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);

  if (!live.length || rect.w <= 0 || rect.h <= 0) return [];

  const total = live.reduce((a, b) => a + b.v, 0);
  // Normalise into pixel area so the row arithmetic is in one unit.
  const area = rect.w * rect.h;
  const scaled = live.map((x) => ({ ...x, a: (x.v / total) * area }));

  const out: Tile<T>[] = [];
  let free: Rect = { ...rect };
  let row: typeof scaled = [];

  const rowSum = () => row.reduce((a, b) => a + b.a, 0);

  const flushRow = () => {
    if (!row.length) return;
    const side = Math.min(free.w, free.h);
    const depth = rowSum() / side;
    let along = 0;
    for (const cell of row) {
      const len = cell.a / depth;
      out.push(
        free.w >= free.h
          // Free space is wider than tall: the row is a column on its left.
          ? { item: cell.item, x: free.x, y: free.y + along, w: depth, h: len }
          : { item: cell.item, x: free.x + along, y: free.y, w: len, h: depth },
      );
      along += len;
    }
    free = free.w >= free.h
      ? { x: free.x + depth, y: free.y, w: free.w - depth, h: free.h }
      : { x: free.x, y: free.y + depth, w: free.w, h: free.h - depth };
    row = [];
  };

  for (const cell of scaled) {
    const side = Math.min(free.w, free.h);
    const areas = row.map((r) => r.a);
    // Keep adding to this row while it makes the shapes squarer; the moment
    // it makes them worse, close the row and start another.
    if (row.length && worst(areas, cell.a, side, rowSum() + cell.a) > worst(areas, null, side, rowSum())) {
      flushRow();
    }
    row.push(cell);
  }
  flushRow();

  return out;
}
