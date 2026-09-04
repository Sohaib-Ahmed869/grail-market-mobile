import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";

import { SkeletonRow, SkeletonList } from "../../components/Skeleton";
import { Txt } from "../../components/Text";
import { Note } from "../../components/Note";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel } from "../../lib/grading";
import { makeOffer, myOffers, num, type Offer } from "../../lib/market";
import { colors, radius, space } from "../../theme";
import { aud } from "../../lib/fx";

const money = (v: string | number | null | undefined) => aud(num(v));

const STATUS: Record<string, { label: string; fg: string; bg: string; body: string }> = {
  open: { label: "Waiting", fg: colors.info, bg: colors.infoWash, body: "The seller hasn't answered yet." },
  accepted: { label: "Accepted", fg: colors.up, bg: colors.upWash, body: "Agree a handover with the seller. We don't hold the money." },
  declined: { label: "Declined", fg: colors.inkFaint, bg: colors.surfaceSunk, body: "You can offer again if the price moves." },
  countered: { label: "Countered", fg: colors.accent, bg: colors.accentWash, body: "The seller named a different number." },
};

/** Offers this member has made.
 *
 *  A counter arrives as a number, not a negotiation thread — so the only thing
 *  to do with it is take it or leave it, and taking it is a fresh offer at the
 *  countered amount. That keeps one rule true everywhere: an offer is always
 *  something the buyer sent. */
export default function MyOffers() {
  const router = useRouter();
  const [rows, setRows] = useState<Offer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    myOffers().then((r) => { if (alive) setRows(r.offers); });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const takeCounter = async (o: Offer) => {
    setBusy(o.offer_id);
    await makeOffer(o.listing_id, num(o.amount) ?? 0, "Accepting your counter.");
    setBusy(null);
    load();
  };

  return (
    <Screen back>
      <Txt variant="display" style={{ marginTop: space.sm }}>My Offers</Txt>

      {rows == null ? (
        <SkeletonList count={4}>{() => <SkeletonRow />}</SkeletonList>
      ) : rows.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Feather name="tag" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>No Offers Yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Find a card on the market and name your price.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {rows.map((o) => {
            const st = STATUS[o.status] ?? STATUS.open;
            const amt = num(o.amount) ?? 0;
            const ask = num(o.asking);
            return (
              <View key={o.offer_id} style={s.card}>
                <Pressable
                  style={s.top}
                  onPress={() => router.push(`/listing/${o.listing_id}` as any)}
                >
                  {o.image_url ? (
                    <Image source={{ uri: o.image_url }} style={s.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.thumb, s.thumbEmpty]}>
                      <Feather name="image" size={15} color={colors.inkFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.rowChips}>
                      <View style={[s.chip, { backgroundColor: st.bg }]}>
                        <Txt variant="overline" color={st.fg} style={s.chipTxt}>{st.label}</Txt>
                      </View>
                      <GraderBadge grader={o.grader ?? "RAW"} grade={o.grade} />
                    </View>
                    <Txt variant="h3" numberOfLines={1}>{o.card_name ?? "Listing"}</Txt>
                    <Txt variant="overline" color={colors.inkFaint} numberOfLines={1}>
                      {[o.set_name,
                        o.grader ? gradeLabel(o.grader, o.grade) : null,
                      ].filter(Boolean).join(" · ")}
                    </Txt>
                    <Txt variant="bodySmall" color={colors.inkMuted}>
                      {o.status === "countered" ? "Seller countered at " : "You offered "}
                      <Txt variant="bodySmall" color={colors.ink}>{money(amt)}</Txt>
                      {ask != null ? ` · asking ${money(ask)}` : ""}
                    </Txt>
                  </View>
                  <Feather name="chevron-right" size={17} color={colors.inkFaint} />
                </Pressable>

                <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
                  {st.body}
                </Txt>

                {o.status === "countered" && (
                  <Pressable
                    onPress={() => takeCounter(o)}
                    disabled={busy === o.offer_id}
                    style={s.take}
                  >
                    <Feather name="check" size={13} color={colors.onPrimary} />
                    <Txt variant="button" color={colors.onPrimary}>
                      {busy === o.offer_id ? "Sending" : `Take it at ${money(amt)}`}
                    </Txt>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: space.xl }}>
        <Note icon="shield">
          An accepted offer is an agreed deal, not a payment. Meet in a public place, or
          have it posted tracked and insured.
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  thumb: { width: 48, height: 66, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  rowChips: { flexDirection: "row", alignItems: "center", gap: 4 },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipTxt: { fontSize: 11, letterSpacing: 0.1 },
  take: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    height: 40, marginTop: space.md, borderRadius: radius.sm, backgroundColor: colors.ink,
  },
});
