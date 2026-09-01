import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Note } from "../components/Note";
import {
  awaitSubscription, fetchPlans, startCheckout, type Plan, type PlanId,
} from "../lib/billing";
import { colors, radius, space } from "../theme";

const DEV_USER = "dev-user-1";
const money = (cents: number) => `A$${(cents / 100).toFixed(0)}`;

/** Pick a plan.
 *
 *  The subscription is the only money that touches GrailMarket, and the screen
 *  says so — a marketplace that took a cut of the sale would need escrow,
 *  refunds and a licence, and the whole product is shaped around not doing
 *  that. Saying it here is what makes the price legible rather than arbitrary.
 *
 *  Payment happens on Stripe's own page, not in ours. We never see a card
 *  number, which is the difference between reading a PCI questionnaire and
 *  not. */
export default function Plans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [configured, setConfigured] = useState(true);
  const [chosen, setChosen] = useState<PlanId>("collector");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans().then((r) => { setPlans(r.plans); setConfigured(r.configured); });
  }, []);

  const go = async () => {
    setFailure(null);
    setBusy(true);
    const r = await startCheckout(DEV_USER, chosen);
    setBusy(false);
    if (r.outcome === "failed") { setFailure(r.message); return; }
    if (r.outcome === "dismissed") return;   // backed out; nothing to say

    // The browser came back. That is not payment — Stripe's webhook is, so we
    // ask our own backend rather than believing the redirect.
    setWaiting(true);
    const sub = await awaitSubscription(DEV_USER);
    setWaiting(false);
    if (sub.status === "active" || sub.status === "trialing") router.replace("/ready");
    else setFailure("We haven't seen the payment confirmed yet. It can take a moment — check Plan & billing shortly.");
  };

  const selected = plans.find((p) => p.id === chosen);

  return (
    <Screen
      back
      footer={
        <Button
          label={selected ? `Continue with ${selected.name}` : "Continue"}
          onPress={go}
          loading={busy || waiting}
          disabled={!configured || plans.length === 0}
        />
      }
    >
      <Txt variant="display">Pick a plan</Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        A subscription is the only money that changes hands with GrailMarket. Sales are
        settled directly between you and the other member.
      </Txt>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.xs }}>
        Cancel any time.
      </Txt>

      <View style={s.list}>
        {plans.map((p) => {
          const on = p.id === chosen;
          return (
            <Pressable
              key={p.id}
              onPress={() => setChosen(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[s.card, on && s.cardOn]}
            >
              {p.popular && (
                <View style={s.tag}>
                  <Txt variant="overline" color={colors.onAccent} style={s.tagTxt}>Most popular</Txt>
                </View>
              )}
              <View style={s.head}>
                <View style={[s.radio, on && s.radioOn]}>
                  {on && <View style={s.dot} />}
                </View>
                <View style={s.headText}>
                  <Txt variant="h2">{p.name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkMuted}>{p.blurb}</Txt>
                </View>
                <View style={s.price}>
                  <Txt variant="h2">{money(p.amountCents)}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>per month</Txt>
                </View>
              </View>

              {/* only the chosen plan lists what it includes: three open lists
                  is a wall of ticks nobody compares */}
              {on && (
                <View style={s.perks}>
                  {p.perks.map((k) => (
                    <View key={k} style={s.perk}>
                      <Feather name="check" size={14} color={colors.up} />
                      <Txt variant="bodySmall" color={colors.inkMuted}>{k}</Txt>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note icon="credit-card">
          <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
            No escrow, no held funds.
          </Txt>{" "}
          GrailMarket takes no commission and never touches the sale price.
        </Note>
      </View>

      {!configured && (
        <View style={{ marginTop: space.md }}>
          <Note tone="bad" icon="alert-circle">
            Billing isn&rsquo;t configured yet — STRIPE_SECRET_KEY is not set on the server.
          </Note>
        </View>
      )}
      {failure && (
        <View style={{ marginTop: space.md }}>
          <Note tone="bad" icon="alert-circle">{failure}</Note>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.xl, gap: space.md },
  card: {
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surface, padding: space.lg,
  },
  cardOn: { borderColor: colors.ink },
  tag: {
    position: "absolute", top: -10, right: space.lg,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagTxt: { fontSize: 9, letterSpacing: 0.8 },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.lineStrong,
    alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  headText: { flex: 1, gap: 2 },
  price: { alignItems: "flex-end" },
  perks: {
    marginTop: space.md, paddingTop: space.md, gap: 7,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  perk: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
