import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../components/Toast";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Note } from "../components/Note";
import { Segmented } from "../components/CatalogueTiles";
import {
  awaitSubscription, fetchPlans, fetchSubscription, startCheckout,
  type Interval, type PlanId, type PlansAnswer,
} from "../lib/billing";
import { fetchStatus, type IdentityStatus } from "../lib/identity";
import { useSession } from "../lib/session";
import { colors, radius, shadow, space } from "../theme";


/** Whole dollars where the price is whole, cents where it is not.
 *
 *  This was `toFixed(0)`, which is right for A$5 and A$10 and silently wrong
 *  the first time a plan is priced at A$10.99 — it would read A$11 on the one
 *  screen in the app where the number is a promise about a charge. */
const money = (cents: number, currency = "AUD") => {
  const symbol = currency === "AUD" ? "A$" : currency === "USD" ? "US$" : `${currency} `;
  return `${symbol}${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;
};

const hoursLabel = (h: number) => (h % 24 === 0 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hours`);

/** Pick a plan.
 *
 *  The subscription is the only money that touches GrailMarket, and the screen
 *  says so — a marketplace that took a cut of the sale would need escrow,
 *  refunds and a licence, and the whole product is shaped around not doing
 *  that. Saying it here is what makes the price legible rather than arbitrary.
 *
 *  Three plans, as the client set them on 1 September: a free listing for
 *  anyone whose identity check passed, Collector and Dealer by the month or
 *  the year. The yearly saving is worked out from the two prices on screen,
 *  never from a number typed into the copy — if Stripe charges something
 *  else, the saving line follows what Stripe charges.
 *
 *  Payment happens on Stripe's own page, not in ours. We never see a card
 *  number, which is the difference between reading a PCI questionnaire and
 *  not. */
export default function Plans() {
  const toast = useToast();
  const session = useSession();
  const userId = session?.userId ?? "";
  const router = useRouter();
  const [answer, setAnswer] = useState<PlansAnswer>({ configured: true, plans: [] });
  const [interval, setBillingInterval] = useState<Interval>("month");
  const [chosen, setChosen] = useState<PlanId>("collector");
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [current, setCurrent] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    fetchPlans().then(setAnswer);
    if (userId) {
      fetchStatus(userId).then(setIdentity);
      fetchSubscription(userId).then((s) =>
        setCurrent(s.status === "active" || s.status === "trialing" ? s.plan_id : null));
    }
  }, [userId]);

  const plans = answer.plans;
  const verified = identity === "Approved";
  const selected = plans.find((p) => p.id === chosen);
  const sellable = (p: (typeof plans)[number]) =>
    !p.free && (interval === "year" ? p.availableAnnual === true : p.available !== false);

  const go = async () => {
    if (!selected || !sellable(selected)) return;
    setBusy(true);
    const r = await startCheckout(userId, chosen, interval);
    setBusy(false);
    if (r.outcome === "failed") { toast(r.message ?? "Something went wrong.", { tone: "bad" }); return; }
    if (r.outcome === "dismissed") return;   // backed out; nothing to say

    // The browser came back. That is not payment — Stripe's webhook is, so we
    // ask our own backend rather than believing the redirect.
    setWaiting(true);
    const sub = await awaitSubscription(userId);
    setWaiting(false);
    if (sub.status === "active" || sub.status === "trialing") router.replace("/ready");
    else toast("We haven't seen the payment confirmed yet. It can take a moment — check Plan & billing shortly.", { tone: "bad" });
  };

  const canContinue = Boolean(selected && sellable(selected)) && answer.configured;

  return (
    <Screen
      back
      footer={
        <Button
          label={selected && !selected.free
            ? `Continue with ${selected.name}${interval === "year" ? " yearly" : ""}`
            : "Choose Collector or Dealer"}
          onPress={go}
          loading={busy || waiting}
          disabled={!canContinue || busy || waiting}
        />
      }
    >
      <Txt variant="display">Pick a plan</Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        A subscription is the only money that changes hands with GrailMarket. Sales are
        settled directly between you and the other member.
      </Txt>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.xs }}>
        No commission. No free trial. Cancel any time.
      </Txt>

      <View style={{ marginTop: space.xl }}>
        <Segmented<Interval>
          options={[{ id: "month", label: "Monthly" }, { id: "year", label: "Yearly" }]}
          value={interval}
          onChange={setBillingInterval}
        />
      </View>

      <View style={s.list}>
        {plans.filter((p) => p.id !== "starter").map((p) => {
          const isFree = Boolean(p.free);
          const onSale = sellable(p);
          const on = p.id === chosen && onSale;
          const mine = current === p.id || (isFree && verified && current == null);
          const yearly = interval === "year" && !isFree;
          const cents = yearly ? p.annualCents ?? null : p.amountCents;
          // Honest saving: twelve of the monthly price actually shown, against
          // the yearly price actually shown. No saving line if either is
          // missing or there is nothing saved.
          const saved = yearly && p.annualCents != null && p.available !== false
            ? p.amountCents * 12 - p.annualCents : 0;

          return (
            <Pressable
              key={p.id}
              onPress={() => !isFree && onSale && setChosen(p.id)}
              disabled={isFree || !onSale}
              accessibilityRole={isFree ? "summary" : "radio"}
              accessibilityState={{ selected: on, disabled: !isFree && !onSale }}
              style={[s.card, on && s.cardOn, !isFree && !onSale && s.cardOff]}
            >
              {p.popular && !isFree && (
                <View style={s.tag}>
                  <Txt variant="overline" color={colors.onAccent} style={s.tagTxt}>Most popular</Txt>
                </View>
              )}
              <View style={s.head}>
                {!isFree && (
                  <View style={[s.radio, on && s.radioOn]}>
                    {on && <View style={s.dot} />}
                  </View>
                )}
                <View style={s.headText}>
                  <Txt variant="h2">{p.name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkMuted}>{p.blurb}</Txt>
                </View>
                <View style={s.price}>
                  <Txt variant="h2">
                    {isFree ? "Free" : onSale && cents != null ? money(cents, p.currency) : "—"}
                  </Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    {isFree ? "no subscription" : !onSale ? (yearly ? "yearly not on sale yet" : "unavailable")
                      : yearly ? "per year" : "per month"}
                  </Txt>
                </View>
              </View>

              {yearly && onSale && saved > 0 && (
                <Txt variant="bodySmall" color={colors.up} style={{ marginTop: space.sm }}>
                  {money(Math.round((p.annualCents ?? 0) / 12), p.currency)} a month · saves {money(saved, p.currency)} over 12 months
                </Txt>
              )}

              {p.fairUse && (
                <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.sm }}>
                  Unlimited active listings under our Fair Use Policy.
                </Txt>
              )}

              {isFree && (
                <View style={s.freeRow}>
                  {verified ? (
                    <View style={s.have}>
                      <Feather name="check-circle" size={15} color={colors.up} />
                      <Txt variant="bodySmall" color={colors.ink}>
                        {current ? "Included — you're on a paid plan" : "You have this"}
                      </Txt>
                    </View>
                  ) : (
                    <>
                      <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>
                        Verify your identity to list one card free.
                      </Txt>
                      <Pressable onPress={() => router.push("/idcheck")}
                        style={({ pressed }) => [s.verify, pressed && { opacity: 0.85 }]}
                        accessibilityRole="button">
                        <Txt variant="label" color={colors.onPrimary}>Verify</Txt>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {mine && !isFree && (
                <Txt variant="bodySmall" color={colors.up} style={{ marginTop: space.sm }}>Your current plan</Txt>
              )}

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

      {(answer.extraListing || (answer.boosts && answer.boosts.length > 0)) && (
        <View style={s.extras}>
          <Txt variant="h3">Add-ons</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
            Coming soon — priced here so there are no surprises.
          </Txt>
          {answer.extraListing && (
            <View style={s.extraRow}>
              <Txt variant="bodySmall" color={colors.ink} style={{ flex: 1 }}>Extra active listing</Txt>
              <Txt variant="label">{money(answer.extraListing.amountCents, answer.extraListing.currency)}</Txt>
            </View>
          )}
          {answer.boosts?.map((b) => (
            <View key={b.key} style={s.extraRow}>
              <View style={{ flex: 1 }}>
                <Txt variant="bodySmall" color={colors.ink}>{b.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint}>{hoursLabel(b.hours)}</Txt>
              </View>
              <Txt variant="label">{money(b.amountCents, b.currency)}</Txt>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: space.lg }}>
        <Note icon="credit-card">
          <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
            No escrow, no held funds.
          </Txt>{" "}
          GrailMarket takes no commission and never touches the sale price.
        </Note>
      </View>

      {!answer.configured && (
        <View style={{ marginTop: space.md }}>
          <Note tone="bad" icon="alert-circle">
            Billing isn&rsquo;t configured yet — STRIPE_SECRET_KEY is not set on the server.
          </Note>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.lg, gap: space.md },
  card: {
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: "transparent",
    backgroundColor: colors.surface, padding: space.lg, ...shadow.card,
  },
  cardOff: { opacity: 0.5 },
  cardOn: { borderColor: colors.ink },
  tag: {
    position: "absolute", top: -10, right: space.lg,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagTxt: { fontSize: 11, letterSpacing: 0.1 },
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
  freeRow: {
    marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line,
    flexDirection: "row", alignItems: "center", gap: space.md,
  },
  have: { flexDirection: "row", alignItems: "center", gap: space.sm },
  verify: {
    height: 34, paddingHorizontal: space.lg, borderRadius: radius.pill,
    backgroundColor: colors.ink, alignItems: "center", justifyContent: "center",
  },
  extras: {
    marginTop: space.xl, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, ...shadow.card,
  },
  extraRow: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingTop: space.md, marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.line,
  },
});
