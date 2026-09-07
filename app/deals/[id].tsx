import { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { CardArt } from "../../components/CardArt";
import { useToast } from "../../components/Toast";
import {
  callOff, confirmReceived, deal as fetchDeal, handOver, stepsFor, type Deal,
} from "../../lib/deals";
import { money as fxMoney, useFx } from "../../lib/fx";
import { colors, radius, space } from "../../theme";

/** One deal, from agreed to done.
 *
 *  The gap this closes: accepting an offer used to end the flow. The listing
 *  stayed live, the two people were sent to a message thread, and the only way
 *  a card ever closed was the seller alone tapping "sold" — which the buyer
 *  never saw and was never asked about.
 *
 *  Each side sees its own version of the same three steps, because the same
 *  state means opposite things to them: "sent" is a thing one of them has
 *  done and a thing the other is waiting on.
 */
export default function DealPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fx = useFx();
  const toast = useToast();
  const [d, setD] = useState<Deal | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setD(await fetchDeal(String(id)));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (fn: () => Promise<{ message?: string; error?: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.error) { toast(r.message ?? "That could not be done.", { tone: "bad" }); return; }
    toast(r.message ?? "Done.");
    load();
  };

  if (d === undefined) return <Screen back><Loader fill /></Screen>;
  if (d === null) {
    return (
      <Screen back>
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Deal Not Found</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          It may have been called off.
        </Txt>
      </Screen>
    );
  }

  const price = fxMoney(d.amount, { fx, from: d.currency });
  const steps = stepsFor(d, d.role);
  const photo = d.photos?.[0]?.url ?? null;
  const closed = d.state === "complete" || d.state === "cancelled";

  const confirmThen = (title: string, message: string, fn: () => Promise<any>) =>
    Alert.alert(title, message, [
      { text: "Not yet", style: "cancel" },
      { text: "Yes", onPress: () => run(fn) },
    ]);

  return (
    <Screen
      back
      onRefresh={load}
      footer={
        closed ? (
          d.state === "complete" ? (
            <Button
              label={`Rate ${d.counterparty ?? "them"}`}
              onPress={() => router.push({ pathname: "/rate", params: { listingId: d.listingId } })}
            />
          ) : undefined
        ) : (
          <>
            {d.can.handOver && (
              <Button
                label="I've sent it"
                loading={busy}
                disabled={busy}
                onPress={() => confirmThen(
                  "Mark as sent?",
                  "The buyer is asked to confirm it arrived. Only do this once the card is genuinely on its way.",
                  () => handOver(d.dealId),
                )}
              />
            )}
            {d.can.confirm && (
              <Button
                label="It arrived — close the deal"
                loading={busy}
                disabled={busy}
                onPress={() => confirmThen(
                  "Confirm it arrived?",
                  "Check the card against the listing first. This closes the deal and records the sale.",
                  () => confirmReceived(d.dealId),
                )}
              />
            )}
            {d.can.cancel && (
              <Button
                label="Call it off"
                kind="ghost"
                disabled={busy}
                onPress={() => confirmThen(
                  "Call off this deal?",
                  "The card goes back on the market and the other person is told.",
                  () => callOff(d.dealId),
                )}
              />
            )}
          </>
        )
      }
    >
      <View style={s.head}>
        <View style={s.art}>
          {photo ? <Image source={{ uri: photo }} style={s.artImg} /> : <CardArt uri={null} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h2" numberOfLines={2}>{d.cardName}</Txt>
          {d.setName ? (
            <Txt variant="bodySmall" color={colors.inkMuted}>{d.setName}</Txt>
          ) : null}
          <Txt variant="h1" style={{ marginTop: space.sm }}>{price}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {d.role === "seller" ? "Selling to" : "Buying from"} {d.counterparty ?? "them"}
          </Txt>
        </View>
      </View>

      {d.state === "cancelled" && (
        <View style={{ marginTop: space.lg }}>
          <Note icon="x-circle" tone="bad">
            {d.cancelledByMe ? "You called this off." : "This was called off."}
            {d.cancelReason ? ` ${d.cancelReason}` : " The card went back on the market."}
          </Note>
        </View>
      )}

      {/* Money is not handled here and saying so is the honest thing. A flow
          that goes quiet about payment is a flow people assume covers it. */}
      {!closed && (
        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            Payment is arranged between the two of you. GrailMarket records the
            deal and both confirmations — it does not hold the money.
          </Note>
        </View>
      )}

      <View style={s.steps}>
        {steps.map((st, i) => (
          <View key={st.key} style={s.step}>
            <View style={s.rail}>
              <View style={[s.node, st.done && s.nodeOn]}>
                <Feather
                  name={st.done ? "check" : "circle"}
                  size={12}
                  color={st.done ? colors.onPrimary : colors.inkFaint}
                />
              </View>
              {i < steps.length - 1 && <View style={s.line} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.lg }}>
              <Txt variant="h3" color={st.done ? colors.ink : colors.inkMuted}>{st.title}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
                {st.body}
              </Txt>
            </View>
          </View>
        ))}
      </View>

      <Button
        label="Open the conversation"
        kind="ghost"
        onPress={() => router.push({ pathname: "/messages", params: { listingId: d.listingId } })}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", gap: space.lg, marginTop: space.lg },
  art: {
    width: 92, height: 128, borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
  },
  artImg: { width: "100%", height: "100%" },
  steps: { marginTop: space.xxl },
  step: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 26 },
  node: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center",
  },
  nodeOn: { backgroundColor: colors.up, borderColor: colors.up },
  line: { flex: 1, width: 1.5, backgroundColor: colors.line, marginVertical: 2 },
});
