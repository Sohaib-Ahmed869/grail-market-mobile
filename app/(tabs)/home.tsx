import { useCallback, useEffect, useState } from "react";
import {
  AppState, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Aurora } from "../../components/Aurora";
import { Mark, MarkWatermark } from "../../components/Brand";
import { PageWash } from "../../components/PageWash";
import { Txt } from "../../components/Text";
import { Avatar } from "../../components/Avatar";
import { unreadCount } from "../../lib/messages";
import { unreadNotifications } from "../../lib/notifications";
import { Icon, type IconName } from "../../components/Icon";
import { watchlist, type Watch } from "../../lib/watchlist";
import { Bone, SkeletonCard } from "../../components/Skeleton";
import { GraderBadge } from "../../components/GraderChips";
import { useSession } from "../../lib/session";
import { useGuest } from "../../lib/guest";
import { browse, getCollection, num, type Listing } from "../../lib/market";
import { marketPulse, type Pulse } from "../../lib/cardmarket";
import { FocusRail } from "../../components/FocusRail";
import { FollowRing } from "../../components/FollowRing";
import { MarketMovers } from "../../components/MarketMovers";
import { CardArt } from "../../components/CardArt";
import { PriceChart, RangePicker } from "../../components/PriceChart";
import { marketIndex } from "../../lib/history";
import { aud, convert, money, useFx } from "../../lib/fx";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { GAME_IDS, gameTheme } from "../../lib/games";
import { colors, radius, shadow, space, type } from "../../theme";

/** Roughly how tall the navy band is, which is all the aurora needs to know
 *  to place its glows within it. Measuring it would mean a layout pass and a
 *  re-render before any light appeared. */
const BAND_H = 300;

/** Home.
 *
 *  Three bands, in the order someone opens the app for: what mine is worth,
 *  what the market is doing, what is for sale.
 *
 *  The value is the top of the screen, not a card on it. The last version
 *  put a white wallet card on the navy band with a rim, a logo box, a plus
 *  button and two pill actions under it — and with nothing priced yet the
 *  whole card was a dash. Now the number is set straight onto the band with
 *  the cards it is made of fanned beside it, the four things you can do are
 *  a row of glass tiles, and everything below arrives on a sheet.
 */
export default function Home() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const session = useSession();
  const guest = useGuest();
  const userId = session?.userId ?? "";
  const router = useRouter();
  const fx = useFx();

  const [collection, setCollection] = useState<
    /* `gain` is nullable: the API returns null when the cost and the value are
       in currencies it cannot bring together, which is not the same as zero. */
    { value: number; gain: number | null; cost: number; cards: number;
      priced: number; gainCards: number }
    | null | undefined
  >(undefined);
  const [pulse, setPulse] = useState<Pulse[] | undefined>(undefined);
  // The hero is built out of the collection, so it needs the pictures too.
  const [heldArt, setHeldArt] = useState<(string | null)[]>([]);
  const [forSale, setForSale] = useState<Listing[] | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [watched, setWatched] = useState<Watch[] | undefined>(undefined);

  const takeCollection = useCallback((r: Awaited<ReturnType<typeof getCollection>>) => {
    // Most valuable first: if only three can be shown, they should be the
    // three worth showing.
    setHeldArt(
      [...r.entries]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map((e) => e.imageUrl)
        .filter(Boolean)
        .slice(0, 6),
    );
    setCollection({
      value: r.value, gain: r.gain, cost: r.cost, gainCards: r.gainCards,
      cards: r.entries.length, priced: r.priced,
    });
  }, []);

  /* Pull to refresh the whole dashboard.
   *
   * Every panel here loads on its own, so refreshing means asking all of them
   * again together and holding the wheel until the slowest one answers —
   * stopping at the first is a spinner that lies about the panels still
   * loading behind it. allSettled, because one dead endpoint must not leave
   * the wheel turning over five that came back. */
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        marketPulse().then(setPulse),
        getCollection().then(takeCollection),
        watchlist().then((r) => setWatched(r.watches)),
        browse({ sort: "featured" }).then((r) => setForSale(r.listings.slice(0, 10))),
        unreadCount().then(setUnread),
        unreadNotifications().then(setAlerts),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [takeCollection]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    // The two badges refresh on a timer so the header is not lying about
    // what is waiting while someone sits on the home screen.
    const badges = () => {
      if (!userId || AppState.currentState !== "active") return;
      unreadCount().then((n) => { if (alive) setUnread(n); });
      unreadNotifications().then((n) => { if (alive) setAlerts(n); });
    };
    const timer = setInterval(badges, 8000);
    if (!userId) setCollection(null);
    else getCollection().then((r) => { if (alive) takeCollection(r); });
    if (userId) {
      badges();
      watchlist().then((r) => { if (alive) setWatched(r.watches); });
    } else {
      setWatched([]);
    }
    marketPulse().then((r) => { if (alive) setPulse(r); });
    browse({ sort: "featured" }).then((r) => { if (alive) setForSale(r.listings.slice(0, 10)); });
    return () => { alive = false; clearInterval(timer); };
  }, [userId, takeCollection]));

  const signedIn = Boolean(session) && !guest;
  const held = collection?.cards ?? 0;
  const unpriced = Boolean(collection && held > 0 && collection.priced === 0);
  /* The gain pill, and the cards it is entitled to speak for.
   *
   * The server reports how many cards have both a price and a cost; the gain
   * covers those and no others. An older server does not say, and its gain
   * sets the whole cost against a value only the priced cards contribute to —
   * so against one of those the figure only stands when everything is priced.
   * A dashboard pill reading "down A$11,092" because four cards have no price
   * yet is the loudest wrong number in the product. */
  const spans = collection
    ? collection.gainCards || (collection.priced === collection.cards ? collection.cards : 0)
    : 0;
  const gain = collection && collection.cost > 0 && collection.gain && spans > 0
    ? convert(collection.gain, { fx, from: "USD" }) ?? 0
    : null;

  return (
    <View style={s.root}>
      {/* The band runs under the status bar, so the clock is white here even
          though every other light screen keeps it dark. */}
      <StatusBar style="light" />
      <PageWash />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.inkFaint} />
        }
        {...navScroll}
      >
        {/* ---- the band ---------------------------------------------------- */}
        <LinearGradient
          colors={["#25374A", colors.dark, "#0C151E"]}
          locations={[0, 0.55, 1]}
          style={s.band}
        >
          {/* The light behind the band drifts — see components/Aurora. */}
          <Aurora height={BAND_H} />
          <MarkWatermark size={330} opacity={0.05} style={s.bandMark} />
          <SafeAreaView edges={["top"]}>
            <View style={s.bar}>
              <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={6}>
                <Avatar name={session?.name ?? "Guest"} id={session?.avatar} size={38} ring />
              </Pressable>

              <Pressable onPress={() => router.push("/(tabs)/search")} style={s.search}>
                <Icon name="search" size={18} color={colors.onDarkMuted} />
                <Txt variant="bodySmall" color={colors.onDarkMuted} numberOfLines={1}>
                  Search a card, set or code
                </Txt>
              </Pressable>

              <Glass
                icon="notify" count={alerts} label="Notifications"
                onPress={() => router.push(signedIn ? "/notifications" : "/signup")}
              />
              <Glass
                icon="messages" count={unread} label="Messages"
                onPress={() => router.push(signedIn ? "/messages" : "/signup")}
              />
            </View>

            {signedIn ? (
              <>
                {/* ---- the number, on the band ------------------------------ */}
                <Pressable onPress={() => router.push("/(tabs)/portfolio")} style={s.hero}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="overline" color={colors.onDarkMuted}>Your collection</Txt>
                    {collection === undefined ? (
                      <Bone w="62%" h={40} r={8} style={{ marginTop: 10, backgroundColor: "rgba(255,255,255,0.12)" }} />
                    ) : held === 0 ? (
                      <Txt style={s.heroWord} color={colors.onDark}>Nothing held yet</Txt>
                    ) : unpriced ? (
                      // Held but unpriced is not worth zero. It is unknown.
                      <Txt style={s.heroWord} color={colors.onDark}>Not priced yet</Txt>
                    ) : (
                      /* Converted, because /collection answers in US dollars.
                         Formatting a US figure as Australian understated the
                         headline number of the whole product by a third. */
                      <Txt style={s.heroValue} color={colors.onDark} numberOfLines={1} adjustsFontSizeToFit>
                        {aud(convert(collection?.value ?? 0, { fx, from: "USD" }))}
                      </Txt>
                    )}
                    <View style={s.heroFacts}>
                      {gain != null && !unpriced && held > 0 && (
                        <View style={[s.gain, { backgroundColor: gain >= 0 ? "rgba(79,191,139,0.18)" : "rgba(211,118,107,0.20)" }]}>
                          <Feather name={gain >= 0 ? "arrow-up-right" : "arrow-down-right"} size={12}
                            color={gain >= 0 ? "#7FD6AC" : "#F0A69C"} />
                          <Txt variant="label" color={gain >= 0 ? "#7FD6AC" : "#F0A69C"}>
                            {aud(Math.abs(gain))}
                          </Txt>
                        </View>
                      )}
                      <Txt variant="bodySmall" color={colors.onDarkMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
                        {collection === undefined
                          ? " "
                          : held === 0
                            ? "Scan a card to start"
                            : [
                                `${held} card${held === 1 ? "" : "s"}`,
                                watched?.length ? `${watched.length} following` : null,
                                collection && collection.priced > 0 && collection.priced < held
                                  ? `${collection.priced} priced` : null,
                              ].filter(Boolean).join(" · ")}
                      </Txt>
                    </View>
                  </View>
                  <Fan art={heldArt} />
                </Pressable>

              </>
            ) : (
              <View style={s.hero}>
                <View style={{ flex: 1 }}>
                  <Txt variant="h1" color={colors.onDark}>Every card, priced honestly.</Txt>
                  <Txt variant="bodySmall" color={colors.onDarkMuted} style={{ marginTop: 6 }}>
                    Browse and search freely. Scanning, collections and selling need an
                    account — everyone here is ID-checked.
                  </Txt>
                  <Pressable onPress={() => router.push("/signup")} style={s.join}>
                    <Txt variant="button" color={colors.dark}>Create an account</Txt>
                    <Feather name="arrow-right" size={16} color={colors.dark} />
                  </Pressable>
                </View>
                <View style={s.guestMark} pointerEvents="none"><Mark size={64} onDark /></View>
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>

        {/* Everything below the value arrives on a sheet that overlaps the
            band, so the two read as foreground and background rather than as
            two blocks stacked on each other. */}
        <View style={s.sheet}>
          {/* ---- the games, in their own colours -------------------------- */}
          {/* The dashboard had no colour in it and no way into the catalogue.
              This is both: a row of games, each in the colour people already
              hold for it, opening that game's sets. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.games}
            style={{ flexGrow: 0 }}
          >
            {GAME_IDS.slice(0, 8).map((id) => {
              const th = gameTheme(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => router.push({ pathname: "/(tabs)/search", params: { game: id } })}
                  style={({ pressed }) => [s.game, pressed && { transform: [{ scale: 0.96 }] }]}
                >
                  <View style={[s.gameDisc, { backgroundColor: th.wash, borderColor: th.tint }]}>
                    <Txt style={[s.gameShort, { color: th.tint }]}>{th.short}</Txt>
                  </View>
                  <Txt variant="overline" color={colors.inkMuted} numberOfLines={1} style={s.gameLabel}>
                    {th.label}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ---- what I am following ------------------------------------- */}
          {signedIn && watched && watched.length > 0 && (
            <>
              <Section
                title="Following"
                sub="Tap one to see where it is"
                action={{ label: "Watchlist", onPress: () => router.push("/watchlist") }}
              />
              <FollowRing
                items={watched.slice(0, 12).map((w) => ({
                  id: w.watchId,
                  name: w.cardName,
                  imageUrl: w.imageUrl,
                  since: w.since,
                  alerting: w.alertPct != null,
                }))}
                onPress={(it) => {
                  const w = watched.find((x) => x.watchId === it.id);
                  if (w?.catalogId) router.push(`/card/${w.catalogId}` as any);
                }}
                onAdd={() => router.push("/watchlist")}
              />
            </>
          )}

          {/* ---- the market as one line --------------------------------------- */}
          <MarketIndex />

          {/* ---- what moved --------------------------------------------------- */}
          <Section
            title="On The Move"
            // Not "realtime". The pulse is cached for twelve hours, so the
            // honest claim is the one that also says how often we look.
            sub="This week · refreshed twice a day"
            action={
              pulse && pulse.length > 5
                ? { label: "See all", onPress: () => router.push("/movers") }
                : undefined
            }
          />
          {pulse === undefined ? (
            <View style={[s.panel, { padding: space.lg, gap: space.md }]}>
              <Bone h={20} w="50%" />
              <Bone h={176} r={12} />
              <Bone h={34} />
            </View>
          ) : pulse.length === 0 ? (
            <Empty icon="activity" title="No Big Moves"
              body="Prices held steady this week, or too few cards sold to tell." />
          ) : (
            <MarketMovers pulse={pulse} />
          )}

          {/* ---- what is for sale ---------------------------------------------- */}
          <Section
            title="Cards For Sale"
            sub="From ID-checked sellers, each one reviewed by hand"
            action={forSale && forSale.length > 0 ? { label: "See all", onPress: () => router.push("/market") } : undefined}
          />
          {forSale === undefined ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.railInner} scrollEnabled={false}>
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </ScrollView>
          ) : forSale.length === 0 ? (
            <Empty
              icon="shopping-bag"
              title="Nothing For Sale Yet"
              body={signedIn
                ? "Listings appear once a person has checked them. Your own never show here — you already own those."
                : "Listings appear once a person has checked them."}
              action={signedIn ? { label: "List a card", onPress: () => router.push("/(tabs)/scan") } : undefined}
            />
          ) : (
            <FocusRail
              data={forSale}
              itemWidth={196}
              keyOf={(l) => l.listing_id}
              render={(l) => {
                const img = l.photos?.[0]?.url ?? l.image_url;
                const market = num(l.market_value);
                const asking = num(l.price) ?? 0;
                const under = market != null && asking < market;
                return (
                  <Pressable
                    onPress={() => router.push(`/listing/${l.listing_id}` as any)}
                    style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                  >
                    <View style={s.focusThumb}>
                      <CardArt uri={img} iconSize={22} />
                      <View style={s.badgeOnArt}>
                        <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
                      </View>
                      {l.featured && (
                        <View style={s.featured}>
                          <Txt variant="overline" color={colors.onPrimary} style={{ fontSize: 11 }}>
                            Featured
                          </Txt>
                        </View>
                      )}
                    </View>
                    <Txt variant="h3" numberOfLines={1} style={{ marginTop: space.sm }}>
                      {l.card_name}
                    </Txt>
                    <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                      {l.set_name ?? ""}
                    </Txt>
                    <View style={s.cardFoot}>
                      <Txt variant="h3">{aud(asking)}</Txt>
                      {market != null && (
                        <View style={[s.marketPill, under ? s.underPill : s.overPill]}>
                          <Txt variant="overline" color={under ? colors.up : colors.inkMuted}
                            style={{ fontSize: 11.5 }}>
                            {under ? "UNDER" : "OVER"}
                          </Txt>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** A round glass control on the band, with a count on it when there is one. */
function Glass({
  icon, count, label, onPress,
}: { icon: IconName; count: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.iconBtn} accessibilityLabel={label}>
      <Icon name={icon} size={20} color={colors.onDark} filled={count > 0} />
      {count > 0 && (
        <View style={s.unread}>
          <Txt variant="overline" color={colors.onPrimary} style={{ fontSize: 11 }}>
            {count > 9 ? "9+" : count}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

/** The best three cards held, fanned like a hand beside the number.
 *
 *  Only pictures another device can fetch: a scanned card keeps the phone's
 *  own ImagePicker path, which is a real address on one handset and a blank
 *  on every other. A card we cannot draw is left out rather than drawn empty. */
function Fan({ art }: { art: (string | null | undefined)[] }) {
  const faces = art
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u))
    .slice(0, 3);
  if (faces.length === 0) return null;
  // The last card drawn sits on top and in front, so the best card (first in
  // the list) is drawn last.
  const order = [...faces].reverse();
  const tilt = [-14, 0, 12].slice(3 - order.length);
  return (
    <View style={s.fan} pointerEvents="none">
      {order.map((uri, i) => (
        <View
          key={uri + i}
          style={[
            s.fanCard,
            {
              transform: [{ rotate: `${tilt[i]}deg` }, { translateX: (i - (order.length - 1) / 2) * 22 }],
              top: i === order.length - 1 ? 0 : 8,
            },
          ]}
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}


/** One heading, everywhere. Sections that each invent their own spacing are
 *  what makes a page look assembled rather than designed. */
function Section({
  title, sub, action,
}: { title: string; sub?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1 }}>
        <Txt variant="h2">{title}</Txt>
        {sub ? <Txt variant="bodySmall" color={colors.inkFaint}>{sub}</Txt> : null}
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} style={s.seeAll}>
          <Txt variant="label" color={colors.ink}>{action.label}</Txt>
          <Feather name="chevron-right" size={14} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

function Empty({
  icon, title, body, action,
}: {
  icon: keyof typeof Feather.glyphMap; title: string; body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.sectionBody}>
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Feather name={icon} size={20} color={colors.inkFaint} />
        </View>
        <Txt variant="h3" center style={{ marginTop: space.md }}>{title}</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>{body}</Txt>
        {action && (
          <Pressable onPress={action.onPress} style={s.emptyBtn}>
            <Txt variant="button" color={colors.ink}>{action.label}</Txt>
            <Feather name="arrow-right" size={15} color={colors.ink} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const GUTTER = space.xl;
/** How many PSA 10 cards, and how many days of them, before a line drawn
 *  through their average is allowed to call itself the market. */
const MIN_BASKET = 10;
const MIN_DAYS = 14;

/** The whole market, rebased to 100.
 *
 *  It answers the question the individual movers below cannot: not "which
 *  card jumped" but "is any of this going anywhere". Absent until there is
 *  enough history to say — an index built from four days would be noise with
 *  a confident line through it. */
function MarketIndex() {
  const [days, setDays] = useState(90);
  const [ix, setIx] = useState<Awaited<ReturnType<typeof marketIndex>> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setIx(undefined);
    marketIndex(days).then((r) => { if (alive) setIx(r); });
    return () => { alive = false; };
  }, [days]);

  if (ix === null) return null;
  if (ix === undefined) return <Bone h={220} r={radius.lg} style={{ marginHorizontal: GUTTER, marginTop: space.xxl }} />;
  // "Enough history to say" has to mean something. The first cut checked for
  // two points, which is nearly always true — and drew a flat line at 100
  // from two cards over nine days, with "+0.0%" over it, as if the market
  // had spoken. A basket that small is two cards, not a market, and a window
  // that short is noise whichever way it went. Until the store holds both,
  // the section does not exist.
  if (ix.basket < MIN_BASKET || ix.points.length < MIN_DAYS) return null;

  const first = ix.points[0]!.price;
  const last = ix.points[ix.points.length - 1]!.price;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;

  return (
    <>
      <Section title="The Market" sub={`PSA 10s, the ${ix.basket} cards traded most`} />
      <View style={[s.panel, s.index]}>
        <View style={s.indexHead}>
          <View style={[s.pct, { backgroundColor: up ? colors.upWash : colors.downWash }]}>
            <Feather name={up ? "trending-up" : "trending-down"} size={13} color={up ? colors.up : colors.down} />
            <Txt variant="label" color={up ? colors.up : colors.down} style={s.pctTxt}>
              {up ? "+" : "−"}{Math.abs(pct).toFixed(1)}%
            </Txt>
          </View>
          <RangePicker value={days} onChange={setDays} />
        </View>
        {/* An index, so the readout is a number, not dollars. */}
        <PriceChart
          points={ix.points}
          height={140}
          tone={up ? colors.up : colors.down}
          format={(n) => n.toFixed(1)}
        />
        <Txt variant="bodySmall" color={colors.inkFaint}>
          Set to 100 at the start of the window, so this is the shape of the market rather than a price.
        </Txt>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  band: { overflow: "hidden", paddingBottom: space.xxl + space.lg },
  bandMark: { position: "absolute", right: -110, top: -30 },
  bloom: { position: "absolute", top: -260, right: -140, width: 560, height: 560 },
  sheet: {
    marginTop: -space.xl,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: colors.washBottom,
    paddingTop: space.xs,
  },

  bar: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingHorizontal: GUTTER, paddingTop: space.sm,
  },
  // Glass on the navy rather than white pills. A white control on a dark band
  // is a hole punched in it; a translucent one belongs to the surface.
  search: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 44, paddingHorizontal: space.md,
    borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.16)",
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.16)",
  },
  unread: {
    position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.down, borderWidth: 1.5, borderColor: colors.surface,
  },

  // ---- the hero ------------------------------------------------------------
  hero: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: GUTTER, marginTop: space.xxl, minHeight: 120,
  },
  heroValue: {
    ...type.display, fontSize: 46, lineHeight: 52, letterSpacing: -1.6,
    marginTop: 6, fontVariant: ["tabular-nums"],
  },
  heroWord: { ...type.h1, marginTop: 8 },
  heroFacts: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  gain: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  fan: { width: 120, height: 124, alignItems: "center", justifyContent: "flex-start" },
  fanCard: {
    position: "absolute", width: 74, height: 103, borderRadius: 8, overflow: "hidden",
    backgroundColor: colors.darkRaised,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },

  join: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 48, marginTop: space.lg, borderRadius: radius.pill, backgroundColor: colors.accent,
    alignSelf: "flex-start", paddingHorizontal: space.xl,
  },
  guestMark: { opacity: 0.35, marginLeft: space.md },

  // ---- sections --------------------------------------------------------------
  sectionHead: {
    flexDirection: "row", alignItems: "flex-end", gap: space.md,
    paddingHorizontal: GUTTER, marginTop: space.xxl, marginBottom: space.md,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2, paddingBottom: 2 },
  sectionBody: { paddingHorizontal: GUTTER },
  railInner: { paddingHorizontal: GUTTER, gap: space.sm },

  games: { flexDirection: "row", gap: space.md, paddingHorizontal: GUTTER, paddingTop: space.lg },
  game: { alignItems: "center", width: 62, gap: 6 },
  gameDisc: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  gameShort: { ...type.overline, fontSize: 13, letterSpacing: 0.2 },
  gameLabel: { textAlign: "center" },

  // White on the wash, lifted by a shadow rather than drawn with a line. A
  // hairline round every panel is what makes a page read as a form.
  panel: {
    marginHorizontal: GUTTER, paddingHorizontal: space.md, paddingVertical: space.xs,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card,
  },


  index: { padding: space.lg, gap: space.sm },
  indexHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  pct: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  pctTxt: { fontVariant: ["tabular-nums"] },


  focusThumb: {
    height: 258, borderRadius: 20, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center",
  },
  badgeOnArt: { position: "absolute", left: 6, bottom: 6 },
  featured: {
    position: "absolute", top: 6, left: 6,
    paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: colors.accent,
  },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  marketPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  underPill: { backgroundColor: colors.upWash },
  overPill: { backgroundColor: colors.surfaceSunk },

  empty: {
    alignItems: "center", paddingVertical: space.xxl, paddingHorizontal: space.xl,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card,
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: space.lg, paddingHorizontal: space.lg, height: 42,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong,
  },
});
