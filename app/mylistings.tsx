import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";

import { SkeletonRow, SkeletonList } from "../components/Skeleton";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Note } from "../components/Note";
import { GraderBadge } from "../components/GraderChips";
import { gradeLabel } from "../lib/grading";
import { markSold, myListings, num, withdrawListing, type Listing } from "../lib/market";
import { colors, radius, space } from "../theme";
import { aud } from "../lib/fx";

const money = (v: string | number | null | undefined) => aud(num(v));

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  draft: { label: "Draft", fg: colors.inkMuted, bg: colors.surfaceSunk },
  in_review: { label: "In review", fg: colors.info, bg: colors.infoWash },
  live: { label: "Live", fg: colors.up, bg: colors.upWash },
  rejected: { label: "Needs changes", fg: colors.down, bg: colors.downWash },
  withdrawn: { label: "Withdrawn", fg: colors.inkFaint, bg: colors.surfaceSunk },
  sold: { label: "Sold", fg: colors.accent, bg: colors.accentWash },
};

/** Everything the seller has put up, and what it is doing.
 *
 *  Views and saves are here and nowhere else. A buyer seeing "3 views" learns
 *  the card is unwanted; the seller seeing it learns the price is wrong. Same
 *  number, opposite use — so it lives on the seller's screen only. */
export default function MyListings() {
  const router = useRouter();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [quota, setQuota] = useState<{ plan: string | null; limit: number | null; used: number }>(
    { plan: null, limit: null, used: 0 },
  );

  const load = useCallback(() => {
    let alive = true;
    myListings().then((r) => {
      if (!alive) return;
      setRows(r.listings);
      setQuota(r.quota);
    });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const withdraw = (l: Listing) =>
    Alert.alert("Withdraw this listing?", "It comes off the market. You can list it again later.", [
      { text: "Keep it up", style: "cancel" },
      {
        text: "Withdraw", style: "destructive",
        onPress: async () => { await withdrawListing(l.listing_id); load(); },
      },
    ]);

  const sold = (l: Listing) =>
    Alert.alert(
      "Mark as sold?",
      `Confirms ${l.card_name} changed hands at ${money(l.price)}. It becomes a confirmed sale in our price history.`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Sold",
          onPress: async () => {
            await markSold(l.listing_id, num(l.price) ?? undefined);
            load();
            // Rating is most accurate right after the handover, not a week
            // later when only the annoyance is left.
            Alert.alert("Marked sold", "Rate the buyer while it's fresh?", [
              { text: "Later", style: "cancel" },
              { text: "Rate them", onPress: () => router.push("/rate") },
            ]);
          },
        },
      ],
    );

  const full = quota.limit != null && quota.used >= quota.limit;

  return (
    <Screen back footer={
      <Button
        label={full ? "Upgrade to list more" : "List another card"}
        onPress={() => router.push(full ? "/plans" : "/(tabs)/scan")}
      />
    }>
      <Txt variant="display" style={{ marginTop: space.sm }}>My Listings</Txt>
      {quota.limit != null && (
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          {quota.used} of {quota.limit} live on {quota.plan}
        </Txt>
      )}

      {rows == null ? (
        <SkeletonList count={4}>{() => <SkeletonRow />}</SkeletonList>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Feather name="tag" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Listed Yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Scan a card and the sell flow starts already filled in.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {rows.map((l) => {
            const st = STATUS[l.status] ?? STATUS.draft;
            const market = num(l.market_value);
            const price = num(l.price) ?? 0;
            const over = market ? Math.round(((price - market) / market) * 100) : null;
            return (
              <View key={l.listing_id} style={s.card}>
                <Pressable
                  style={s.top}
                  onPress={() => router.push(`/listing/${l.listing_id}` as any)}
                >
                  {l.photos?.[0]?.url || l.image_url ? (
                    <Image source={{ uri: l.photos?.[0]?.url ?? l.image_url! }} style={s.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.thumb, s.thumbEmpty]}>
                      <Feather name="image" size={16} color={colors.inkFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.chips}>
                      <View style={[s.chip, { backgroundColor: st.bg }]}>
                        <Txt variant="overline" color={st.fg} style={s.chipTxt}>{st.label}</Txt>
                      </View>
                      {l.featured && (
                        <View style={[s.chip, { backgroundColor: colors.accentWash }]}>
                          <Txt variant="overline" color={colors.accent} style={s.chipTxt}>Featured</Txt>
                        </View>
                      )}
                      <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
                      {l.photo_verified && (
                        <View style={[s.chip, { backgroundColor: colors.upWash }]}>
                          <Txt variant="overline" color={colors.up} style={s.chipTxt}>Photo verified</Txt>
                        </View>
                      )}
                    </View>
                    <Txt variant="h3" numberOfLines={1}>{l.card_name}</Txt>
                    <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                      {[l.grader ? gradeLabel(l.grader, l.grade) : `Raw · ${gradeLabel("RAW", l.grade)}`,
                        l.set_name].filter(Boolean).join(" · ")}
                    </Txt>
                    <View style={s.priceRow}>
                      <Txt variant="h3">{money(l.price)}</Txt>
                      {over != null && (
                        <Txt variant="bodySmall" color={colors.inkFaint}>
                          {over === 0 ? "at market" : `${Math.abs(over)}% ${over > 0 ? "above" : "below"} market`}
                        </Txt>
                      )}
                    </View>
                  </View>
                </Pressable>

                {l.status === "rejected" && l.reject_reason && (
                  <View style={{ marginTop: space.md }}>
                    <Note tone="bad" icon="alert-triangle">{l.reject_reason}</Note>
                  </View>
                )}

                {l.status === "live" && (
                  <View style={s.stats}>
                    <Stat icon="eye" n={l.views ?? 0} label="views" />
                    <Stat icon="bookmark" n={l.saves ?? 0} label="saved" />
                    <Pressable
                      onPress={() => router.push(`/offers/${l.listing_id}` as any)}
                      style={s.offersBtn}
                    >
                      <Txt variant="overline" color={colors.ink}>Offers</Txt>
                      <Feather name="chevron-right" size={13} color={colors.ink} />
                    </Pressable>
                  </View>
                )}

                {["live", "in_review"].includes(l.status) && (
                  <View style={s.actions}>
                    <Pressable onPress={() => router.push(`/edit/${l.listing_id}` as any)} style={s.action}>
                      <Feather name="edit-2" size={13} color={colors.ink} />
                      <Txt variant="overline" color={colors.ink}>Edit</Txt>
                    </Pressable>
                    <Pressable onPress={() => withdraw(l)} style={s.action}>
                      <Feather name="x" size={13} color={colors.inkMuted} />
                      <Txt variant="overline" color={colors.inkMuted}>Withdraw</Txt>
                    </Pressable>
                    {l.status === "live" && (
                      <Pressable onPress={() => sold(l)} style={s.action}>
                        <Feather name="check" size={13} color={colors.up} />
                        <Txt variant="overline" color={colors.up}>Mark sold</Txt>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Stat({ icon, n, label }: { icon: keyof typeof Feather.glyphMap; n: number; label: string }) {
  return (
    <View style={s.stat}>
      <Feather name={icon} size={13} color={colors.inkFaint} />
      <Txt variant="bodySmall" color={colors.inkMuted}>{n} {label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  top: { flexDirection: "row", gap: space.md },
  thumb: { width: 58, height: 80, borderRadius: 6, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipTxt: { fontSize: 11, letterSpacing: 0.1 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginTop: 2 },
  stats: {
    flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.md,
    paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  offersBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  actions: { flexDirection: "row", gap: space.lg, marginTop: space.md },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  empty: { alignItems: "center", marginTop: space.xxxl },
});
