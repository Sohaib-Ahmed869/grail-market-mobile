import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { conversionNote, money, useFx, type Fx } from "../lib/fx";
import { colors, radius, space } from "../theme";

// Two answers to two different questions, side by side.
//
// The screen used to print one number — ours if we had one, the median ask
// otherwise — and the person reading it could not tell which they were
// looking at or why. Those are not interchangeable figures:
//
//   what it is worth    what comparable copies have actually CHANGED HANDS
//                       for, or our estimate when nothing has. This is the
//                       number to price a sale against.
//   what it is listed   the middle of what sellers are ASKING today. Asks are
//   at                  survivorship-biased upward — a copy priced at market
//                       sells and leaves, one priced above it stays and
//                       accumulates — so this reads high, often by a lot.
//
// Showing both, labelled, and letting the seller choose is the honest shape.
// Hiding one and quietly picking for them is how "your card is worth A$24,184"
// turns out to mean "somebody has been failing to sell one at that for ten
// months".
//
// Every claim on this card carries its sources: how many listings, how many
// of them matched, how long the dearest have sat unsold, and what rate the
// conversion used. Nothing here should require the reader to trust us.

export type OurPrice = {
  price: number;
  basis?: string | null;
  method?: string | null;
  explain?: string | null;
  confidence?: string | null;
  sampleSize?: number | null;
  low?: number | null;
  high?: number | null;
} | null;

export type AskSide = {
  median: number;
  low?: number | null;
  high?: number | null;
  count?: number | null;
  /** how many came back before we filtered to this exact card and grade */
  total?: number | null;
  staleCeilingDays?: number | null;
  cappedByStale?: boolean | null;
} | null;

export type PriceSide = "ours" | "asks";

/** What copies of this exact card and grade actually changed hands for.
 *
 *  The strongest evidence there is, and the only one of the three that is a
 *  fact rather than an inference. Where it exists it leads. */
export type SoldSide = {
  /** the figure to lead with — our weighted read of the sales */
  price: number;
  count?: number | null;
  median?: number | null;
  low?: number | null;
  high?: number | null;
  asOf?: string | null;
  method?: string | null;
  /** when a copy at THIS grade last changed hands. A price with no date is a
   *  number; a price with a date is evidence. */
  lastSaleDate?: string | null;
} | null;

/** Which printing this is, and what the others go for.
 *
 *  Holofoil and Reverse Holofoil are separate markets — on one Charizard they
 *  are three times apart — so naming the printing is part of naming the card. */
export type PrintingsInfo = {
  primary: string | null;
  available: string[];
  byPrinting: Record<string, { marketPrice: number | null; lowPrice: number | null }>;
} | null;

/** How often a copy trades at all. */
export type Velocity = {
  dailyAverage?: number | null;
  weeklyAverage?: number | null;
  monthlyTotal?: number | null;
} | null;

const when = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  const on = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  // Both the date and the distance from today. "12 Jun" alone makes the reader
  // do the arithmetic, and the arithmetic is the part that matters.
  return days <= 0 ? `today (${on})`
    : days === 1 ? `yesterday (${on})`
    : days < 60 ? `${days} days ago (${on})`
    : `${Math.round(days / 30)} months ago (${on})`;
};

const months = (days: number) =>
  days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`;

/** Plain words for how a figure was reached. `method` is written for us; this
 *  is written for the person holding the card. */
function whyOurs(p: NonNullable<OurPrice>, sold?: SoldSide): string {
  const n = sold?.count ?? p.sampleSize ?? 0;
  if (p.basis === "observed" || sold) {
    return n > 0
      ? `Built from ${n} completed sale${n === 1 ? "" : "s"} of this exact card and grade, ` +
        `weighted towards the recent ones with outliers dropped.`
      : "Built from completed sales of this exact card and grade.";
  }
  return (
    `No completed sale is on record for this card at this grade, so this is ` +
    `estimated from ${n > 0 ? `${n} live ` : ""}asking prices — discounted, because ` +
    `cards sell for less than they are listed at.`
  );
}

export function PriceChoice({
  sold, ours, asks, currency = "USD", picked, onPick,
}: {
  sold?: SoldSide;
  ours: OurPrice;
  asks: AskSide;
  currency?: string;
  picked: PriceSide;
  onPick: (side: PriceSide) => void;
}) {
  const fx = useFx();
  if (!sold && !ours && !asks) return null;

  // The sales are EVIDENCE FOR our valuation, not a rival to it. Giving them
  // their own card made the screen offer a choice between our number and the
  // number ours is computed from, which is not a choice anybody has. They now
  // sit inside "What it's worth" as the working behind it.
  const both = Boolean(ours && asks);

  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      <Txt variant="overline" color={colors.inkFaint}>
        {both ? "Where this number comes from" : "What this card is worth"}
      </Txt>

      {ours && (
        <Side
          key="ours"
          title="What it's worth"
          sub="Our valuation"
          amount={ours.price}
          currency={currency}
          fx={fx}
          selected={picked === "ours"}
          selectable={both}
          onPress={() => onPick("ours")}
          why={whyOurs(ours, sold)}
          facts={[
            // The sales ARE the working. Shown here rather than on a card of
            // their own, because "what it sold for" is not an alternative to
            // "what it's worth" — it is the reason for it.
            sold?.median != null
              ? ["Sales middle", money(sold.median, { fx, from: currency })]
              : null,
            sold?.count != null
              ? ["Sales counted", String(sold.count)]
              : ours.sampleSize != null
                ? ["Sales counted", String(ours.sampleSize)]
                : null,
            (sold?.low ?? ours.low) != null && (sold?.high ?? ours.high) != null
              ? [
                  "Range",
                  `${money(sold?.low ?? ours.low, { fx, from: currency })} – ${money(sold?.high ?? ours.high, { fx, from: currency })}`,
                ]
              : null,
            sold?.lastSaleDate && when(sold.lastSaleDate)
              ? ["Last sold", when(sold.lastSaleDate)!]
              : null,
            ours.confidence ? ["Confidence", String(ours.confidence)] : null,
          ]}
          warn={
            sold?.lastSaleDate &&
            Date.now() - new Date(sold.lastSaleDate).getTime() > 180 * 86400000
              ? "Nothing at this grade has sold in over six months, so this is a stale reading of a thin market."
              : null
          }
        />
      )}

      {asks && (
        <Side
          key="asks"
          // When the figure has been pulled down to the cheapest long-unsold
          // ask, it is NOT the median any more and calling it one is a lie
          // with a number on it: the screen read "Median ask A$24,184" above
          // three listings of 24,184 / 32,245 / 41,646, whose median is
          // 32,245. Name the thing it actually is.
          title={asks.cappedByStale ? "What people are asking" : "What people are asking"}
          sub={
            asks.cappedByStale
              ? "Capped to the cheapest ask nobody has taken"
              : "Middle of live listings elsewhere"
          }
          amount={asks.median}
          currency={currency}
          fx={fx}
          selected={picked === "asks"}
          selectable={both}
          onPress={() => onPick("asks")}
          why={
            asks.cappedByStale
              ? `Not the middle of the asks — the cheapest one that has sat unsold, ` +
                `which is the tightest ceiling the live market can give us. Nobody ` +
                `has paid this; somebody has failed to get it.`
              : `The middle of what sellers want today — not what anyone has paid. ` +
                `Asks run high, because the copies priced at market sell and leave.`
          }
          facts={[
            asks.count != null
              ? [
                  "From",
                  asks.total != null && asks.total > asks.count
                    ? `${asks.count} of ${asks.total} listings`
                    : `${asks.count} listing${asks.count === 1 ? "" : "s"}`,
                ]
              : null,
            asks.low != null && asks.high != null
              ? ["Lowest / highest", `${money(asks.low, { fx, from: currency })} – ${money(asks.high, { fx, from: currency })}`]
              : null,
          ]}
          warn={
            // Name the listing this is actually about. The old copy said "the
            // DEAREST asks have sat unsold", while the listing it had capped
            // to was the CHEAPEST one on the page.
            asks.cappedByStale && asks.staleCeilingDays != null
              ? `This is the cheapest ask still standing after ${months(asks.staleCeilingDays)} ` +
                `unsold, so it is a ceiling on the market rather than a reading of it.`
              : null
          }
        />
      )}

      {both && (
        <Txt variant="bodySmall" color={colors.inkFaint}>
          Pick the one you want to price against. It is what the sell flow will
          start from — you can still change the number there.
        </Txt>
      )}
    </View>
  );
}

function Side({
  title, sub, amount, currency, fx, selected, selectable, onPress, why, facts, warn,
}: {
  title: string;
  sub: string;
  amount: number;
  currency: string;
  fx: Fx | null;
  selected: boolean;
  selectable: boolean;
  onPress: () => void;
  why: string;
  facts: (readonly [string, string] | null)[];
  warn?: string | null;
}) {
  const note = conversionNote(amount, fx, currency);
  return (
    <Pressable
      onPress={selectable ? onPress : undefined}
      disabled={!selectable}
      accessibilityRole={selectable ? "radio" : undefined}
      accessibilityState={{ selected }}
      style={[st.card, selectable && selected && st.cardOn]}
    >
      <View style={st.head}>
        {selectable && (
          <View style={[st.radio, selected && st.radioOn]}>
            {selected && <View style={st.dot} />}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>{sub}</Txt>
        </View>
      </View>

      <Txt variant="price" style={{ marginTop: space.xs }}>
        {money(amount, { fx, from: currency })}
      </Txt>
      {/* The rate and the date, so the figure above can be checked rather
          than believed. */}
      {note && <Txt variant="bodySmall" color={colors.inkFaint}>{note}</Txt>}

      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        {why}
      </Txt>

      {facts.filter(Boolean).length > 0 && (
        <View style={st.facts}>
          {facts.filter(Boolean).map((f) => (
            <View key={f![0]} style={st.fact}>
              <Txt variant="overline" color={colors.inkFaint}>{f![0]}</Txt>
              <Txt variant="bodySmall">{f![1]}</Txt>
            </View>
          ))}
        </View>
      )}

      {warn && (
        <View style={st.warn}>
          <Icon name="notify" size={13} color={colors.inkMuted} />
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>{warn}</Txt>
        </View>
      )}
    </Pressable>
  );
}

/** Which printing this card is, and how often one trades.
 *
 *  Two facts that change how every figure above should be read, and neither
 *  was on the screen. The printing because holo and reverse holo are different
 *  markets; the velocity because a median over sales that stopped a year ago
 *  is a historical note, not a price. */
export function PrintingAndLiquidity({
  printings, velocity, currency = "USD",
}: {
  printings: PrintingsInfo;
  velocity: Velocity;
  currency?: string;
}) {
  const fx = useFx();
  if (!printings && !velocity) return null;

  const others = printings
    ? printings.available.filter((x) => x !== printings.primary)
    : [];
  const monthly = velocity?.monthlyTotal ?? null;

  return (
    <View style={st.strip}>
      {printings?.primary && (
        <View style={{ gap: 2 }}>
          <Txt variant="overline" color={colors.inkFaint}>Printing</Txt>
          <Txt variant="body" style={{ fontWeight: "600" }}>{printings.primary}</Txt>
          {/* What the OTHER printings go for, because the commonest way to be
              wrong about this card is to be holding a different one. */}
          {others.map((o) => {
            const m = printings.byPrinting[o]?.marketPrice;
            return (
              <Txt key={o} variant="bodySmall" color={colors.inkFaint}>
                {o}: {m != null ? money(m, { fx, from: currency }) : "no price"}
              </Txt>
            );
          })}
        </View>
      )}

      {monthly != null && (
        <View style={{ gap: 2 }}>
          <Txt variant="overline" color={colors.inkFaint}>How often it trades</Txt>
          <Txt variant="body" style={{ fontWeight: "600" }}>
            {monthly === 0
              ? "Not this month"
              : `${monthly === 1 ? "1 sale" : `${monthly} sales`} a month`}
          </Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {monthly === 0
              ? "A price on a card nobody is buying is a guess with a decimal point."
              : "More trades means a firmer price."}
          </Txt>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  strip: {
    flexDirection: "row", flexWrap: "wrap", gap: space.xxl,
    marginTop: space.md, padding: space.lg,
    backgroundColor: colors.surfaceSunk, borderRadius: radius.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
  },
  cardOn: { borderWidth: 2, borderColor: colors.ink },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.outline,
    alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink },
  facts: {
    flexDirection: "row", flexWrap: "wrap", gap: space.lg,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  fact: { gap: 1 },
  warn: {
    flexDirection: "row", gap: space.sm, alignItems: "flex-start",
    marginTop: space.md, padding: space.sm,
    backgroundColor: colors.surfaceSunk, borderRadius: radius.sm,
  },
});
