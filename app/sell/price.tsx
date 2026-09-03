import { useMemo, useState } from "react";
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

const money = (n: number) => `A$${Math.round(n).toLocaleString()}`;

/** Step 3 — what to ask, and how a buyer gets it.
 *
 *  The three strategies are computed from market value rather than typed,
 *  because a seller guessing at a number is exactly how a card sits unsold for
 *  four months or goes for half what it is worth. The last option is still
 *  "name my own price" — the guidance is a suggestion, not a rule.
 *
 *  No escrow language anywhere. Delivery is pickup or post, and the panel says
 *  plainly that the money is settled between the two members, because that is
 *  the thing most likely to be misunderstood. */
export default function SellPrice() {
  const router = useRouter();
  const draft = getDraft();
  const market = draft?.marketValue ?? null;

  const options = useMemo(() => {
    if (!market) return [];
    return [
      { id: "quick", name: "Sell it quickly", blurb: "Under market. Usually gone inside a week.", price: Math.round(market * 0.92) },
      { id: "market", name: "At market", blurb: "Matches recent completed sales.", price: Math.round(market) },
      { id: "patient", name: "Hold out", blurb: "Above market. Expect offers, not instant sales.", price: Math.round(market * 1.08) },
    ];
  }, [market]);

  const [strategy, setStrategy] = useState(market ? "market" : "own");
  const [own, setOwn] = useState(market ? String(Math.round(market)) : "");
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

      {market ? (
        <View style={s.market}>
          <Txt variant="overline" color={colors.inkFaint}>
            Market value{draft?.grader ? ` · ${draft.grader} ${draft.grade ?? ""}` : " · ungraded"}
          </Txt>
          <Txt variant="price" style={{ marginTop: 2 }}>{money(market)}</Txt>
        </View>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            We have no market value for this card yet, so there is nothing to price against.
            Name your own and the listing still works.
          </Note>
        </View>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>Pick a strategy</Txt>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {options.map((o) => {
          const on = strategy === o.id;
          return (
            <Pressable key={o.id} onPress={() => setStrategy(o.id)} style={[s.opt, on && s.optOn]}>
              <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.dot} />}</View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{o.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{o.blurb}</Txt>
              </View>
              <Txt variant="h3">{money(o.price)}</Txt>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setStrategy("own")} style={[s.opt, strategy === "own" && s.optOn]}>
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
