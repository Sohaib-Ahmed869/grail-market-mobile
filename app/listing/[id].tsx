import { useEffect, useState } from "react";
import {
  Alert, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet,
  TextInput, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { GraderBadge } from "../../components/GraderChips";
import { VerifiedShield } from "../../components/VerifiedBadge";
import { gradeLabel, variantLabel } from "../../lib/grading";
import { getListing, makeOffer, num, type Listing } from "../../lib/market";
import { useSession } from "../../lib/session";
import { useToast } from "../../components/Toast";
import { openThread } from "../../lib/messages";
import { GateNotice } from "../../components/TierGate";
import { useTier } from "../../lib/tiers";
import { markSold, withdrawListing } from "../../lib/market";
import { Icon } from "../../components/Icon";
import { colors, radius, space, type } from "../../theme";
import { aud } from "../../lib/fx";

const W = Dimensions.get("window").width;
const money = (v: string | number | null | undefined) => {
  const n = num(v);
  return aud(n);
};

function age(iso: string | null): string {
  if (!iso) return "recently";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 7 ? `${d} days ago`
    : d < 60 ? `${Math.floor(d / 7)} weeks ago` : `${Math.floor(d / 30)} months ago`;
}

const DELIVERY: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  pickup: { icon: "map-pin", label: "Pickup in person" },
  post: { icon: "package", label: "Post — tracked" },
  insured: { icon: "shield", label: "Post — tracked and insured" },
};

/** A listing, as a buyer sees it.
 *
 *  Everything on this screen exists to answer one question: is this the card,
 *  and is this a fair price for it. So the market value sits next to the ask
 *  rather than behind a tap, and the photographs come first — ten angles of
 *  the actual card is the only evidence we have that the seller is holding
 *  it. */
export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [l, setL] = useState<Listing | null | undefined>(undefined);
  const [shot, setShot] = useState(0);
  const [offering, setOffering] = useState(false);
  const toast = useToast();
  const { tier } = useTier();

  useEffect(() => { getListing(String(id)).then(setL); }, [id]);

  if (l === undefined) {
    return <Screen back><Loader fill /></Screen>;
  }
  if (l === null) {
    return (
      <Screen back>
        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Feather name="alert-circle" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>Listing Not Available</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            It may have sold, or been withdrawn.
          </Txt>
        </View>
      </Screen>
    );
  }

  // Your own listing is not something you buy. It was showing the buyer's
  // footer to everyone, so a seller opening their own card was offered the
  // chance to make an offer on it.
  const owner = Boolean(session && l.seller_id && l.seller_id === session.userId);

  const market = num(l.market_value);
  const price = num(l.price) ?? 0;
  const gap = market ? Math.round(((price - market) / market) * 100) : null;
  const photos = l.photos ?? [];

  const markThisSold = () =>
    Alert.alert("Mark as sold?", `Confirms ${l.card_name} changed hands. It becomes a confirmed sale in our price history.`, [
      { text: "Not yet", style: "cancel" },
      {
        text: "Sold",
        onPress: async () => {
          await markSold(String(id), price);
          toast("Marked sold. Rate the buyer while it's fresh.", {
            action: { label: "Rate", onPress: () => router.push("/rate") },
          });
          router.back();
        },
      },
    ]);

  const withdrawThis = () =>
    Alert.alert("Withdraw this listing?", "It comes off the market. You can list it again later.", [
      { text: "Keep it up", style: "cancel" },
      {
        text: "Withdraw", style: "destructive",
        onPress: async () => {
          await withdrawListing(String(id));
          toast("Withdrawn.", { tone: "info" });
          router.back();
        },
      },
    ]);

  return (
    <>
      <Screen
        back
        footer={
          // A sold listing has no actions left to offer — but it is exactly
          // where somebody goes when the card never turned up.
          l.status === "sold" ? (
            <Pressable
              style={s.raise}
              onPress={() =>
                router.push({ pathname: "/dispute/new", params: { listingId: String(id) } })
              }
            >
              <Icon name="verified" size={17} color={colors.down} />
              <Txt variant="button" color={colors.down}>Something went wrong with this sale</Txt>
            </Pressable>
          ) : owner ? (
            <>
              <Button
                label="See offers"
                onPress={() => router.push(`/offers/${id}` as any)}
              />
              {/* Two smaller actions side by side rather than a third
                  full-width slab. A stack of identical bars gives every
                  action the same weight, which is how "withdraw" ends up
                  looking as inviting as "sell". */}
              <View style={s.pair}>
                <Pressable style={s.minor} onPress={() => router.push(`/edit/${String(id)}` as any)}>
                  <Icon name="selling" size={17} color={colors.ink} />
                  <Txt variant="button">Edit</Txt>
                </Pressable>
                <Pressable style={s.minor} onPress={() => markThisSold()}>
                  <Icon name="sold" size={17} color={colors.up} />
                  <Txt variant="button" color={colors.up}>Mark sold</Txt>
                </Pressable>
                <Pressable style={s.minor} onPress={() => withdrawThis()}>
                  <Icon name="selling" size={17} color={colors.inkMuted} />
                  <Txt variant="button" color={colors.inkMuted}>Withdraw</Txt>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Button
                label={session ? `Buy at ${money(price)}` : "Sign up to buy"}
                onPress={() => setOffering(true)}
              />
              <View style={s.pair}>
                <Pressable style={s.minor} onPress={() => setOffering(true)}>
                  <Icon name="offer" size={17} color={colors.ink} />
                  <Txt variant="button">Make An Offer</Txt>
                </Pressable>
                <Pressable
                  style={s.minor}
                  onPress={async () => {
                    if (!session) return router.push("/signup");
                    const r = await openThread(String(id));
                    if (r.threadId) router.push(`/messages/${r.threadId}` as any);
                    else toast(r.message ?? "Could not open that conversation.", { tone: "bad" });
                  }}
                >
                  <Icon name="messages" size={17} color={colors.ink} />
                  <Txt variant="button">Message</Txt>
                </Pressable>
              </View>
            </>
          )
        }
      >
        {photos.length > 0 ? (
          <>
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setShot(Math.round(e.nativeEvent.contentOffset.x / (W - space.xl * 2)))}
              style={s.gallery}
            >
              {photos.map((p: any) => (
                <Image key={p.angle} source={{ uri: p.url }} style={s.big} resizeMode="cover" />
              ))}
            </ScrollView>
            <View style={s.dots}>
              {photos.map((p: any, i: number) => (
                <View key={p.angle} style={[s.dot, i === shot && s.dotOn]} />
              ))}
            </View>
          </>
        ) : l.image_url ? (
          <Image source={{ uri: l.image_url }} style={s.big} resizeMode="contain" />
        ) : null}

        <View style={s.badges}>
          {l.photo_verified && (
            <View style={[s.badge, { backgroundColor: colors.upWash }]}>
              <Feather name="camera" size={10} color={colors.up} />
              <Txt variant="overline" color={colors.up} style={s.badgeTxt}>Photo verified · 10 angles</Txt>
            </View>
          )}
          <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
          {l.variant && l.variant !== "normal" && (
            <View style={[s.badge, { backgroundColor: colors.surfaceSunk }]}>
              <Txt variant="overline" color={colors.inkMuted} style={s.badgeTxt}>
                {variantLabel(l.variant)}
              </Txt>
            </View>
          )}
        </View>

        <Txt variant="display" style={{ marginTop: space.sm }}>{l.card_name}</Txt>
        <Txt variant="body" color={colors.inkMuted}>
          {[l.set_name, l.card_number && `#${l.card_number}`].filter(Boolean).join(" · ")}
        </Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
          {l.grader
            ? `${l.grader} · ${gradeLabel(l.grader, l.grade)}`
            : `Raw · ${gradeLabel("RAW", l.grade)}`}
        </Txt>
        {l.cert_number && (
          <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: 2 }}>
            Cert {l.cert_number}
          </Txt>
        )}

        <View style={s.priceBlock}>
          <View style={{ flex: 1 }}>
            <Txt variant="overline" color={colors.inkFaint}>Asking</Txt>
            <Txt variant="price">{money(price)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="overline" color={colors.inkFaint}>Market value</Txt>
            <Txt variant="h2" color={colors.inkMuted}>{money(market)}</Txt>
            {gap != null && (
              <Txt variant="bodySmall" color={gap > 0 ? colors.down : gap < 0 ? colors.up : colors.inkMuted}>
                {gap === 0 ? "at market" : `${Math.abs(gap)}% ${gap > 0 ? "above" : "below"}`}
              </Txt>
            )}
          </View>
        </View>

        {owner && (
          <View style={s.yours}>
            <Icon name="verified" size={15} color={colors.accent} filled />
            <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>
              This is your listing.{" "}
              {typeof (l as { views?: number }).views === "number"
                ? `${(l as { views?: number }).views} view${(l as { views?: number }).views === 1 ? "" : "s"}`
                : ""}
              {typeof (l as { saves?: number }).saves === "number"
                ? ` · ${(l as { saves?: number }).saves} saved` : ""}
            </Txt>
          </View>
        )}

        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>Listed</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted}>
          {age(l.live_at)}{l.suburb ? ` · ${l.suburb}` : ""}
        </Txt>

        {l.condition_note && (
          <>
            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
              From The Seller
            </Txt>
            <Txt variant="body" color={colors.inkMuted} style={{ marginTop: 2 }}>{l.condition_note}</Txt>
          </>
        )}

        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
          Getting It To You
        </Txt>
        {(l.delivery ?? []).map((d: string) => {
          const x = DELIVERY[d];
          if (!x) return null;
          return (
            <View key={d} style={s.deliveryRow}>
              <Feather name={x.icon} size={14} color={colors.inkMuted} />
              <Txt variant="bodySmall" color={colors.inkMuted}>{x.label}</Txt>
            </View>
          );
        })}

        {/* The badge is now a door. "Verified seller" with nothing behind it
          * asks for trust and offers nothing to check it against. */}
        <Pressable
          onPress={() => l.seller_id && !owner && router.push(`/seller/${l.seller_id}` as any)}
          disabled={!l.seller_id || owner}
          style={({ pressed }) => [s.seller, pressed && { opacity: 0.7 }]}
        >
          <VerifiedShield size={30} />
          <View style={{ flex: 1 }}>
            <View style={s.sellerName}>
              <Txt variant="h3">Verified seller</Txt>
            </View>
            <Txt variant="bodySmall" color={colors.inkMuted}>
              Government ID checked before listing
            </Txt>
            {l.seller_id && (
              <Txt variant="bodySmall" color={colors.ink} style={{ marginTop: 2 }}>
                About this seller
              </Txt>
            )}
          </View>
          {l.seller_id && <Feather name="chevron-right" size={18} color={colors.inkFaint} />}
        </Pressable>

        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            Payment is arranged directly between the two of you — we don't hold the money.
            Meet in a public place, or use tracked and insured post.
          </Note>
        </View>
      </Screen>

      <OfferSheet
        open={offering}
        onClose={() => setOffering(false)}
        listingId={String(id)}
        asking={price}
        market={market}
        signedIn={Boolean(session)}
        gate={tier?.gates.offer ?? null}
        have={tier?.have ?? null}
        onNeedsSignIn={() => { setOffering(false); router.push("/signup"); }}
        onHasAccount={() => { setOffering(false); router.push("/signin"); }}
      />
    </>
  );
}

/** Make an offer.
 *
 *  The number is read against BOTH the ask and the market as it is typed. An
 *  offer 20% under the ask can still be over the odds, and a buyer who only
 *  sees the discount has no way to know that. */
function OfferSheet({
  open, onClose, listingId, asking, market, signedIn, gate, have, onNeedsSignIn, onHasAccount,
}: {
  open: boolean; onClose: () => void; listingId: string;
  asking: number; market: number | null; signedIn: boolean;
  gate: import("../../lib/tiers").Gate | null;
  have: import("../../lib/tiers").Tier["have"] | null;
  onNeedsSignIn: () => void; onHasAccount: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(Math.round(asking)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const n = Number(amount.replace(/[^\d.]/g, ""));
  const vsAsk = asking ? Math.round(((n - asking) / asking) * 100) : null;
  const vsMarket = market ? Math.round(((n - market) / market) * 100) : null;

  const send = async () => {
    setBusy(true);
    const r = await makeOffer(listingId, n, note.trim() || undefined);
    setBusy(false);
    if (r.error) toast(r.message ?? "That offer could not be sent.", { tone: "bad" });
    else setSent(true);
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={s.sheet}>
        {!signedIn ? (
          <>
            <View style={s.grab} />
            <View style={s.joinIcon}>
              <Feather name="shield" size={22} color={colors.accent} />
            </View>
            <Txt variant="h1" center style={{ marginTop: space.md }}>
              Offers come from verified members
            </Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
              Everyone who buys or sells here has passed a government ID check. That is
              the whole reason an offer on this card is worth answering — and why we ask
              before you make one.
            </Txt>
            <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: space.md }}>
              Browsing and search stay open with no account.
            </Txt>
            <Button label="Create an account" onPress={onNeedsSignIn} style={{ marginTop: space.xl }} />
            <Button label="I already have one" kind="ghost" onPress={onHasAccount} />
            <Button label="Keep looking" kind="ghost" onPress={onClose} />
          </>
        ) : sent ? (
          <>
            <View style={s.sheetTick}><Feather name="check" size={20} color={colors.onPrimary} /></View>
            <Txt variant="h1" center style={{ marginTop: space.md }}>Offer sent</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
              The seller can accept, counter or decline. You'll be notified either way.
            </Txt>
            <Button label="Done" onPress={onClose} style={{ marginTop: space.xl }} />
          </>
        ) : (
          <>
            <View style={s.grab} />
            <Txt variant="h1">Make An Offer</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
              Asking {money(asking)}{market ? ` · market ${money(market)}` : ""}
            </Txt>

            <View style={s.amount}>
              <Txt variant="h1" color={colors.inkFaint}>A$</Txt>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                selectTextOnFocus
                style={s.amountInput}
                placeholderTextColor={colors.inkFaint}
              />
            </View>

            <View style={s.reading}>
              {vsAsk != null && (
                <Txt variant="bodySmall" color={colors.inkMuted}>
                  {vsAsk === 0 ? "Full asking price" : `${Math.abs(vsAsk)}% ${vsAsk > 0 ? "above" : "below"} asking`}
                </Txt>
              )}
              {vsMarket != null && (
                <Txt variant="bodySmall" color={vsMarket > 0 ? colors.down : colors.up}>
                  · {Math.abs(vsMarket)}% {vsMarket > 0 ? "above" : "below"} market
                </Txt>
              )}
            </View>

            {gate && !gate.ok && (
              <View style={{ marginTop: space.lg }}>
                <GateNotice gate={gate} action="Making an offer" have={have ?? undefined} onDone={onClose} />
              </View>
            )}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything the seller should know (optional)"
              placeholderTextColor={colors.inkFaint}
              multiline
              style={s.note}
            />

            <Button
              label={busy ? "Sending" : "Send offer"}
              onPress={send}
              loading={busy}
              disabled={!(n > 0) || Boolean(gate && !gate.ok)}
              style={{ marginTop: space.lg }}
            />
            <Button label="Cancel" kind="ghost" onPress={onClose} />
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  gallery: { marginHorizontal: -space.xl, marginTop: space.sm },
  big: {
    width: W - space.xl * 2, height: 380, borderRadius: radius.lg,
    marginHorizontal: space.xl, backgroundColor: colors.surfaceSunk,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: space.sm },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.ink, width: 14 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: space.lg },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeTxt: { fontSize: 11.5, letterSpacing: 0.1 },
  priceBlock: {
    flexDirection: "row", gap: space.lg, marginTop: space.lg, padding: space.lg,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 6 },
  seller: {
    flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xl,
    paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.line,
  },
  sellerName: { flexDirection: "row", alignItems: "center", gap: 5 },
  pair: { flexDirection: "row", gap: space.sm },
  raise: {
    height: 52, flexDirection: "row", gap: space.sm,
    alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: colors.downWash,
  },
  minor: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    height: 48, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.fieldLine, backgroundColor: colors.surface,
  },
  yours: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    marginTop: space.lg, padding: space.md,
    borderRadius: radius.md, backgroundColor: colors.accentWash,
    borderWidth: 1, borderColor: colors.accentLine,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
  scrim: { flex: 1, backgroundColor: "rgba(11,22,34,0.4)" },
  sheet: {
    backgroundColor: colors.surface, padding: space.xl, paddingBottom: space.xxxl,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  joinIcon: {
    width: 52, height: 52, borderRadius: 26, alignSelf: "center",
    alignItems: "center", justifyContent: "center", backgroundColor: colors.accentWash,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center", marginBottom: space.lg },
  sheetTick: {
    width: 44, height: 44, borderRadius: 22, alignSelf: "center",
    backgroundColor: colors.up, alignItems: "center", justifyContent: "center",
  },
  amount: {
    flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg,
    paddingBottom: space.sm, borderBottomWidth: 2, borderBottomColor: colors.ink,
  },
  // fontVariant on the token is readonly; TextInput wants a mutable array.
  amountInput: {
    flex: 1, ...type.price, fontVariant: ["tabular-nums" as const],
    color: colors.ink, paddingVertical: 0,
  },
  reading: { flexDirection: "row", gap: 4, marginTop: space.sm, flexWrap: "wrap" },
  note: {
    ...type.body, color: colors.ink, marginTop: space.lg, padding: space.md, minHeight: 72,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field, textAlignVertical: "top",
  },
});
