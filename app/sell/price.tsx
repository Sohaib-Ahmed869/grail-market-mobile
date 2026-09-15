import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { SellSteps } from "../../components/SellSteps";
import { getDraft, patchDraft } from "../../lib/selldraft";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel } from "../../lib/grading";
import { colors, radius, space, type } from "../../theme";
import { aud } from "../../lib/fx";
import { listingGuidance, type ListingGuidance, type NoListingGuidance } from "../../lib/cardmarket";

const money = (n: number) => aud(n);

/** Step 3 — what to ask, and how a buyer gets it.
 *
 *  The three strategies come from the server's listing guidance, which is the
 *  client's rule on GM001-59: settled sales only, the three most recent, and
 *  only when they sit close together in time. This screen used to make its own
 *  range by multiplying whatever figure the scan picked by 0.92 and 1.08 — a
 *  range with no sales behind it, built as readily from an asking price as
 *  from a sale. When the sales cannot support a range, the screen now says so
 *  and shows the market figure as a reference, not three invented prices.
 *  "Name my own price" is always there — guidance is a suggestion, not a rule.
 *
 *  No escrow language anywhere. Delivery is pickup or post, and the panel says
 *  plainly that the money is settled between the two members, because that is
 *  the thing most likely to be misunderstood. */
export default function SellPrice() {
  const router = useRouter();
  const draft = getDraft();
  const market = draft?.marketValue ?? null;

  /** What the seller picked on the scan result, in their words. */
  const BASIS: Record<string, string> = {
    sold: "What it sold for — the middle of completed sales",
    ours: "What it's worth — our valuation",
    asks: "What people are asking — live listings",
  };
  const basis = draft?.marketBasis ? BASIS[draft.marketBasis] : null;

  /** Whole dollars above ten, cents below it.
   *
   *  Every strategy rounded to whole dollars, so a 94-cent card offered
   *  "quickly", "at market" and "hold out" — all of them A$1. Three choices
   *  that are one number is not a choice, and most of a set is under a dollar.
   *  The same rule the rest of the app formats money with. */
  const round = (n: number) => (Math.abs(n) < 10 ? Math.round(n * 100) / 100 : Math.round(n));

  // Guidance is keyed on the exact grader and grade, or on RAW for an
  // ungraded card — the route reads RAW as "ungraded sales only" and refuses a
  // missing grader, so slabs can never be averaged into a raw card's range.
  const graded = Boolean(draft?.catalogId && !draft?.isRaw && draft?.grader && draft?.grade);
  const askable = Boolean(draft?.catalogId && (draft?.isRaw || graded));
  const [guide, setGuide] = useState<ListingGuidance | null | undefined>(askable ? undefined : null);
  const [why, setWhy] = useState<NoListingGuidance | null>(null);
  useEffect(() => {
    if (!askable) return;
    let alive = true;
    const key = graded ? { grader: draft!.grader!, grade: draft!.grade! } : { grader: "RAW", grade: "" };
    listingGuidance({ cardId: draft!.catalogId!, ...key }).then((r) => {
      if (!alive) return;
      setGuide(r.guidance);
      setWhy(r.guidance ? null : r.why);
    });
    return () => { alive = false; };
  }, [askable, graded, draft?.catalogId, draft?.grader, draft?.grade]);

  const options = useMemo(() => {
    if (!guide) return [];
    return [
      { id: "quick", name: "Sell it quickly", blurb: "Under recent sales. Usually gone inside a week.", price: round(guide.quick) },
      { id: "market", name: "At market", blurb: `The average of the last ${guide.sampleSize} settled sales${guide.excluded ? `, leaving out ${guide.excluded} far from the rest` : ""}.`, price: round(guide.market) },
      { id: "patient", name: "Hold out", blurb: "Above recent sales. Expect offers, not instant sales.", price: round(guide.patient) },
    ];
  }, [guide]);

  const [strategy, setStrategy] = useState("own");
  const [own, setOwn] = useState(market ? String(round(market)) : "");
  // Once the range arrives, start on "At market" — unless the seller has
  // already chosen something, which the answer must not undo.
  const touched = useRef(false);
  useEffect(() => {
    if (guide && !touched.current) {
      setStrategy("market");
      setOwn(String(round(guide.market)));
    }
  }, [guide]);
  const pick = (id: string) => { touched.current = true; setStrategy(id); };
  const [delivery, setDelivery] = useState<string[]>(["pickup"]);
  const [suburb, setSuburb] = useState(draft?.suburb ?? "");

  const chosen = options.find((o) => o.id === strategy);
  const price = strategy === "own" ? Number(own.replace(/[^\d.]/g, "")) : chosen?.price ?? 0;
  const ready = price > 0 && delivery.length > 0;

  const toggle = (d: string) =>
    setDelivery((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const next = () => {
    patchDraft({ price, strategy, delivery, suburb: suburb.trim() || null });
    router.push("/sell/preview");
  };

  return (
    <Screen back footer={<Button label="Next · Preview" onPress={next} disabled={!ready} />}>
      <SellSteps step={3} />
      <View style={s.listingStrip}>
        <GraderBadge grader={draft?.isRaw ? "RAW" : draft?.grader} grade={draft?.grade} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>{draft?.cardName ?? "This card"}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
            {[draft?.setName,
              draft?.grader ? gradeLabel(draft.grader, draft.grade) : gradeLabel("RAW", draft?.grade),
            ].filter(Boolean).join(" · ")}
          </Txt>
        </View>
      </View>
      <Txt variant="display" style={{ marginTop: space.lg }}>Price It</Txt>

      {guide ? (
        <View style={s.market}>
          <Txt variant="overline" color={colors.inkFaint}>
            Recent settled sales · {draft?.grader} {draft?.grade}
          </Txt>
          <Txt variant="price" style={{ marginTop: 2 }}>{money(guide.market)}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
            Average of {guide.sampleSize} sales · last sold {when(guide.lastSaleAt)} · {guide.confidence} confidence
          </Txt>
        </View>
      ) : guide === undefined ? (
        <View style={s.market}>
          <Txt variant="overline" color={colors.inkFaint}>Checking recent sales…</Txt>
        </View>
      ) : market ? (
        <View style={s.market}>
          <Txt variant="overline" color={colors.inkFaint}>
            {basis ? "You picked" : "Market value"}
            {draft?.grader ? ` · ${draft.grader} ${draft.grade ?? ""}` : " · ungraded"}
          </Txt>
          <Txt variant="price" style={{ marginTop: 2 }}>{money(market)}</Txt>
          {/* Named, not just shown. A figure with no provenance on the screen
              where somebody sets a price is the thing the scan result spent
              three cards explaining. */}
          {basis && (
            <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
              {basis}
            </Txt>
          )}
          {/* A reference, not a range. The quick / market / patient choices
              only appear when three close-together settled sales stand
              behind them. */}
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
            {askable
              ? `${noRangeReason(why)} Shown for reference only.`
              : "Pick the card from the catalogue to see what it has sold for. Shown for reference only."}
          </Txt>
        </View>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            We have no market value for this card yet, so there is nothing to price against.
            Name your own and the listing still works.
          </Note>
        </View>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        {options.length ? "Pick a strategy" : "Your price"}
      </Txt>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {options.map((o) => {
          const on = strategy === o.id;
          return (
            <Pressable key={o.id} onPress={() => pick(o.id)} style={[s.opt, on && s.optOn]}>
              <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.dot} />}</View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{o.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{o.blurb}</Txt>
              </View>
              <Txt variant="h3">{money(o.price)}</Txt>
            </Pressable>
          );
        })}

        <Pressable onPress={() => pick("own")} style={[s.opt, strategy === "own" && s.optOn]}>
          <View style={[s.radio, strategy === "own" && s.radioOn]}>
            {strategy === "own" && <View style={s.dot} />}
          </View>
          <Txt variant="h3" style={{ flex: 1 }}>Name my own price</Txt>
        </Pressable>

        {strategy === "own" && (
          <View style={s.ownRow}>
            <Txt variant="h2" color={colors.inkMuted}>A$</Txt>
            <TextInput
              value={own} onChangeText={setOwn} keyboardType="number-pad"
              placeholder="0" placeholderTextColor={colors.inkFaint} style={s.ownInput}
            />
          </View>
        )}
      </View>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        How can a buyer get it?
      </Txt>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {[
          { id: "pickup", icon: "map-pin" as const, name: "Pickup", blurb: "Meet in person. A card shop or a police station car park." },
          { id: "post", icon: "truck" as const, name: "Post — tracked", blurb: "Australia Post with tracking." },
          { id: "insured", icon: "shield" as const, name: "Post — insured", blurb: "Tracked and insured. Recommended above A$500." },
        ].map((d) => {
          const on = delivery.includes(d.id);
          return (
            <Pressable key={d.id} onPress={() => toggle(d.id)} style={[s.opt, on && s.optOn]}>
              <View style={[s.check, on && s.checkOn]}>
                {on && <Feather name="check" size={12} color={colors.onPrimary} />}
              </View>
              <Feather name={d.icon} size={16} color={colors.inkMuted} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{d.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{d.blurb}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: space.lg, gap: 6 }}>
        <Txt variant="label" color={colors.inkMuted}>Suburb shown to buyers</Txt>
        <TextInput
          value={suburb} onChangeText={setSuburb}
          placeholder="Bondi Junction, NSW 2022"
          placeholderTextColor={colors.inkFaint} style={s.suburb}
        />
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note icon="credit-card">
          <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
            You get paid directly.
          </Txt>{" "}
          Cash, bank transfer, PayID — whatever the two of you agree. GrailMarket never
          holds funds and takes no cut of the sale.
        </Note>
      </View>
    </Screen>
  );
}

/** "12 Sep 2026". */
const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/** Why there is no range, in a sentence a seller can act on. */
function noRangeReason(why: NoListingGuidance | null): string {
  if (!why) return "No recommended range for this card.";
  if (why.reason === "too-few" || why.reason === "too-spread") {
    return `${why.message}${why.lastSaleAt ? ` Last sold ${when(why.lastSaleAt)}.` : ""}`;
  }
  return why.message;
}

const s = StyleSheet.create({
  listingStrip: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.md, padding: space.md,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  market: {
    marginTop: space.lg, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  opt: {
    flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optOn: { borderColor: colors.ink },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink },
  check: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  ownRow: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.lg, height: 58, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface,
  },
  ownInput: { flex: 1, ...type.h1, color: colors.ink, paddingVertical: 0 },
  suburb: {
    height: 50, paddingHorizontal: space.lg, ...type.body, color: colors.ink,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk,
  },
});
