import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Bone } from "../../components/Skeleton";
import { CardArt } from "../../components/CardArt";
import { myDeals, type DealRow } from "../../lib/deals";
import { money as fxMoney, useFx } from "../../lib/fx";
import { colors, radius, space } from "../../theme";

/** Everything mid-trade, both sides of it.
 *
 *  Sorted by whether it is waiting on YOU. A list ordered by date puts the
 *  thing you have to do somewhere in the middle, and the whole reason to open
 *  this screen is to find out whether anybody is waiting on you.
 */
export default function Deals() {
  const router = useRouter();
  const fx = useFx();
  const [rows, setRows] = useState<DealRow[] | undefined>(undefined);

  const load = useCallback(async () => setRows(await myDeals()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const yours = (d: DealRow) =>
    (d.role === "seller" && d.state === "agreed") ||
    (d.role === "buyer" && d.state === "handed_over");

  const sorted = rows
    ? [...rows].sort((a, b) => Number(yours(b)) - Number(yours(a)))
    : undefined;

  return (
    <Screen back onRefresh={load}>
      <Txt variant="display" style={{ marginTop: space.sm }}>Deals</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Cards you are part way through buying or selling.
      </Txt>

      {sorted === undefined ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {[0, 1, 2].map((i) => <Bone key={i} h={78} r={12} />)}
        </View>
      ) : sorted.length === 0 ? (
        <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.xxl }}>
          Nothing in progress. A deal starts when an offer is accepted.
        </Txt>
      ) : (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {sorted.map((d) => {
            const waiting = yours(d);
            return (
              <Pressable
                key={d.dealId}
                onPress={() => router.push(`/deals/${d.dealId}` as never)}
                style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
              >
                <View style={s.thumb}><CardArt uri={d.imageUrl} iconSize={18} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3" numberOfLines={1}>{d.cardName}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                    {d.role === "seller" ? "To" : "From"} {d.counterparty ?? "them"} ·{" "}
                    {fxMoney(d.amount, { fx, from: d.currency })}
                  </Txt>
                  <Txt
                    variant="bodySmall"
                    color={waiting ? colors.ink : colors.inkMuted}
                    style={waiting ? { fontWeight: "600" } : undefined}
                  >
                    {label(d, waiting)}
                  </Txt>
                </View>
                {waiting && <View style={s.dot} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

/** The state as a sentence about what happens next, not as its own name.
 *  "handed_over" tells the person nothing; "confirm it arrived" tells them
 *  exactly what the app is waiting for. */
function label(d: DealRow, waiting: boolean): string {
  if (d.state === "complete") return "Done";
  if (d.state === "cancelled") return "Called off";
  if (d.state === "agreed") {
    return waiting ? "Send it, then mark it sent" : "Waiting for the seller to send it";
  }
  return waiting ? "Confirm it arrived" : "Waiting for the buyer to confirm";
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outline,
  },
  thumb: {
    width: 42, height: 58, borderRadius: radius.sm, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.up },
});
