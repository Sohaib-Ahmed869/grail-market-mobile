import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { useToast } from "../../components/Toast";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel } from "../../lib/grading";
import { num, offersFor, settleOffer, type Offer } from "../../lib/market";
import { colors, radius, space, type } from "../../theme";

const money = (v: string | number | null | undefined) => {
  const n = num(v);
  return n == null ? "—" : `A$${Math.round(n).toLocaleString()}`;
};

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  open: { label: "Open", fg: colors.info, bg: colors.infoWash },
  accepted: { label: "Accepted", fg: colors.up, bg: colors.upWash },
  declined: { label: "Declined", fg: colors.inkFaint, bg: colors.surfaceSunk },
  countered: { label: "Countered", fg: colors.accent, bg: colors.accentWash },
};

/** Offers on one listing, seller side.
 *
 *  Every offer is read against the market as well as the ask. A seller looking
 *  only at "18% below my price" cannot tell a lowball from a fair offer on an
 *  overpriced card — and it is the second one they should take. */
export default function ListingOffers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof offersFor>> | null>(null);
  const [countering, setCountering] = useState<string | null>(null);
  const [counter, setCounter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const load = useCallback(() => {
    let alive = true;
    offersFor(String(id)).then((r) => { if (alive) setData(r as any); });
    return () => { alive = false; };
  }, [id]);
  useFocusEffect(load);

  const act = async (o: Offer, action: "accepted" | "declined" | "countered", amount?: number) => {
    setBusy(o.offer_id);
    const r = await settleOffer(o.offer_id, action, amount);
    setBusy(null);
    if ((r as any)?.error) {
      toast("That offer could not be settled.", { tone: "bad" });
    } else {
      toast({
        accepted: "Offer accepted. Every other open offer on this card was declined.",
        declined: "Offer declined.",
        countered: `Countered at A$${Math.round(amount ?? 0).toLocaleString()}.`,
      }[action], { tone: action === "declined" ? "info" : "good" });
    }
    setCountering(null);
    setCounter("");
    load();
  };

  const accept = (o: Offer) =>
    Alert.alert(
      `Accept ${money(o.amount)}?`,
      "Every other open offer on this card is declined at the same time. Money is settled between the two of you — we don't hold it.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Accept", onPress: () => act(o, "accepted") },
      ],
    );

  const market = data?.marketValue != null ? num(data.marketValue) : null;
  const asking = data ? num(data.asking) ?? 0 : 0;
  const open = data?.offers.filter((o) => o.status === "open") ?? [];

  return (
    <Screen back>
      <Txt variant="display" style={{ marginTop: space.sm }}>Offers</Txt>
      {data?.cardName && (
        <View style={s.on}>
          <GraderBadge grader={data.grader ?? "RAW"} grade={data.grade} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1}>{data.cardName}</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
              {[data.setName,
                data.grader ? gradeLabel(data.grader, data.grade) : gradeLabel("RAW", data.grade),
              ].filter(Boolean).join(" · ")}
            </Txt>
          </View>
        </View>
      )}
      {data && (
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          Asking {money(asking)}{market ? ` · market ${money(market)}` : ""}
          {" · "}{open.length} open
        </Txt>
      )}

      {data == null ? (
        <Loader fill />
      ) : data.offers.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Feather name="inbox" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>No Offers Yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Cards priced above market usually wait.
          </Txt>
          <Button
            label="Change the price"
            kind="ghost"
            onPress={() => router.push(`/edit/${String(id)}` as any)}
            style={{ marginTop: space.md }}
          />
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {data.offers.map((o) => {
            const amt = num(o.amount) ?? 0;
            const vsAsk = asking ? Math.round(((amt - asking) / asking) * 100) : null;
            const vsMarket = market ? Math.round(((amt - market) / market) * 100) : null;
            const st = STATUS[o.status] ?? STATUS.open;
            const isOpen = o.status === "open";
            return (
              <View key={o.offer_id} style={[s.card, !isOpen && s.settled]}>
                <View style={s.top}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="price">{money(amt)}</Txt>
                    <View style={s.reading}>
                      {vsAsk != null && (
                        <Txt variant="bodySmall" color={colors.inkMuted}>
                          {vsAsk === 0 ? "full ask" : `${Math.abs(vsAsk)}% ${vsAsk > 0 ? "over" : "under"} ask`}
                        </Txt>
                      )}
                      {vsMarket != null && (
                        <Txt variant="bodySmall" color={vsMarket >= 0 ? colors.up : colors.down}>
                          · {Math.abs(vsMarket)}% {vsMarket >= 0 ? "over" : "under"} market
                        </Txt>
                      )}
                    </View>
                  </View>
                  <View style={[s.chip, { backgroundColor: st.bg }]}>
                    <Txt variant="overline" color={st.fg} style={s.chipTxt}>{st.label}</Txt>
                  </View>
                </View>

                <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
                  {o.buyer_name ?? "A verified member"}
                </Txt>
                {o.note && (
                  <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.sm }}>
                    “{o.note}”
                  </Txt>
                )}

                {isOpen && countering === o.offer_id ? (
                  <View style={s.counterBox}>
                    <Txt variant="overline" color={colors.inkFaint}>Counter with</Txt>
                    <View style={s.counterRow}>
                      <Txt variant="h2" color={colors.inkFaint}>A$</Txt>
                      <TextInput
                        value={counter}
                        onChangeText={setCounter}
                        keyboardType="number-pad"
                        autoFocus
                        style={s.counterInput}
                      />
                    </View>
                    <View style={s.counterActions}>
                      <Button
                        label="Send counter"
                        onPress={() => act(o, "countered", Number(counter.replace(/[^\d.]/g, "")))}
                        disabled={!(Number(counter.replace(/[^\d.]/g, "")) > 0)}
                        loading={busy === o.offer_id}
                      />
                      <Button label="Cancel" kind="ghost" onPress={() => setCountering(null)} />
                    </View>
                  </View>
                ) : isOpen ? (
                  <View style={s.actions}>
                    <Pressable onPress={() => accept(o)} style={[s.action, s.accept]}>
                      <Feather name="check" size={14} color={colors.onPrimary} />
                      <Txt variant="button" color={colors.onPrimary}>Accept</Txt>
                    </Pressable>
                    <Pressable
                      onPress={() => { setCountering(o.offer_id); setCounter(String(Math.round(asking))); }}
                      style={s.action}
                    >
                      <Feather name="repeat" size={14} color={colors.ink} />
                      <Txt variant="button">Counter</Txt>
                    </Pressable>
                    <Pressable onPress={() => act(o, "declined")} style={s.action}>
                      <Feather name="x" size={14} color={colors.inkMuted} />
                      <Txt variant="button" color={colors.inkMuted}>Decline</Txt>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: space.xl }}>
        <Note icon="shield">
          Accepting agrees a deal, not a payment. Arrange handover in a public place, or
          post it tracked and insured — and mark the card sold once it has changed hands.
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    padding: space.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  settled: { opacity: 0.6 },
  on: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  reading: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 2 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  chipTxt: { fontSize: 11.5, letterSpacing: 0.1 },
  actions: {
    flexDirection: "row", gap: space.sm, marginTop: space.md,
    paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line,
  },
  action: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    flex: 1, height: 40, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  accept: { backgroundColor: colors.ink, borderColor: colors.ink },
  counterBox: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  counterRow: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    borderBottomWidth: 2, borderBottomColor: colors.ink, paddingBottom: 4,
  },
  counterInput: {
    flex: 1, ...type.h1, fontVariant: ["tabular-nums" as const],
    color: colors.ink, paddingVertical: 0,
  },
  counterActions: { gap: space.sm, marginTop: space.md },
});
