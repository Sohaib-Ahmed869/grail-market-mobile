import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { JoinGate } from "../../components/JoinGate";
import { useGuest } from "../../lib/guest";
import { Bone, SkeletonList, SkeletonRow } from "../../components/Skeleton";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import {
  currentShare, getCollection, removeFromCollection, shareCollection,
  stopSharingCollection, type Entry,
} from "../../lib/market";
import { API } from "../../lib/api";
import { GraderBadge } from "../../components/GraderChips";
import { Icon } from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { gradeLabel, variantLabel } from "../../lib/grading";
import { setDraftSeed, clearDraft } from "../../lib/selldraft";
import { PriceChart, RangePicker } from "../../components/PriceChart";
import { collectionHistory } from "../../lib/history";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { colors, radius, space } from "../../theme";
import { aud, convert, money as fxMoney, useFx, type Fx } from "../../lib/fx";

const money = (n: number | null) => aud(n);

/* What a card is WORTH comes from the price store in US dollars. What somebody
 * PAID is what they typed, in Australian ones. Rendering the first with aud()
 * printed a US figure behind an A$ sign — a 39% understatement of every
 * collection — and subtracting the second from it produced a gain that was
 * two currencies wide and meant nothing at all.
 *
 * Values are converted here, once, on the way in. Nothing below this line
 * touches a US figure. */
const AUD = (n: number | null | undefined, fx: Fx | null) =>
  convert(n, { fx, from: "USD" });

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
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  // Read once, guarded. A screen must not be one malformed response away from
  // a red box: `lib/market` now guarantees an array, and this is the second
  // lock on the same door.
  // Browsing is open to anyone; this is not. See JoinGate for why the
  // line is drawn here rather than at the front door.
  const guest = useGuest();
  const router = useRouter();
  const fx = useFx();
  const [data, setData] = useState({
    entries: [] as Entry[], value: 0, cost: 0, spent: 0, gainCards: 0,
    gain: null as number | null, priced: 0,
  });
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  /* The totals in one currency.
   *
   * `cost` used to arrive as whatever the member typed — Australian dollars —
   * while `value` came back in US ones, so this subtracted one from the other.
   * The API now converts `cost` on the way out, so BOTH are US dollars here
   * and both are brought across together. `gain` is computed there for the
   * same reason and comes back null when the two cannot be compared at all. */
  const valueAud = AUD(data.value, fx);
  const costAud = AUD(data.cost, fx);
  const gainAud = data.gain == null ? null : AUD(data.gain, fx);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // null = not shared, string = the live token. Read on focus so turning the
  // link off on one device is reflected on the other.
  const [share, setShare] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setBusy(true);
    getCollection().then((d) => {
      setData(d);
      setBusy(false);
      // Nothing left to edit. Without this the mode survives an empty list and
      // the next card added lands in a screen already in edit mode.
      if (d.entries.length === 0) setEditing(false);
    });
    currentShare().then(setShare);
  }, []);
  useFocusEffect(load);

  /** Take a card out.
   *
   *  Confirmed first, because there is no undo and no trash: the entry carries
   *  what was paid for it, and that is not something the app can reconstruct
   *  once it is gone. The row disappears the moment the server says the row
   *  went, not before — an optimistic removal that then fails leaves the
   *  screen claiming a card is gone when it is still there, and this list is
   *  the one place someone checks what they own. */
  const remove = useCallback((e: Entry) => {
    const held = e.quantity ?? 1;
    Alert.alert(
      "Remove from collection?",
      held > 1
        ? `All ${held} of your ${e.cardName} come out. This cannot be undone.`
        : `${e.cardName} comes out of your collection. This cannot be undone.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const r = await removeFromCollection(e.entryId);
            if (r.ok) {
              // Recomputed rather than subtracted. The totals are the server's
              // arithmetic over quantities and per-card prices, and doing that
              // sum a second time here is how the two drift apart.
              load();
              toast(`${e.cardName} removed.`);
            } else {
              toast(r.message ?? "Could not remove that card.", { tone: "bad" });
              load();
            }
          },
        },
      ],
    );
  }, [load, toast]);

  /** Hand the collection to somebody as a link.
   *
   *  The link is a web page, not a deep link into an app the recipient almost
   *  certainly does not have. It opens in whatever they tapped it in, and if
   *  they DO have GrailMarket the page offers to open there. A share that
   *  requires the other person to install something first is not a share.
   *
   *  Minted once and reused: tapping Share twice gives the same link, so a
   *  copy sent last week keeps working and turning it off kills every copy. */
  const sendLink = useCallback(async () => {
    setMinting(true);
    const token = share ?? await shareCollection();
    setMinting(false);
    if (!token) {
      toast("Could not create a share link. Try again in a moment.", { tone: "bad" });
      return;
    }
    setShare(token);
    const url = `${API}/c/${token}`;
    try {
      await Share.share({
        message: `My card collection on GrailMarket — ${url}`,
        url,                       // iOS uses this; Android reads the message
      });
    } catch {
      // The sheet was dismissed, or there was nothing to share to. Not an error
      // worth a toast — the link exists either way and the next tap reuses it.
    }
  }, [share, toast]);

  /** What a live link can do. Only offered once one exists. */
  const manageShare = useCallback(() => {
    Alert.alert(
      "Your collection link is live",
      "Anyone with the link can see your cards and what they are worth. What you paid is never shared.",
      [
        { text: "Send link", onPress: () => { void sendLink(); } },
        {
          text: "Turn link off",
          style: "destructive",
          onPress: async () => {
            const ok = await stopSharingCollection();
            if (ok) {
              setShare(null);
              toast("Link turned off. Every copy of it stops working.");
            } else {
              toast("Could not turn the link off.", { tone: "bad" });
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [sendLink, toast]);

  const up = (gainAud ?? 0) >= 0;

  /* How many cards the gain actually covers.
   *
   * The server now answers this directly. An older server does not, and its
   * gain sets the cost of every card against a value only the priced ones
   * contribute to — so against one of those, the figure is only trustworthy
   * when every card has a price. Nothing else earns the red arrow. */
  const spans = data.gainCards || (data.priced === entries.length ? entries.length : 0);
  const showGain = gainAud != null && data.cost > 0 && spans > 0;

  if (guest) {
    return (
      <JoinGate
        title="A Collection Needs An Owner"
        why="Create an account and it follows you to any device, valued at today's market rather than what you paid."
        preview={[
          { icon: "price", tone: colors.up, title: "Up A$180 this week",
            body: "Your 24 cards are worth A$3,910", when: "now" },
          { icon: "offer", tone: colors.ink, title: "Offer received",
            body: "A$420 for your Vulpix", when: "3m" },
          { icon: "watchlist", tone: colors.info, title: "Pikachu VMAX moved",
            body: "Up 12% since you followed it", when: "1h" },
        ]}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <FlatList
        {...navScroll}
        data={entries}
        keyExtractor={(e) => e.entryId}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.inkFaint} />}
        contentContainerStyle={[s.list, { paddingBottom: clearance }]}
        ListHeaderComponent={
          <View style={s.head}>
            <View style={s.titleRow}>
              <Txt variant="display" style={{ flex: 1 }}>Collection</Txt>
              {entries.length > 0 && (
                <Pressable
                  onPress={share ? manageShare : sendLink}
                  disabled={minting}
                  hitSlop={10}
                  accessibilityLabel={share ? "Manage your collection link" : "Share your collection"}
                  style={({ pressed }) => [s.share, share && s.shareOn, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="share-2" size={15} color={share ? colors.accent : colors.ink} />
                  <Txt variant="button" color={share ? colors.accent : colors.ink}>
                    {share ? "Shared" : "Share"}
                  </Txt>
                </Pressable>
              )}
              {entries.length > 0 && (
                <Pressable
                  onPress={() => setEditing((v) => !v)}
                  hitSlop={10}
                  style={({ pressed }) => [s.edit, editing && s.editOn, pressed && { opacity: 0.7 }]}
                >
                  <Txt variant="button" color={editing ? colors.onPrimary : colors.ink}>
                    {editing ? "Done" : "Edit"}
                  </Txt>
                </Pressable>
              )}
            </View>
            <View style={s.valueCard}>
              <Txt variant="overline" color={colors.inkFaint}>Live market value</Txt>
              {/* Nothing priced is not a collection worth nothing.
                *
                * A total is a sum OF something, and when every card in it is
                * unpriced there is nothing to sum — "A$0.00" then states the
                * holding is worthless, which is the confident wrong answer in
                * the largest type on the screen. A dash says we do not know,
                * and the line underneath says how many. */}
              <Txt variant="price" style={{ marginTop: 2 }}>
                {entries.length > 0 && data.priced === 0 ? "—" : money(valueAud)}
              </Txt>
              {/* Same rule as the dashboard: without a recorded cost there is
                * no gain to report, and showing the whole value as profit is
                * the most flattering possible lie. */}
              {/* Gain over the cards that have BOTH a price and a cost, and
                * said out loud when that is not all of them.
                *
                * This line once read "A$-11,092 against A$11,092 paid" on a
                * collection of five cards where four had no price yet — the
                * whole cost set against a value only one card contributed to.
                * It looked like a wipeout and was arithmetic on two different
                * sets of cards. */}
              {showGain ? (
                <View style={s.deltaRow}>
                  <Feather name={up ? "trending-up" : "trending-down"} size={13}
                    color={up ? colors.up : colors.down} />
                  <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
                    {up ? "+" : ""}{money(gainAud)} against {money(costAud)} paid
                  </Txt>
                  {spans < entries.length && (
                    <Txt variant="bodySmall" color={colors.inkFaint}>
                      on {spans} of {entries.length}
                    </Txt>
                  )}
                </View>
              ) : (
                <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 4 }}>
                  {data.cost > 0 || data.spent > 0
                    ? "Gain needs a price and a cost on the same card"
                    : "Add what you paid to see gain or loss"}
                </Txt>
              )}
              <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
                {entries.length} card{entries.length === 1 ? "" : "s"}
                {data.priced === 0 && entries.length > 0
                  ? " · none of them priced yet"
                  : data.priced < entries.length
                    ? ` · ${data.priced} priced, ${entries.length - data.priced} we can't value yet`
                    : ""}
              </Txt>
            </View>

            <ValueOverTime />

            <View style={s.links}>
              {/* The app's own icon vocabulary, not Feather's. These four go to
                  screens whose tabs and headers wear these exact glyphs, and a
                  different drawing for the same destination is a different
                  destination as far as anybody scanning the row is concerned. */}
              {[
                { icon: "watchlist" as const, label: "Watchlist", to: "/watchlist" },
                { icon: "selling" as const, label: "My listings", to: "/mylistings" },
                { icon: "offer" as const, label: "My offers", to: "/offers" },
                // Between an accepted offer and a card that has changed hands
                // there is now something to look at, and somewhere to act.
                { icon: "offer" as const, label: "Deals", to: "/deals" },
                { icon: "market" as const, label: "Market", to: "/market" },
              ].map((x) => (
                <Pressable key={x.label} onPress={() => router.push(x.to as any)}
                  style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]}>
                  <Icon name={x.icon} size={17} color={colors.ink} />
                  <Txt variant="bodySmall" center>{x.label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          busy && entries.length === 0 ? (
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
          // Both sides in AUD before they meet. This subtracted a US value
          // from an Australian one and called the difference a profit.
          const rowValue = AUD(item.value, fx);
          const gain = rowValue != null && item.paid != null ? (rowValue - item.paid) * qty : null;
          // Tapping a card starts a listing for it. The collection is where a
          // seller already knows what they own, so making them re-scan a card
          // sitting in front of them is the long way round.
          const sell = () => {
            clearDraft();
            setDraftSeed({
              catalogId: item.catalogId, cardName: item.cardName, setName: item.setName,
              cardNumber: item.cardNumber, imageUrl: item.imageUrl,
              grader: item.grader, grade: item.grade, variant: item.variant,
              marketValue: rowValue,
            });
            router.push("/sell/card");
          };
          return (
            <Pressable
              style={s.row}
              // In edit mode the row stops being a shortcut into the sell flow.
              // A list where the same tap sometimes lists a card and sometimes
              // does nothing is worse than one where it plainly does nothing,
              // and the remove control is right there.
              onPress={editing ? undefined : sell}
              disabled={editing}
            >
              {editing && (
                <Pressable
                  onPress={() => remove(item)}
                  hitSlop={10}
                  style={({ pressed }) => [s.remove, pressed && { opacity: 0.6 }]}
                  accessibilityLabel={`Remove ${item.cardName} from your collection`}
                >
                  <Feather name="minus" size={16} color={colors.onPrimary} />
                </Pressable>
              )}
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
                <Txt variant="h3">{money(rowValue == null ? null : rowValue * qty)}</Txt>
                {gain != null && (
                  <Txt variant="bodySmall" color={gain >= 0 ? colors.up : colors.down}>
                    {gain >= 0 ? "+" : ""}{money(gain)}
                  </Txt>
                )}
                {/* A dash on its own reads as "worth nothing". Say which of
                    the three it is, and where it is the owner's to fix, say
                    the thing they can do — the row already opens the editor. */}
                {item.value == null && item.unpriced && (
                  <Txt
                    variant="bodySmall"
                    color={item.unpriced === "grade" ? colors.accent : colors.inkFaint}
                  >
                    {item.unpriced === "grade"
                      ? "Add the grade"
                      : item.unpriced === "sales"
                        ? "No sales at this grade"
                        : "No price yet"}
                  </Txt>
                )}
                {/* Where the card is up to on the market. "Listed · not sold
                    yet" is the distinction that was missing entirely: a card
                    on the market looked exactly like one sitting in a drawer,
                    and a card that had gone looked the same as both. */}
                {item.market && (
                  <Txt
                    variant="bodySmall"
                    color={item.market.settled ? colors.up : colors.accent}
                    style={{ fontWeight: "600" }}
                  >
                    {item.market.label}
                  </Txt>
                )}
              </View>
              {/* Nothing to tap here while editing, so the chevron that says
                  "this row goes somewhere" would be a lie. */}
              {!editing && (
                <Feather name="chevron-right" size={16} color={colors.inkFaint} />
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

/** What the collection has been worth.
 *
 *  Rendered only once there is something to draw. The value card above already
 *  answers "what is it worth now"; this answers "and is that going anywhere",
 *  which needs at least two observations to be a claim rather than a dot. */
function ValueOverTime() {
  const fx = useFx();
  const [days, setDays] = useState(90);
  const [h, setH] = useState<Awaited<ReturnType<typeof collectionHistory>> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setH(undefined);
    collectionHistory(days).then((r) => { if (alive) setH(r); });
    return () => { alive = false; };
  }, [days]);

  if (h === null) return null;
  if (h === undefined) return <Bone h={210} r={radius.lg} style={{ marginTop: space.lg }} />;
  if (h.points.length < 2) return null;

  const m = h.movement;
  const up = (m?.change ?? 0) >= 0;

  return (
    <View style={s.trend}>
      <View style={s.trendHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="h2">Value Over Time</Txt>
          {m && (
            <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
              {up ? "Up" : "Down"} {Math.abs(m.changePct).toFixed(1)}% over this period
            </Txt>
          )}
        </View>
        <RangePicker value={days} onChange={setDays} />
      </View>
      {/* A sum over `price_points`, so US dollars — while the total above
          this chart is converted. Left alone the two disagreed by the rate. */}
      <PriceChart points={h.points} height={160} format={(n) => fxMoney(n, { fx, from: "USD" })} />
      {h.priced < h.total && (
        <Txt variant="bodySmall" color={colors.inkFaint}>
          {/* The same honesty as the total above it: a line drawn from half
              the collection must say which half. */}
          Based on {h.priced} of your {h.total} cards — the rest have no price
          history yet.
        </Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  trend: {
    marginTop: space.lg, padding: space.lg, gap: space.sm,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  trendHead: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  root: { flex: 1, backgroundColor: colors.washBottom },
  list: { paddingHorizontal: space.xl },
  head: { paddingTop: space.sm, marginBottom: space.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  edit: {
    paddingHorizontal: space.lg, paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface,
  },
  editOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  share: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.md, paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface,
  },
  // Gold, and only here: a live link is the one thing on this screen worth the
  // eye, because it is the one thing other people can see.
  shareOn: { borderColor: colors.accentLine, backgroundColor: colors.accentWash },
  // Red, round and to the LEFT of the artwork, which is where the same control
  // sits in every list on the platform that has one.
  remove: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.down,
  },
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
