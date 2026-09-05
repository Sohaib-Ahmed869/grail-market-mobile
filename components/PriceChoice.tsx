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

export type PriceSide = "sold" | "ours" | "asks";

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
} | null;

const months = (days: number) =>
  days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`;

/** Plain words for how a figure was reached. `method` is written for us; this
 *  is written for the person holding the card. */
function whyOurs(p: NonNullable<OurPrice>): string {
  if (p.basis === "observed") {
    const n = p.sampleSize ?? 0;
    return n > 0
      ? `What ${n} copy${n === 1 ? "" : "s"} of this exact card and grade actually sold for.`
      : "Completed sales of this exact card and grade.";
  }
  const n = p.sampleSize ?? 0;
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

  const both = [sold, ours, asks].filter(Boolean).length > 1;

  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      <Txt variant="overline" color={colors.inkFaint}>
        {both ? "Where this number comes from" : "What this card is worth"}
      </Txt>

      {/* Sales first, always. It is the only one of the three that is a fact
          rather than an inference, and burying it under an estimate is how a
          screen with nine recorded sales on it said "no sale on record". */}
      {sold && (
        <Side
          key="sold"
          title="What it sold for"
          sub={
            sold.count
              ? `${sold.count} completed sale${sold.count === 1 ? "" : "s"} at this grade`
              : "Completed sales at this grade"
          }
          amount={sold.price}
          currency={currency}
          fx={fx}
          selected={picked === "sold"}
          selectable={both}
          onPress={() => onPick("sold")}
          why="What copies of this exact card and grade actually changed hands for. The strongest evidence we have."
          facts={[
            sold.median != null ? ["Median", money(sold.median, { fx, from: currency })] : null,
            sold.low != null && sold.high != null
              ? ["Range", `${money(sold.low, { fx, from: currency })} – ${money(sold.high, { fx, from: currency })}`]
              : null,
            sold.asOf
              ? ["Updated", new Date(sold.asOf).toLocaleDateString("en-AU", { day: "numeric", month: "short" })]
              : null,
          ]}
        />
      )}

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
          why={whyOurs(ours)}
          facts={[
            ours.confidence ? ["Confidence", String(ours.confidence)] : null,
            ours.sampleSize != null ? ["Sales counted", String(ours.sampleSize)] : null,
            ours.low != null && ours.high != null
              ? ["Range", `${money(ours.low, { fx, from: currency })} – ${money(ours.high, { fx, from: currency })}`]
              : null,
          ]}
        />
      )}

      {asks && (
        <Side
          key="asks"
          title="What people are asking"
          sub="Live listings elsewhere"
          amount={asks.median}
          currency={currency}
          fx={fx}
          selected={picked === "asks"}
          selectable={both}
          onPress={() => onPick("asks")}
          why={
            `The middle of what sellers want today — not what anyone has paid. ` +
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
            asks.cappedByStale && asks.staleCeilingDays != null
              ? `The dearest of these has sat unsold for ${months(asks.staleCeilingDays)}, ` +
                `so it is treated as a ceiling rather than a price.`
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

const st = StyleSheet.create({
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
