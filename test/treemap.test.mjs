// A treemap is arithmetic whose failure mode is a tile with a negative width,
// which renders as nothing at all rather than as an error. These pin the
// properties that have to hold whatever the numbers are: the tiles fill the
// rectangle, none overlaps another, and area tracks value.
import { test } from "node:test";
import assert from "node:assert/strict";
import { treemap } from "../lib/treemap.ts";

const RECT = { x: 0, y: 0, w: 300, h: 200 };
const lay = (vals, rect = RECT) =>
  treemap(vals.map((v, i) => ({ id: i, v })), (x) => x.v, rect);

const area = (t) => t.w * t.h;
const overlap = (a, b) =>
  a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 &&
  a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

test("every tile has a positive size — nothing is laid out invisible", () => {
  for (const t of lay([50, 30, 12, 5, 2, 1])) {
    assert.ok(t.w > 0, `width ${t.w}`);
    assert.ok(t.h > 0, `height ${t.h}`);
  }
});

test("the tiles fill the rectangle and no more", () => {
  const tiles = lay([40, 25, 20, 10, 5]);
  const total = tiles.reduce((a, t) => a + area(t), 0);
  assert.ok(Math.abs(total - RECT.w * RECT.h) < 1, `covered ${total} of ${RECT.w * RECT.h}`);
  for (const t of tiles) {
    assert.ok(t.x >= -0.01 && t.y >= -0.01, "starts inside");
    assert.ok(t.x + t.w <= RECT.w + 0.01, "ends inside horizontally");
    assert.ok(t.y + t.h <= RECT.h + 0.01, "ends inside vertically");
  }
});

test("no two tiles overlap", () => {
  const tiles = lay([30, 22, 18, 12, 9, 5, 4]);
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      assert.ok(!overlap(tiles[i], tiles[j]), `tile ${i} overlaps ${j}`);
    }
  }
});

test("area is proportional to value", () => {
  const tiles = lay([60, 30, 10]);
  const total = RECT.w * RECT.h;
  // biggest first, and each roughly its share
  assert.ok(Math.abs(area(tiles[0]) / total - 0.6) < 0.01);
  assert.ok(Math.abs(area(tiles[1]) / total - 0.3) < 0.01);
  assert.ok(Math.abs(area(tiles[2]) / total - 0.1) < 0.01);
});

test("the biggest value gets the biggest tile, whatever order it arrives in", () => {
  const tiles = treemap(
    [{ n: "small", v: 3 }, { n: "big", v: 40 }, { n: "mid", v: 12 }],
    (x) => x.v,
    RECT,
  );
  assert.equal(tiles[0].item.n, "big");
  assert.ok(area(tiles[0]) > area(tiles[1]));
  assert.ok(area(tiles[1]) > area(tiles[2]));
});

test("one dominant value does not produce unreadable slivers", () => {
  // the case slice-and-dice gets wrong, and the reason this is squarified
  const tiles = lay([90, 4, 3, 2, 1]);
  for (const t of tiles) {
    const ratio = Math.max(t.w / t.h, t.h / t.w);
    assert.ok(ratio < 14, `aspect ratio ${ratio.toFixed(1)} — that is a sliver`);
  }
});

test("values of zero or less are dropped, not given empty tiles", () => {
  // a zero-area rectangle is something you can neither see nor tap, and
  // leaving it in makes every count downstream wrong
  assert.equal(lay([10, 0, 5, -2]).length, 2);
  assert.deepEqual(lay([0, 0]), []);
  assert.deepEqual(lay([]), []);
});

test("a rectangle with no room lays out nothing rather than negative tiles", () => {
  assert.deepEqual(lay([10, 5], { x: 0, y: 0, w: 0, h: 200 }), []);
  assert.deepEqual(lay([10, 5], { x: 0, y: 0, w: 300, h: -5 }), []);
});

test("the offset is respected, so a map can be placed anywhere", () => {
  const tiles = lay([10, 6, 4], { x: 20, y: 40, w: 100, h: 80 });
  for (const t of tiles) {
    assert.ok(t.x >= 19.99 && t.y >= 39.99);
    assert.ok(t.x + t.w <= 120.01 && t.y + t.h <= 120.01);
  }
});

test("a single item takes the whole rectangle", () => {
  const [only] = lay([7]);
  assert.equal(only.w, RECT.w);
  assert.equal(only.h, RECT.h);
});
