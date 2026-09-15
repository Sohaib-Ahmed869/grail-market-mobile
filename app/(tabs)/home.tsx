import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline } from "react-native-svg";
import { Lockup } from "../../components/Brand";
import { PageWash, WASH } from "../../components/PageWash";
import { Avatar } from "../../components/Avatar";
import { Txt } from "../../components/Text";
import { Bone } from "../../components/Skeleton";
import { Icon, type IconName } from "../../components/Icon";
import { MarketLens, dollars, lens, lh } from "../../components/MarketLens";
import { LocalExchange, NEARBY_KM } from "../../components/LocalExchange";
import { useTabBarClearance } from "../../components/TabBar";
import { unreadCount } from "../../lib/messages";
import { unreadNotifications } from "../../lib/notifications";
import { useSession } from "../../lib/session";
import { useGuest } from "../../lib/guest";
import { browse, type Listing } from "../../lib/market";
import { marketPulse, type Pulse } from "../../lib/cardmarket";
import { cardCandles } from "../../lib/cards";
import { follow } from "../../lib/watchlist";
import { artFor, isLoadable } from "../../lib/art";
import { useFx } from "../../lib/fx";
import { useViewerPlace } from "../../lib/location";
import { useNavScroll } from "../../lib/navbar";
import { fonts } from "../../theme";

const GUTTER = 20;

/** The two games the collection tiles open on. Each tile carries one card
 *  from its game, found the same way for both — so either both have a
 *  picture or neither does, never one of each. */
const COLLECT = [
  { id: "pokemon", kicker: "THE ORIGINAL OBSESSION", title: "Pokémon",
    wash: ["#E3E2EF", "#EFEFF3", "#F4F4F4"] as const },
  { id: "mtg", kicker: "A DIFFERENT KIND OF MAGIC", title: "Magic: The Gathering",
    wash: ["#D8E5E1", "#E6EDEA", "#F1F3F1"] as const },
];

type Spot = {
  pulse: Pulse;
  /** The store's daily RAW closes for this card, last 30 days, US dollars.
   *  Null when it has none, and then there is no lens. */
  closes: { day: string; price: number }[] | null;
};

const listingArt = (l: Listing) => [l.photos?.[0]?.url, l.image_url].find((u) => isLoadable(u)) ?? null;

/** Home.
 *
 *  An editorial front page for a local market, top to bottom: one card worth
 *  looking at, the evidence for its price, what else is moving, what is for
 *  sale near you, and the way into the catalogue.
 *
 *  Every figure is real. The spotlight and the lens are one card and one
 *  number — the store's daily raw close — and that card is left out of the
 *  movers rail, so no card is ever printed at two prices on this screen.
 */
export default function Home() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const session = useSession();
  const guest = useGuest();
  const userId = session?.userId ?? "";
  const signedIn = Boolean(session) && !guest;
  const router = useRouter();
  const fx = useFx();
  const where = useViewerPlace();

  const [pulse, setPulse] = useState<Pulse[] | undefined>(undefined);
  const [spot, setSpot] = useState<Spot | null | undefined>(undefined);
  const [nearby, setNearby] = useState<Listing[] | undefined>(undefined);
  const [collectArt, setCollectArt] = useState<Record<string, string> | null>(null);
  const [unread, setUnread] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [following, setFollowing] = useState(false);

  const point = where.state.status === "ready" ? where.state.place : null;

  const loadNearby = useCallback(async () => {
    const q = point
      ? { lat: point.lat, lon: point.lon, sort: "nearest", within: NEARBY_KM }
      : { sort: "newest" };
    const rows = (await browse(q)).listings.slice(0, 3);
    // A listing saved without a picture still names its card, and the
    // catalogue has that card's art for the games whose ids say which set.
    const bare = rows.filter((l) => !listingArt(l) && l.catalog_id).map((l) => l.catalog_id!);
    const art = bare.length ? await artFor(bare) : new Map<string, string>();
    setNearby(rows.map((l) =>
      !listingArt(l) && l.catalog_id && art.has(l.catalog_id) ? { ...l, image_url: art.get(l.catalog_id)! } : l));
  }, [point?.lat, point?.lon]);

  const loadArt = useCallback(async (p: Pulse[] | undefined) => {
    const found = await Promise.all(COLLECT.map(async (g) => {
      const fromPulse = p?.find((x) => x.game === g.id && isLoadable(x.imageUrl))?.imageUrl;
      if (fromPulse) return [g.id, fromPulse] as const;
      const r = await browse({ game: g.id, sort: "newest" });
      return [g.id, r.listings.map(listingArt).find(Boolean) ?? null] as const;
    }));
    // Both or neither — see COLLECT.
    setCollectArt(found.every(([, u]) => u) ? Object.fromEntries(found) as Record<string, string> : null);
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        marketPulse().then((r) => { setPulse(r); return loadArt(r); }),
        loadNearby(),
        signedIn ? unreadCount().then(setUnread) : null,
        signedIn ? unreadNotifications().then(setAlerts) : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadNearby, loadArt, signedIn]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    const badges = () => {
      if (!userId || AppState.currentState !== "active") return;
      unreadCount().then((n) => { if (alive) setUnread(n); });
      unreadNotifications().then((n) => { if (alive) setAlerts(n); });
    };
    badges();
    const timer = setInterval(badges, 8000);
    marketPulse().then((r) => { if (alive) { setPulse(r); void loadArt(r); } });
    return () => { alive = false; clearInterval(timer); };
  }, [userId, loadArt]));

  // Distances follow the place: a location switched on reloads the panel.
  useEffect(() => {
    if (where.state.status === "loading") return;
    setNearby(undefined);
    void loadNearby();
  }, [loadNearby, where.state.status]);

  /* The spotlight: the biggest mover we can also show the evidence for.
   *
   * The top few movers with a picture are checked for a daily RAW series in
   * the store ('MARKET' — the feed's own ungraded price, recorded daily). The
   * first that has one is the spotlight, and its price is that series' last
   * close. A graded series is not used: the panel says ungraded, and a PSA 10
   * line under that word would be the wrong card's price in all but name. */
  useEffect(() => {
    if (!pulse) return;
    let alive = true;
    const pictured = pulse.filter((p) => p.cardId && isLoadable(p.imageUrl) && p.price != null);
    if (!pictured.length) { setSpot(pulse.length ? { pulse: pulse[0]!, closes: null } : null); return; }
    Promise.all(pictured.slice(0, 5).map((p) =>
      cardCandles(p.cardId!, "D").then((r) => ({
        p,
        closes: r.grader === "MARKET"
          ? r.candles.filter((c) => c.day >= daysAgo(30)).map((c) => ({ day: c.day, price: c.close }))
          : [],
      })),
    )).then((rows) => {
      if (!alive) return;
      const hit = rows.find((x) => x.closes.length >= 2);
      setSpot(hit ? { pulse: hit.p, closes: hit.closes } : { pulse: pictured[0]!, closes: null });
    });
    return () => { alive = false; };
  }, [pulse]);

  const movers = useMemo(
    () => (pulse ?? [])
      .filter((p) => p.price != null && (p.cardId ?? p.label) !== (spot?.pulse.cardId ?? spot?.pulse.label))
      .slice(0, 8),
    [pulse, spot],
  );
  // The card that fans behind the spotlight: the next mover with a picture.
  const backArt = movers.find((p) => isLoadable(p.imageUrl))?.imageUrl ?? null;

  const followSpot = async () => {
    if (!signedIn) { router.push("/signup"); return; }
    if (!spot || following) return;
    setFollowing(true);
    const r = await follow({
      catalogId: spot.pulse.cardId, cardName: spot.pulse.label,
      setName: spot.pulse.setName, imageUrl: spot.pulse.imageUrl,
    }).catch(() => null);
    if (!r || r.error) setFollowing(false);
  };

  const openCard = (p: Pulse) =>
    p.cardId
      ? router.push(`/card/${p.cardId}` as any)
      : router.push({ pathname: "/market", params: { q: p.label } });

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <PageWash />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance + 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={lens.inkFaint} />}
        {...navScroll}
      >
        <SafeAreaView edges={["top"]}>
          {/* ---- masthead -------------------------------------------------- */}
          <View style={s.mast}>
            <Lockup width={124} />
            <View style={s.mastRight}>
              {signedIn && (
                <>
                  <Round icon="notify" count={alerts} label="Notifications" onPress={() => router.push("/notifications")} />
                  <Round icon="messages" count={unread} label="Messages" onPress={() => router.push("/messages")} />
                </>
              )}
              <Pressable
                onPress={() => router.push(signedIn ? "/(tabs)/profile" : "/signup")}
                accessibilityRole="button" accessibilityLabel={signedIn ? "Your profile" : "Create an account"}
                style={({ pressed }) => [s.avatar, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <Avatar name={session?.name ?? "Guest"} id={session?.avatar} size={38} ring />
              </Pressable>
            </View>
          </View>

          <View style={s.kickerRow}>
            <Txt style={s.kicker} numberOfLines={1}>THE COLLECTOR’S MARKET</Txt>
            <PlaceChip where={where} />
          </View>

          <Txt style={s.headline}>Discover your next grail.</Txt>

          {/* ---- search ---------------------------------------------------- */}
          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            style={({ pressed }) => [s.search, pressed && { opacity: 0.85 }]}
            accessibilityRole="search"
          >
            <Feather name="search" size={18} color={lens.ink} />
            <Txt style={s.searchText} numberOfLines={1}>Search a card or set</Txt>
            <Feather name="arrow-right" size={17} color={lens.ink} />
          </Pressable>

          {/* ---- spotlight ------------------------------------------------- */}
          <View style={s.gutter}>
            {spot === undefined ? (
              <Bone h={390} r={24} style={{ marginTop: 16 }} />
            ) : spot === null ? null : (
              <Spotlight spot={spot} backArt={backArt} fx={fx} onOpen={() => openCard(spot.pulse)} />
            )}
          </View>

          {/* ---- market lens ----------------------------------------------- */}
          {spot?.closes && (
            <View style={[s.gutter, { marginTop: 18 }]}>
              <MarketLens
                name={spot.pulse.label}
                closes={spot.closes}
                fx={fx}
                condition={spot.pulse.condition}
                printing={spot.pulse.printing}
                following={following}
                onFollow={followSpot}
                onOpen={() => openCard(spot.pulse)}
              />
            </View>
          )}

          {/* ---- moving this week ------------------------------------------ */}
          <Heading title="Moving this week" action={{ label: "All prices", onPress: () => router.push("/movers") }} />
          {pulse === undefined ? (
            <View style={[s.gutter, { flexDirection: "row", gap: 12 }]}>
              <Bone w={164} h={220} r={20} />
              <Bone w={164} h={220} r={20} />
            </View>
          ) : movers.length === 0 ? (
            <Txt style={[s.note, s.gutter]}>Prices held steady this week, or too few cards sold to tell.</Txt>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.rail}
                style={{ flexGrow: 0 }}
              >
                {movers.map((p) => (
                  <MoverTile key={p.cardId ?? p.label} p={p} fx={fx} onPress={() => openCard(p)} />
                ))}
              </ScrollView>
              <Txt style={[s.note, s.gutter]}>Raw prices · 7-day change · {dollars(1, fx).ccy}</Txt>
            </>
          )}

          {/* ---- local exchange -------------------------------------------- */}
          <View style={[s.gutter, { marginTop: 26 }]}>
            <LocalExchange place={where.state} listings={nearby} onAskLocation={where.ask} />
          </View>

          {/* ---- what do you collect --------------------------------------- */}
          <Heading
            title="What do you collect?"
            action={{ label: "Browse all", onPress: () => router.push("/(tabs)/search") }}
          />
          <View style={[s.gutter, { gap: 12 }]}>
            {COLLECT.map((g, i) => (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: "/(tabs)/search", params: { game: g.id } })}
                style={({ pressed }) => [s.collect, pressed && { transform: [{ scale: 0.99 }] }]}
              >
                <LinearGradient colors={g.wash} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
                <View style={{ flex: 1, paddingRight: collectArt ? 86 : 0 }}>
                  <Txt style={s.collectKicker} numberOfLines={1}>{g.kicker}</Txt>
                  <Txt style={s.collectTitle} numberOfLines={2}>{g.title}</Txt>
                  <View style={s.collectLink}>
                    <Txt style={s.collectLinkText}>Explore the collection</Txt>
                    <Feather name="arrow-up-right" size={13} color={lens.goldText} />
                  </View>
                </View>
                {collectArt?.[g.id] && (
                  <View style={[s.collectArt, { transform: [{ rotate: i === 0 ? "5deg" : "8deg" }] }]}>
                    <Image source={{ uri: collectArt[g.id] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

// ---- pieces -----------------------------------------------------------------

function Spotlight({
  spot, backArt, fx, onOpen,
}: { spot: Spot; backArt: string | null; fx: ReturnType<typeof useFx>; onOpen: () => void }) {
  const p = spot.pulse;
  // One number: the lens's last close when there is a lens, the feed's price
  // when there is not. Both are the raw market price; they are never shown
  // side by side.
  const usd = spot.closes?.length ? spot.closes[spot.closes.length - 1]!.price : p.price;
  const price = dollars(usd, fx);
  const facts = [
    p.condition,
    spot.closes?.length ? `${spot.closes.length} days` : "Market price",
    price.ccy,
  ].filter(Boolean).join(" · ");

  return (
    <View style={s.spot}>
      <LinearGradient
        colors={["#ECE8F6", "#F3F3F6", "#E4F1EC", "#CDEAE2"]}
        locations={[0, 0.38, 0.72, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(215,185,138,0)", "rgba(215,185,138,0.85)", "rgba(215,185,138,0)"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.rim}
      />

      <View style={s.fan} pointerEvents="none">
        {backArt && (
          <View style={[s.fanCard, s.fanBack]}>
            <Image source={{ uri: backArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        )}
        <View style={[s.fanCard, s.fanFront, !backArt && s.fanAlone]}>
          {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        </View>
      </View>

      <Txt style={s.spotKicker}>IN THE SPOTLIGHT</Txt>
      <Txt style={s.spotName} numberOfLines={1}>{p.label}</Txt>
      {p.setName ? (
        <Txt style={s.spotSet} numberOfLines={1}>{[p.setName, p.printing].filter(Boolean).join(" · ")}</Txt>
      ) : null}

      <View style={s.spotPriceRow}>
        <Txt style={s.spotPrice} numberOfLines={1}>{price.text}</Txt>
        <View style={{ alignItems: "flex-end", flexShrink: 1, minWidth: 0 }}>
          <Txt style={s.spotRaw}>RAW · UNGRADED</Txt>
          <Txt style={s.spotFacts} numberOfLines={1}>{facts}</Txt>
        </View>
      </View>

      <Pressable onPress={onOpen} style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 }]}>
        <LinearGradient colors={["#51657A", "#2C3C4D", "#1C2835"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <Txt style={s.ctaText}>See the evidence</Txt>
        <Feather name="arrow-right" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function MoverTile({ p, fx, onPress }: { p: Pulse; fx: ReturnType<typeof useFx>; onPress: () => void }) {
  const ch = p.change7d;
  const up = (ch ?? 0) >= 0;
  const art = isLoadable(p.imageUrl) ? p.imageUrl! : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={s.tileTop}>
        <LinearGradient colors={["#E7E5F2", "#E1EBE8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[s.tileArt, art && s.framed]}>
          {art ? <Image source={{ uri: art }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        </View>
        <Spark points={p.spark} color={up ? lens.upLine : lens.downLine} />
      </View>
      <View style={s.tileBody}>
        <Txt style={s.tileName} numberOfLines={1}>{p.label}</Txt>
        <Txt style={s.tileSet} numberOfLines={1}>
          {[p.setName, p.condition ?? "RAW"].filter(Boolean).join(" · ")}
        </Txt>
        <View style={s.tileFoot}>
          <Txt style={s.tilePrice} numberOfLines={1}>{dollars(p.price, fx).text}</Txt>
          {ch != null && (
            <View style={[s.chg, { backgroundColor: up ? lens.upWash : lens.downWash }]}>
              <Feather name={up ? "arrow-up-right" : "arrow-down-right"} size={10} color={up ? lens.up : lens.down} />
              <Txt style={[s.chgText, { color: up ? lens.up : lens.down }]}>
                {up ? "+" : "−"}{Math.abs(ch).toFixed(1)}%
              </Txt>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const SPARK_W = 60;
const SPARK_H = 34;
const SPARK_PAD = 3;

/** The week's shape, no axes, drawn inside its own box with a margin so the
 *  stroke never touches the tile's edge. Only the feed's own readings; fewer
 *  than two is no line at all. */
function Spark({ points, color }: { points: number[]; color: string }) {
  const v = points.filter((n) => Number.isFinite(n)).slice(-12);
  if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v);
  const iw = SPARK_W - SPARK_PAD * 2, ih = SPARK_H - SPARK_PAD * 2;
  const pts = v.map((n, i) => {
    const x = SPARK_PAD + (i / (v.length - 1)) * iw;
    // A flat week draws through the middle rather than along the floor.
    const y = SPARK_PAD + (hi > lo ? (1 - (n - lo) / (hi - lo)) * ih : ih / 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <View style={s.spark}>
      <Svg width={SPARK_W} height={SPARK_H}>
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function PlaceChip({ where }: { where: ReturnType<typeof useViewerPlace> }) {
  const st = where.state;
  if (st.status === "unavailable") return null;
  const label =
    st.status === "ready" ? st.place.label ?? "Near you"
    : st.status === "loading" ? "Locating…"
    : st.status === "denied" ? "Location off"
    : "Set location";
  return (
    <Pressable
      onPress={st.status === "ready" ? where.refresh : where.ask}
      hitSlop={8}
      style={({ pressed }) => [s.place, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={st.status === "ready" ? `Location: ${label}. Tap to update` : "Use my location"}
    >
      <Feather name="map-pin" size={13} color={lens.ink} />
      <Txt style={s.placeText} numberOfLines={1}>{label}</Txt>
      <Feather name="chevron-right" size={13} color={lens.inkSoft} />
    </Pressable>
  );
}

function Heading({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.heading}>
      <Txt style={s.headingText} numberOfLines={1}>{title}</Txt>
      {action && (
        <Pressable onPress={action.onPress} style={({ pressed }) => [s.outline, pressed && { opacity: 0.7 }]}>
          <Txt style={s.outlineText}>{action.label}</Txt>
        </Pressable>
      )}
    </View>
  );
}

function Round({
  icon, count, label, onPress,
}: { icon: IconName; count: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.round} accessibilityLabel={label} hitSlop={4}>
      <Icon name={icon} size={17} color={lens.ink} filled={count > 0} />
      {count > 0 && (
        <View style={s.badge}>
          <Txt style={s.badgeText}>{count > 9 ? "9+" : count}</Txt>
        </View>
      )}
    </Pressable>
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (n - 1))).toISOString().slice(0, 10);
}

// Sizes are the reference mockups converted to points (their images are
// about 1.7× the screen), and every text style carries its own line height —
// see `lh` in MarketLens.
const s = StyleSheet.create({
  // The app's wash, not flat paper — see PageWash. The colour here only shows
  // for the instant before the gradient draws.
  root: { flex: 1, backgroundColor: WASH.mist },
  gutter: { paddingHorizontal: GUTTER },

  mast: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: GUTTER, paddingTop: 6 },
  mastRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    borderRadius: 22,
    shadowColor: "#0B1622", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  round: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(28,39,51,0.06)",
  },
  badge: {
    position: "absolute", top: 1, right: 1, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3,
    alignItems: "center", justifyContent: "center", backgroundColor: lens.down, borderWidth: 1.5, borderColor: lens.paper,
  },
  badgeText: { fontFamily: fonts.semi, fontSize: 9, lineHeight: 11, color: "#FFFFFF" },

  kickerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    paddingHorizontal: GUTTER, marginTop: 14,
  },
  kicker: { fontFamily: fonts.semi, fontSize: 11, lineHeight: lh(11), letterSpacing: 1.5, color: lens.goldText, flexShrink: 1 },
  place: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 150 },
  placeText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: lh(13), color: lens.ink, flexShrink: 1 },

  headline: {
    fontFamily: fonts.semi, fontSize: 32, lineHeight: lh(32), letterSpacing: -1, color: lens.ink,
    paddingHorizontal: GUTTER, marginTop: 14, paddingRight: 70,
  },

  search: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 46,
    marginHorizontal: GUTTER, marginTop: 14, paddingHorizontal: 14,
    borderRadius: 13, backgroundColor: "#FCFCFB", borderWidth: 1, borderColor: "#C3C9CD",
  },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: lh(14.5), color: lens.inkFaint },

  // ---- spotlight
  spot: {
    marginTop: 16, borderRadius: 24, overflow: "hidden", paddingHorizontal: 18, paddingBottom: 16,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.95)", backgroundColor: "#EEF0F2",
    shadowColor: "#0B1622", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  rim: { position: "absolute", top: 0, left: 40, right: 40, height: 1 },
  fan: { height: 196, marginTop: 14, marginHorizontal: -18 },
  fanCard: {
    position: "absolute", width: 112, height: 156, borderRadius: 7, overflow: "hidden", backgroundColor: "#D8DDE3",
    shadowColor: "#0B1622", shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
  },
  fanBack: { left: "24%", top: 22, transform: [{ rotate: "-12deg" }] },
  fanFront: { left: "42%", top: 6, transform: [{ rotate: "9deg" }], borderWidth: 3, borderColor: "#14181D" },
  fanAlone: { left: "35%" },
  spotKicker: { fontFamily: fonts.semi, fontSize: 11, lineHeight: lh(11), letterSpacing: 1.6, color: lens.inkSoft, textAlign: "center", marginTop: 6 },
  spotName: { fontFamily: fonts.semi, fontSize: 22, lineHeight: lh(22), letterSpacing: -0.4, color: lens.ink, textAlign: "center", marginTop: 2 },
  spotSet: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, textAlign: "center" },
  spotPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 },
  spotPrice: {
    fontFamily: fonts.semi, fontSize: 40, lineHeight: lh(40), letterSpacing: -1.4, color: lens.ink,
    fontVariant: ["tabular-nums"], flexShrink: 0,
  },
  spotRaw: { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: lh(10.5), letterSpacing: 0.6, color: lens.goldText },
  spotFacts: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 2 },
  cta: {
    height: 46, marginTop: 12, borderRadius: 14, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "#0B1622", shadowOpacity: 0.26, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { fontFamily: fonts.semi, fontSize: 14.5, lineHeight: lh(14.5), color: "#FFFFFF" },

  // ---- headings
  heading: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    paddingHorizontal: GUTTER, marginTop: 28, marginBottom: 12,
  },
  headingText: { fontFamily: fonts.semi, fontSize: 21, lineHeight: lh(21), letterSpacing: -0.4, color: lens.ink, flexShrink: 1 },
  outline: {
    height: 36, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: lens.outline, backgroundColor: "rgba(255,255,255,0.45)",
  },
  outlineText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: lh(12.5), color: lens.goldText },
  note: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 6 },

  // ---- movers
  rail: { paddingHorizontal: GUTTER, gap: 12, paddingBottom: 10 },
  tile: {
    width: 164, borderRadius: 20, overflow: "hidden", backgroundColor: "#F7F8F8",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#0B1622", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tileTop: { height: 112, overflow: "hidden" },
  tileArt: {
    position: "absolute", left: 14, top: 12, width: 64, height: 89, borderRadius: 4, overflow: "hidden",
    backgroundColor: "rgba(28,39,51,0.07)", transform: [{ rotate: "-8deg" }],
  },
  // The dark sleeve edge only goes round a real picture. Round an empty
  // placeholder it read as a broken frame.
  framed: { borderWidth: 2.5, borderColor: "#14181D", backgroundColor: "#D8DDE3" },
  spark: { position: "absolute", right: 10, top: 38 },
  tileBody: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 12 },
  tileName: { fontFamily: fonts.semi, fontSize: 14.5, lineHeight: lh(14.5), color: lens.ink },
  tileSet: { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: lh(10.5), color: lens.inkFaint, marginTop: 1 },
  tileFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 8 },
  tilePrice: { fontFamily: fonts.semi, fontSize: 19, lineHeight: lh(19), letterSpacing: -0.3, color: lens.ink, flexShrink: 1, fontVariant: ["tabular-nums"] },
  chg: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 },
  chgText: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: lh(10.5), fontVariant: ["tabular-nums"] },

  // ---- collect
  collect: {
    minHeight: 118, borderRadius: 22, overflow: "hidden", paddingHorizontal: 18, paddingVertical: 18,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.95)", backgroundColor: "#ECEEF1",
    shadowColor: "#0B1622", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  collectKicker: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: lh(10.5), letterSpacing: 1.4, color: lens.goldText },
  collectTitle: { fontFamily: fonts.semi, fontSize: 21, lineHeight: lh(21), letterSpacing: -0.4, color: lens.ink, marginTop: 4 },
  collectLink: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
  collectLinkText: { fontFamily: fonts.semi, fontSize: 12.5, lineHeight: lh(12.5), color: lens.goldText },
  collectArt: {
    position: "absolute", right: 16, top: 12, width: 70, height: 97, borderRadius: 5, overflow: "hidden",
    backgroundColor: "#D8DDE3",
    shadowColor: "#0B1622", shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 6 },
  },
});
