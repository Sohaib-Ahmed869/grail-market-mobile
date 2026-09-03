import { get } from "./api";

export type Point = { day: string; price: number; sampleSize?: number | null };

export type Movement = {
  first: number; last: number; change: number; changePct: number;
  low: number; high: number; days: number;
} | null;

export type History = {
  points: Point[]; movement: Movement;
  from: string; to: string; observed: number;
} | null;

/** One card at one grade. Null when we have no series yet, which is most
 *  cards — the store has only been keeping history since the day it started,
 *  and a chart drawn from nothing would be a lie with axes. */
export async function cardHistory(k: {
  catalogId: string; grader: string; grade: string | number;
  qualifier?: string | null; labelVariant?: string | null; days?: number;
}): Promise<History> {
  const p = new URLSearchParams({
    catalogId: k.catalogId, grader: k.grader, grade: String(k.grade),
  });
  if (k.qualifier) p.set("qualifier", k.qualifier);
  if (k.labelVariant) p.set("labelVariant", k.labelVariant);
  if (k.days) p.set("days", String(k.days));
  try {
    const r = await get<any>(`/history/card?${p}`);
    return r?.points?.length ? r : null;
  } catch { return null; }
}

export async function marketIndex(days = 90): Promise<{
  points: Point[]; basket: number; from: string; to: string;
} | null> {
  try {
    const r = await get<any>(`/history/index?days=${days}`);
    return r?.points?.length ? r : null;
  } catch { return null; }
}

export async function collectionHistory(days = 90): Promise<{
  points: Point[]; movement: Movement; from: string; to: string;
  priced: number; total: number;
} | null> {
  try {
    const r = await get<any>(`/history/collection?days=${days}`);
    return r?.points?.length ? r : null;
  } catch { return null; }
}
