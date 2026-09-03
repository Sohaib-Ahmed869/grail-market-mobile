import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { JoinGate } from "../../components/JoinGate";
import { useGuest } from "../../lib/guest";
import { SkeletonList, SkeletonRow } from "../../components/Skeleton";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { getCollection, type Entry } from "../../lib/market";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel, variantLabel } from "../../lib/grading";
import { setDraftSeed, clearDraft } from "../../lib/selldraft";
import { colors, radius, space } from "../../theme";

const money = (n: number | null, cur = "A$") =>
  n == null ? "—" : `${cur}${Math.round(n).toLocaleString()}`;

/** Collection.
 *
 *  Valued at today's market, never at what was paid. That was asked for
 *  directly, and it is the difference between a ledger and a reason to open
 *  the app twice a day.
 *
 *  Cards we cannot price show a blank rather than a zero, and the header says
 *  how many are priced. A total that silently skips them reads as the value of
 *  the whole collection and is not. */
export default function Portfolio() {
  // Browsing is open to anyone; this is not. See JoinGate for why the
  // line is drawn here rather than at the front door.
  const guest = useGuest();
  const router = useRouter();
  const [data, setData] = useState({ entries: [] as Entry[], value: 0, cost: 0, gain: 0, priced: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    getCollection().then((d) => { setData(d); setBusy(false); });
  }, []);
  useFocusEffect(load);

  const up = data.gain >= 0;

  if (guest) {
    return (
      <JoinGate
        icon={"briefcase"}
        title="Your collection lives with your account"
        why="A collection has to belong to somebody. Create an account and it follows you to any device."
        points={[
          "Valued at today’s market, not what you paid",
          "One tap turns any card into a listing",
          "Nothing is shared unless you list it",
        ]}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <FlatList
        data={data.entries}
        keyExtractor={(e) => e.entryId}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.inkFaint} />}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.head}>
            <Txt variant="display">Collection</Txt>
            <View style={s.valueCard}>
              <Txt variant="overline" color={colors.inkFaint}>Live market value</Txt>
              <Txt variant="price" style={{ marginTop: 2 }}>{money(data.value)}</Txt>
              {/* Same rule as the dashboard: without a recorded cost there is
                * no gain to report, and showing the whole value as profit is
                * the most flattering possible lie. */}
              {data.cost > 0 ? (
                <View style={s.deltaRow}>
                  <Feather name={up ? "trending-up" : "trending-down"} size={13}
                    color={up ? colors.up : colors.down} />
                  <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
                    {up ? "+" : ""}{money(data.gain)} against {money(data.cost)} paid
                  </Txt>
                </View>
              ) : (
                <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 4 }}>
                  Add what you paid to see gain or loss
                </Txt>
              )}
              <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
                {data.entries.length} card{data.entries.length === 1 ? "" : "s"}
                {data.priced < data.entries.length
                  ? ` · ${data.priced} priced, ${data.entries.length - data.priced} we can't value yet`
                  : ""}
              </Txt>
            </View>

            <View style={s.links}>
              {[
                { icon: "eye" as const, label: "Watchlist", to: "/watchlist" },
                { icon: "tag" as const, label: "My listings", to: "/mylistings" },
                { icon: "inbox" as const, label: "My offers", to: "/offers" },
                { icon: "shopping-bag" as const, label: "Market", to: "/market" },
              ].map((x) => (
                <Pressable key={x.label} onPress={() => router.push(x.to as any)}
                  style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]}>
                  <Feather name={x.icon} size={16} color={colors.ink} />
                  <Txt variant="bodySmall" center>{x.label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          busy && data.entries.length === 0 ? (
            <SkeletonList count={4}>{() => <SkeletonRow />}</SkeletonList>
          ) : !busy ? (
            <View style={s.empty}>
              <Feather name="briefcase" size={24} color={colors.inkFaint} />
              <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Here Yet</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
                Scan a card and add it. The value updates on its own, and one tap
                turns it into a listing.
              </Txt>
              <Button label="Scan a card" onPress={() => router.push("/(tabs)/scan")}
                style={{ marginTop: space.xl, alignSelf: "stretch" }} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const qty = item.quantity ?? 1;
          const gain = item.value != null && item.paid != null ? (item.value - item.paid) * qty : null;
          // Tapping a card starts a listing for it. The collection is where a
          // seller already knows what they own, so making them re-scan a card
          // sitting in front of them is the long way round.
          const sell = () => {
            clearDraft();
            setDraftSeed({
              catalogId: item.catalogId, cardName: item.cardName, setName: item.setName,
              cardNumber: item.cardNumber, imageUrl: item.imageUrl,
              grader: item.grader, grade: item.grade, variant: item.variant,
              marketValue: item.value,
            });
            router.push("/sell/card");
          };
          return (
            <Pressable style={s.row} onPress={sell}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.thumb} resizeMode="cover" />
              ) : (
                <View style={[s.thumb, s.thumbEmpty]}>
                  <Feather name="image" size={15} color={colors.inkFaint} />
                </View>
              )}
              <View style={s.rowText}>
                <View style={s.rowBadges}>
                  <GraderBadge grader={item.grader ?? "RAW"} grade={item.grade} />
                  {qty > 1 && (
                    <View style={s.qty}>
                      <Txt variant="overline" color={colors.inkMuted} style={{ fontSize: 11 }}>×{qty}</Txt>
                    </View>
                  )}
                </View>
                <Txt variant="h3" numberOfLines={1}>{item.cardName}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                  {[item.setName,
                    item.grader ? gradeLabel(item.grader, item.grade) : gradeLabel("RAW", item.grade),
                    item.variant && item.variant !== "normal" ? variantLabel(item.variant) : null,
                  ].filter(Boolean).join(" · ")}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt variant="h3">{money(item.value == null ? null : item.value * qty)}</Txt>
                {gain != null && (
                  <Txt variant="bodySmall" color={gain >= 0 ? colors.up : colors.down}>
                    {gain >= 0 ? "+" : ""}{money(gain)}
                  </Txt>
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  list: { paddingHorizontal: space.xl, paddingBottom: 130 },
  head: { paddingTop: space.sm, marginBottom: space.lg },
  valueCard: {
    marginTop: space.lg, padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  links: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  link: {
    flex: 1, alignItems: "center", gap: 5, paddingVertical: space.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  thumb: { width: 44, height: 61, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowBadges: { flexDirection: "row", alignItems: "center", gap: 4 },
  qty: {
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.md },
});
