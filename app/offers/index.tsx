import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";

import { SkeletonRow, SkeletonList } from "../../components/Skeleton";
import { Txt } from "../../components/Text";
import { Note } from "../../components/Note";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel } from "../../lib/grading";
import { counterSides, myOffers, num, replyToCounter, type Offer } from "../../lib/market";
import { useToast } from "../../components/Toast";
import { colors, radius, space, type } from "../../theme";
import { aud } from "../../lib/fx";

const money = (v: string | number | null | undefined) => aud(num(v));

const STATUS: Record<string, { label: string; fg: string; bg: string; body: string }> = {
  open: { label: "Waiting", fg: colors.info, bg: colors.infoWash, body: "The seller hasn't answered yet." },
  accepted: { label: "Accepted", fg: colors.up, bg: colors.upWash, body: "Agree a handover with the seller. We don't hold the money." },
  declined: { label: "Declined", fg: colors.inkFaint, bg: colors.surfaceSunk, body: "You can offer again if the price moves." },
  countered: { label: "Countered", fg: colors.accent, bg: colors.accentWash, body: "The seller named a different number. It is yours to take, leave, or answer." },
};

/** Offers this member has made.
 *
 *  A counter used to arrive as a number with one button under it, and taking
 *  it opened a NEW offer the seller then had to accept — so a deal both people
 *  had agreed to still needed another round trip, and walking away or naming a
 *  third number was not offered at all.
 *
 *  All three moves live here now. Accepting strikes the deal at the seller's
 *  figure, which is the one on the table. Countering back opens a fresh offer,
 *  so an offer is still always something the buyer sent. */
export default function MyOffers() {
  const router = useRouter();
  const [rows, setRows] = useState<Offer[] | null>(null);
  // Offers people have made on MY listings. A separate list, because they are
  // a different job: these are decisions waiting on me.
  const [received, setReceived] = useState<Offer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Which offer is having a number typed into it, and what that number is.
  const [countering, setCountering] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const toast = useToast();

  const load = useCallback(() => {
    let alive = true;
    myOffers().then((r) => { if (!alive) return; setRows(r.offers); setReceived(r.received); });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const refresh = useCallback(async () => {
    const r = await myOffers();
    setRows(r.offers); setReceived(r.received);
  }, []);

  const reply = async (
    o: Offer, action: "accepted" | "declined" | "countered", amount?: number,
  ) => {
    setBusy(o.offer_id);
    const r = await replyToCounter(o.offer_id, action, amount);
    setBusy(null);
    if (r?.error) {
      toast("That counter could not be answered. Pull to refresh and try again.", { tone: "bad" });
      return;
    }
    setCountering(null);
    setDraft("");
    await refresh();
    if (action === "accepted") {
      toast("Deal agreed. Arrange the handover in your messages.", { tone: "good" });
      // Straight to the deal. Agreeing and then being left on a list to find
      // it is the gap this whole flow exists to close.
      if (r.dealId) router.push(`/deals/${r.dealId}` as never);
    } else if (action === "declined") {
      toast("Counter declined.", { tone: "info" });
    } else {
      toast(`Offered ${aud(amount ?? 0)}. Back with the seller.`, { tone: "good" });
    }
  };

  const confirmDecline = (o: Offer, asked: number) =>
    Alert.alert(
      "Decline this counter?",
      `The seller wants ${aud(asked)}. Declining closes this offer — you can always make a new one while the card is live.`,
      [
        { text: "Keep it open", style: "cancel" },
        { text: "Decline", style: "destructive", onPress: () => { void reply(o, "declined"); } },
      ],
    );

  return (
    <Screen onRefresh={refresh} back>
      <Txt variant="display" style={{ marginTop: space.sm }}>Offers</Txt>

      {/* ---- waiting on me ------------------------------------------------
          Offers on my own listings. This screen used to show only the offers
          I had MADE, so a seller with people bidding on their cards was told
          "No Offers Yet" — the one message guaranteed to be wrong for them. */}
      {received && received.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          <Txt variant="overline" color={colors.inkFaint}>
            On your listings · {received.filter((o) => o.status === "pending" || o.status === "open").length} waiting
          </Txt>
          <View style={{ gap: space.md, marginTop: space.md }}>
            {received.map((o) => {
              const st = STATUS[o.status] ?? STATUS.open;
              const amt = num(o.amount) ?? 0;
              return (
                <Pressable
                  key={o.offer_id}
                  onPress={() => router.push(`/offers/${o.listing_id}` as never)}
                  style={({ pressed }) => [s.recv, pressed && { opacity: 0.8 }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="h3" numberOfLines={1}>{o.card_name ?? "A card"}</Txt>
                    <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                      {o.buyer_name ? `${o.buyer_name} offered ` : "Offered "}{aud(amt)}
                      {o.asking != null ? ` · asking ${aud(num(o.asking) ?? 0)}` : ""}
                    </Txt>
                  </View>
                  <View style={[s.pill, { backgroundColor: st.bg }]}>
                    <Txt variant="overline" color={st.fg}>{st.label}</Txt>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.inkFaint} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {received && received.length > 0 && (
        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xxl }}>
          Offers you made
        </Txt>
      )}

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
            const sides = counterSides(o);
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
                      <Txt variant="bodySmall" color={colors.ink}>
                        {money(o.status === "countered" ? sides.asked : amt)}
                      </Txt>
                      {ask != null ? ` · asking ${money(ask)}` : ""}
                    </Txt>
                  </View>
                  <Feather name="chevron-right" size={17} color={colors.inkFaint} />
                </Pressable>

                <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
                  {st.body}
                </Txt>

                {o.status === "countered" && (
                  <View style={{ marginTop: space.md, gap: space.sm }}>
                    {/* Both numbers, side by side. A counter is a gap between
                        two figures, and showing only the seller's turns the
                        decision into arithmetic the buyer has to do from
                        memory. */}
                    {sides.yours != null && (
                      <View style={s.gap}>
                        <View style={{ flex: 1 }}>
                          <Txt variant="overline" color={colors.inkFaint}>You offered</Txt>
                          <Txt variant="h3">{money(sides.yours)}</Txt>
                        </View>
                        <Feather name="arrow-right" size={15} color={colors.inkFaint} />
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Txt variant="overline" color={colors.accent}>They want</Txt>
                          <Txt variant="h3" color={colors.accent}>{money(sides.asked)}</Txt>
                        </View>
                      </View>
                    )}

                    {countering === o.offer_id ? (
                      <View style={{ gap: space.sm }}>
                        <View style={s.field}>
                          <Txt variant="h3" color={colors.inkFaint}>A$</Txt>
                          <TextInput
                            value={draft}
                            onChangeText={setDraft}
                            keyboardType="number-pad"
                            autoFocus
                            placeholder={String(Math.round((sides.yours ?? sides.asked)))}
                            placeholderTextColor={colors.inkFaint}
                            style={s.input}
                          />
                        </View>
                        <View style={s.gap}>
                          <Pressable
                            onPress={() => { setCountering(null); setDraft(""); }}
                            style={[s.btn, s.btnGhost]}
                          >
                            <Txt variant="button" color={colors.ink}>Cancel</Txt>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              const v = Number(draft.replace(/[^0-9.]/g, ""));
                              if (!(v > 0)) {
                                toast("Enter an amount.", { tone: "bad" });
                                return;
                              }
                              void reply(o, "countered", v);
                            }}
                            disabled={busy === o.offer_id}
                            style={[s.btn, s.btnDark]}
                          >
                            <Txt variant="button" color={colors.onPrimary}>
                              {busy === o.offer_id ? "Sending" : "Send offer"}
                            </Txt>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => reply(o, "accepted")}
                          disabled={busy === o.offer_id}
                          style={s.take}
                        >
                          <Feather name="check" size={13} color={colors.onPrimary} />
                          <Txt variant="button" color={colors.onPrimary}>
                            {busy === o.offer_id ? "Sending" : `Accept ${money(sides.asked)}`}
                          </Txt>
                        </Pressable>
                        <View style={s.gap}>
                          <Pressable
                            onPress={() => {
                              setCountering(o.offer_id);
                              setDraft(String(Math.round(sides.yours ?? sides.asked)));
                            }}
                            style={[s.btn, s.btnGhost]}
                          >
                            <Feather name="repeat" size={13} color={colors.ink} />
                            <Txt variant="button" color={colors.ink}>Counter back</Txt>
                          </Pressable>
                          <Pressable
                            onPress={() => confirmDecline(o, sides.asked)}
                            style={[s.btn, s.btnGhost]}
                          >
                            <Txt variant="button" color={colors.inkMuted}>Decline</Txt>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
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
  recv: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface,
  },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
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
    height: 44, borderRadius: radius.sm, backgroundColor: colors.ink,
  },
  gap: { flexDirection: "row", alignItems: "center", gap: space.sm },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    height: 42, borderRadius: radius.sm,
  },
  btnGhost: { borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface },
  btnDark: { backgroundColor: colors.ink },
  field: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.md, height: 48,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.outline,
    backgroundColor: colors.field,
  },
  input: { flex: 1, ...type.h2, color: colors.ink, padding: 0 },
});
