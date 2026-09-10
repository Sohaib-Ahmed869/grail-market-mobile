import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { Bone } from "./Skeleton";
import { CardArt } from "./CardArt";
import { type Series } from "./TrendCompare";
import { TerminalChart, type Bar } from "./TerminalChart";
import { cardCandles, type Candle } from "../lib/cards";
import { type Pulse } from "../lib/cardmarket";
import { gameTheme } from "../lib/games";
import { convert, money, useFx } from "../lib/fx";
import { colors, radius, shadow, space, type } from "../theme";

const WINDOWS = [
  { days: 7, label: "1W" },
  { days: 30, label: "1M" },
  { days: 60, label: "2M" },
];

/** What is moving, as one chart.
 *
 *  Every mover on the same axes, the way an exchange draws a watchlist —
 *  one line in front with its number, the rest behind it in grey, and a tap
 *  on any line or any name brings that card forward. The page underneath
 *  the chart re-points at whichever card is in front, so the price and the
 *  change are always for the line you are looking at.
 *
 *  The lines are the store's own DAILY CLOSES, aligned by date. The pulse
 *  also carries a seven-point spark per card, and drawing those side by side
 *  was the previous chart's mistake: the sparks are not the same days for
 *  every card and not evenly spaced in time, so two cards that looked to be
 *  moving together were not. Here every x is one calendar day for every
 *  line, a card's line starts on the day its history starts, and a day the
 *  store did not re-read carries the last close — a price nobody has
 *  re-checked is still the price. The sparks are kept only as a fallback
 *  for the day the store has no daily history for any of them, and the
 *  chart says so when it is drawing them.
 */
export function MarketMovers({ pulse }: { pulse: Pulse[] }) {
  const router = useRouter();
  const fx = useFx();
  const movers = pulse.slice(0, 8);
  const ids = movers.map((p) => p.cardId).filter((x): x is string => Boolean(x));

  // One daily read per card, once. The window is cut from these on the
  // phone, so switching 1W to 1M costs nothing and refetches nothing.
  const [closes, setCloses] = useState<Record<string, Candle[]> | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!ids.length) { setCloses({}); return; }
    Promise.all(ids.map((id) => cardCandles(id, "D").then((r) => [id, r.candles] as const)))
      .then((rows) => { if (alive) setCloses(Object.fromEntries(rows)); });
    return () => { alive = false; };
  }, [ids.join("|")]);

  const [days, setDays] = useState(30);
  const [picked, setPicked] = useState<string | null>(null);

  const built = useMemo(() => {
    if (!closes) return null;
    // The window is "up to this long", not "this long". The store began
    // keeping daily closes on a day, and a 1M axis drawn from three weeks
    // before that is half a chart of nothing — which reads as a bug, not as
    // honesty. The axis starts at the first close any mover has.
    const earliest = Object.values(closes).flat().map((b) => b.day).sort()[0];
    const full = lastDays(days);
    const trimmed = earliest ? full.filter((d) => d >= earliest) : full;
    const axis = trimmed.length > 1 ? trimmed : full;
    let fromStore = 0;
    const series: Series[] = movers.map((p) => {
      const id = p.cardId ?? p.label;
      const bars = p.cardId ? closes[p.cardId] ?? [] : [];
      const byDay = new Map(bars.map((b) => [b.day, b.close]));
      let last: number | null = null;
      const points = axis.map((day) => {
        const v = byDay.get(day);
        if (v != null) last = v;
        return last;
      });
      if (points.filter((v) => v != null).length > 1) fromStore++;
      return { id, label: p.label, points };
    });
    if (fromStore > 0) return { series, axis, fallback: false };
    // Nothing day-aligned yet. The feed's sparks, and a line saying so.
    return {
      series: movers.map((p) => ({ id: p.cardId ?? p.label, label: p.label, points: p.spark })),
      axis, fallback: true,
    };
  }, [closes, movers, days]);

  const change = (sr: Series | undefined) => {
    const v = (sr?.points ?? []).filter((x): x is number => x != null && x > 0);
    return v.length > 1 ? ((v[v.length - 1]! - v[0]!) / v[0]!) * 100 : null;
  };

  const drawable = built?.series.filter((sr) => sr.points.filter((v) => v != null).length > 1) ?? [];
  const selectedId = picked && drawable.some((sr) => sr.id === picked)
    ? picked
    : drawable[0]?.id ?? movers[0]?.cardId ?? movers[0]?.label ?? null;
  const lead = movers.find((p) => (p.cardId ?? p.label) === selectedId) ?? movers[0] ?? null;

  // The front card as bars. One reading a day is what the store holds, so a
  // day opens at the previous day's close and closes at its own; the wick
  // is real only where the server aggregated more than one reading. A day
  // the store did not re-read repeats the last close as a flat bar, which
  // is the truth about that day.
  const bars = useMemo<Bar[]>(() => {
    if (!built || built.fallback || !closes) return [];
    const raw = lead?.cardId ? closes[lead.cardId] ?? [] : [];
    const byDay = new Map(raw.map((b) => [b.day, b]));
    const out: Bar[] = [];
    let prev: number | null = null;
    for (const day of built.axis) {
      const b = byDay.get(day);
      const close: number | null = b?.close ?? prev;
      if (close == null) continue;
      const measured = Boolean(b && b.readings > 1);
      const open = prev ?? (measured ? b!.open : close);
      const high = measured ? Math.max(b!.high, open, close) : Math.max(open, close);
      const low = measured ? Math.min(b!.low, open, close) : Math.min(open, close);
      out.push({ day, open, high, low, close, measured });
      prev = close;
    }
    return out;
  }, [built, closes, lead]);


  const leadPct = change(built?.series.find((sr) => sr.id === selectedId));
  const leadUp = (leadPct ?? 0) >= 0;

  if (!built || !lead) {
    return (
      <View style={s.panel}>
        <Bone h={20} w="50%" />
        <Bone h={176} r={12} style={{ marginTop: space.md }} />
        <Bone h={34} style={{ marginTop: space.md }} />
      </View>
    );
  }

  return (
    <View style={s.panel}>
      {/* ---- the card in front ------------------------------------------ */}
      <Pressable
        onPress={() =>
          lead.cardId
            ? router.push(`/card/${lead.cardId}` as any)
            : router.push({ pathname: "/market", params: { q: lead.label } })
        }
        style={({ pressed }) => [s.head, pressed && { opacity: 0.7 }]}
      >
        <View style={s.headArt}><CardArt uri={lead.imageUrl} iconSize={14} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="h3" numberOfLines={1}>{lead.label}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
            {[lead.setName, money(lead.price, { fx, from: "USD" })].filter(Boolean).join(" · ")}
          </Txt>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Txt style={[s.pct, { color: leadPct == null ? colors.inkFaint : leadUp ? colors.up : colors.down }]}>
            {leadPct == null ? "—" : `${leadUp ? "+" : "−"}${Math.abs(leadPct).toFixed(1)}%`}
          </Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ fontSize: 11 }}>
            {built.fallback ? "last readings" : WINDOWS.find((w) => w.days === days)?.label}
          </Txt>
        </View>
        <Feather name="chevron-right" size={16} color={colors.inkFaint} />
      </Pressable>

      {/* ---- everyone, one axis ----------------------------------------- */}
      {built.fallback || bars.length === 0 ? (
        <Txt variant="bodySmall" color={colors.inkFaint}>
          No day-by-day history in the store for this card yet.
        </Txt>
      ) : (
        <TerminalChart
          bars={bars}
          format={(n) => money(n, { fx, from: "USD" })}
        />
      )}
      {built.fallback ? null : (
        <View style={s.windows}>
          {WINDOWS.map((w) => (
            <Pressable
              key={w.days}
              onPress={() => setDays(w.days)}
              style={[s.window, w.days === days && s.windowOn]}
            >
              <Txt variant="label" color={w.days === days ? colors.onPrimary : colors.inkMuted}>{w.label}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      {/* ---- the names, as the switch ----------------------------------- */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.picks}
        style={s.picksScroll}>
        {movers.map((p) => {
          const id = p.cardId ?? p.label;
          const on = id === selectedId;
          const pct = change(built.series.find((sr) => sr.id === id));
          const th = gameTheme(p.game);
          return (
            <Pressable
              key={id}
              onPress={() => setPicked(id)}
              style={[s.pick, on ? s.pickOn : { backgroundColor: th.wash }]}
            >
              {/* A dot in the game's colour: the row is eight names from five
                  catalogues, and which game a card belongs to is the fastest
                  thing to read and the hardest to guess from a name. */}
              <View style={[s.dot, { backgroundColor: on ? th.wash : th.tint }]} />
              <Txt variant="label" color={on ? colors.onPrimary : th.tint} numberOfLines={1} style={{ maxWidth: 120 }}>
                {p.label}
              </Txt>
              <Txt variant="label" style={[s.pickPct, {
                color: pct == null ? (on ? colors.onDarkMuted : colors.inkFaint)
                  : on ? (pct >= 0 ? "#8FE0B8" : "#F5B0A6")
                  : pct >= 0 ? colors.up : colors.down,
              }]}>
                {pct == null ? "—" : `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The last N calendar days as ISO dates, oldest first, ending today (UTC,
 *  which is the day the store stamps its closes with). */
function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - i));
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

const shortDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
};

const s = StyleSheet.create({
  panel: {
    marginHorizontal: space.xl, padding: space.lg, gap: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headArt: { width: 34, height: 47, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  pct: { ...type.h2, fontVariant: ["tabular-nums"] },
  windows: { flexDirection: "row", gap: 4, alignSelf: "flex-start", padding: 3, borderRadius: radius.sm, backgroundColor: colors.field },
  window: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.sm - 3 },
  windowOn: { backgroundColor: colors.ink },
  picksScroll: { marginHorizontal: -space.lg },
  picks: { gap: 6, paddingHorizontal: space.lg },
  pick: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: colors.field,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pickOn: { backgroundColor: colors.ink },
  pickPct: { fontVariant: ["tabular-nums"], fontSize: 12 },
});
