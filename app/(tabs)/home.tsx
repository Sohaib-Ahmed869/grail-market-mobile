import { useCallback, useEffect, useState } from "react";
import {
  AppState, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Bloom } from "../../components/Bloom";
import { Mark, MarkWatermark } from "../../components/Brand";
import { PageWash } from "../../components/PageWash";
import { Txt } from "../../components/Text";
import { Avatar } from "../../components/Avatar";
import { unreadCount } from "../../lib/messages";
import { unreadNotifications } from "../../lib/notifications";
import { Icon } from "../../components/Icon";
import { watchlist, type Watch } from "../../lib/watchlist";
import { Loader } from "../../components/Loader";
import { Bone, SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { Spark } from "../../components/Spark";
import { GraderBadge } from "../../components/GraderChips";
import { useIdentity } from "../../lib/useIdentity";
import { useSession } from "../../lib/session";
import { useGuest } from "../../lib/guest";
import { browse, getCollection, num, type Listing } from "../../lib/market";
import { marketPulse, type Pulse } from "../../lib/cardmarket";
import { MoveBars } from "../../components/MoveBars";
import { TrendCompare } from "../../components/TrendCompare";
import { ValueHero } from "../../components/ValueHero";
import { FocusRail } from "../../components/FocusRail";
import { FollowRing } from "../../components/FollowRing";
import { CardArt } from "../../components/CardArt";
import { PriceChart, RangePicker } from "../../components/PriceChart";
import { collectionHistory, marketIndex } from "../../lib/history";
import { money, useFx } from "../../lib/fx";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { colors, radius, space } from "../../theme";

const aud = (n: number) => `A$${Math.round(n).toLocaleString()}`;

/** Home.
 *
 *  Three bands, in the order someone opens the app for: what mine is worth,
 *  what the market is doing, what is for sale.
 *
 *  The rebuild fixed a structural fault rather than a stylistic one. The
 *  actions were pulled up into the navy band with a negative margin and the
 *  content below started immediately after them, so the first section heading
 *  sat underneath the cards — the page had no gutter between two things that
 *  belonged to different bands. Now the actions sit inside the dark band and
 *  the scroll begins beneath it, which means every section can be spaced the
 *  same way and nothing overlaps at any font size.
 */
export default function Home() {
  const navScroll = useNavScroll();
  const { width } = useWindowDimensions();
  const clearance = useTabBarClearance();
  const session = useSession();
  const guest = useGuest();
  const userId = session?.userId ?? "";
  const router = useRouter();
  const fx = useFx();
  const { verified } = useIdentity(userId);

  const [collection, setCollection] = useState<
    { value: number; gain: number; cost: number; cards: number; priced: number } | null | undefined
  >(undefined);
  const [pulse, setPulse] = useState<Pulse[] | undefined>(undefined);
  // Which line on the comparison chart is in front.
  const [focusMover, setFocusMover] = useState<string | null>(null);
  // The hero is built out of the collection, so it needs the pictures and the
  // line as well as the totals.
  const [heldArt, setHeldArt] = useState<(string | null)[]>([]);
  const [valueLine, setValueLine] = useState<number[] | undefined>(undefined);
  const [forSale, setForSale] = useState<Listing[] | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [watched, setWatched] = useState<Watch[] | undefined>(undefined);

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
    else {
      getCollection().then((r) => {
        if (!alive) return;
        // Most valuable first: if only six can be shown, they should be the
        // six worth showing.
        setHeldArt(
          [...r.entries]
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
            .map((e) => e.imageUrl)
            .filter(Boolean)
            .slice(0, 6),
        );
        if (alive) setCollection({
          value: r.value, gain: r.gain, cost: r.cost,
          cards: r.entries.length, priced: r.priced,
        });
      });
    }
    if (userId) {
      unreadCount().then((n) => { if (alive) setUnread(n); });
      unreadNotifications().then((n) => { if (alive) setAlerts(n); });
      watchlist().then((r) => { if (alive) setWatched(r.watches); });
    } else {
      setWatched([]);
    }
    marketPulse().then((r) => { if (alive) setPulse(r); });
    // 30 days, not 90: the hero's line is 56pt tall and a quarter of the
    // screen wide, so a longer window only adds detail nobody can see.
    collectionHistory(30).then((h) => {
      if (alive) setValueLine(h?.points.map((p) => p.price));
    });
    browse({ sort: "featured" }).then((r) => { if (alive) setForSale(r.listings.slice(0, 10)); });
    return () => { alive = false; clearInterval(timer); };
  }, [userId]));

  const signedIn = Boolean(session) && !guest;

  return (
    <View style={s.root}>
      {/* The band runs under the status bar, so the clock is white here even
          though every other light screen keeps it dark. */}
      <StatusBar style="light" />
      <PageWash />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: clearance }}
        {...navScroll}
      >
        {/* ---- the band ---------------------------------------------------- */}
        {/* The value does not sit on a card any more — it IS the top of the
            screen. A panel on a page is a component; a header the page begins
            with is the page being about that number, which is what a
            dashboard is for.
            
            It runs under the status bar and the content arrives on a sheet
            below it, so the two read as foreground and background rather than
            as two blocks stacked. */}
        <LinearGradient
          colors={["#25374A", colors.dark, "#0C151E"]}
          locations={[0, 0.55, 1]}
          style={s.band}
        >
          <View style={s.bloom} pointerEvents="none">
            <Bloom size={560} color={colors.accent} opacity={0.30} />
          </View>
          {/* The mark, enormous and barely there. Texture for the band, not a
              logo sitting on it. */}
          <MarkWatermark size={330} opacity={0.05} style={s.bandMark} />
          <SafeAreaView edges={["top"]}>
            {/* The greeting said nothing anyone needed twice a day, and the
                verification chip belongs on the profile where it can be acted
                on. Search takes the space because it is the thing people open
                the app to do; messages sit opposite because they are the
                thing people open the app to check. */}
            <View style={s.bar}>
              <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={6}>
                <Avatar name={session?.name ?? "Guest"} id={session?.avatar} size={38} ring />
              </Pressable>

              <Pressable
                onPress={() => router.push("/(tabs)/search")}
                style={s.search}
              >
                <Icon name="search" size={18} color={colors.onDarkMuted} />
                <Txt variant="bodySmall" color={colors.onDarkMuted} numberOfLines={1}>
                  Search a card, set or code
                </Txt>
              </Pressable>

              <Pressable
                onPress={() => (signedIn ? router.push("/notifications") : router.push("/signup"))}
                style={s.iconBtn}
                accessibilityLabel="Notifications"
              >
                <Icon name="notify" size={20} color={colors.onDark} filled={alerts > 0} />
                {alerts > 0 && (
                  <View style={s.unread}>
                    <Txt variant="overline" color={colors.onPrimary} style={{ fontSize: 11 }}>
                      {alerts > 9 ? "9+" : alerts}
                    </Txt>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => (signedIn ? router.push("/messages") : router.push("/signup"))}
                style={s.iconBtn}
                accessibilityLabel="Messages"
              >
                <Icon name="messages" size={20} color={colors.ink} filled={unread > 0} />
                {unread > 0 && (
                  <View style={s.unread}>
                    <Txt variant="overline" color={colors.onPrimary} style={{ fontSize: 11 }}>
                      {unread > 9 ? "9+" : unread}
                    </Txt>
                  </View>
                )}
              </Pressable>
            </View>

            {signedIn ? (
              <ValueHero
                bare
                loading={collection === undefined}
                empty={!collection || collection.cards === 0}
                value={aud(collection?.value ?? 0)}
                delta={
                  collection && collection.cost > 0 && collection.gain !== 0
                    ? {
                        up: collection.gain > 0,
                        text: `${collection.gain > 0 ? "+" : "−"}${aud(Math.abs(collection.gain))}`,
                      }
                    : null
                }
                // The panel is made of the collection it is valuing. As cards
                // go in, the card itself changes — which no arrangement of
                // type on a dark rectangle can do.
                art={heldArt}
                spark={valueLine}
                stats={[
                  {
                    n: String(collection?.cards ?? 0),
                    label: collection?.cards === 1 ? "card held" : "cards held",
                  },
                  { n: String(watched?.length ?? 0), label: "following" },
                  { n: String(collection?.priced ?? 0), label: "priced" },
                ]}
                onScan={() => router.push("/(tabs)/scan")}
                onPress={() => router.push("/(tabs)/portfolio")}
              />
            ) : (
              <View style={s.valueCard}>
                <LinearGradient
                  colors={["#2C3D4B", colors.dark, "#0B131B"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.cardBloom} pointerEvents="none">
                  <Bloom size={340} color={colors.accent} opacity={0.34} />
                </View>
                <View style={s.watermark} pointerEvents="none">
                  <Mark size={190} onDark />
                </View>
                <View style={s.goldRule} pointerEvents="none" />
                <View style={s.cardBody}>
                  <Txt variant="h1" color={colors.onDark}>Every card, priced honestly.</Txt>
                  <Txt variant="bodySmall" color={colors.onDarkMuted} style={{ marginTop: 6 }}>
                    Browse and search freely. Scanning, collections and selling need an
                    account — everyone here is ID-checked.
                  </Txt>
                  <Pressable onPress={() => router.push("/signup")} style={s.join}>
                    <Txt variant="button" color={colors.dark}>Create an account</Txt>
                    <Icon name="profile" size={16} color={colors.dark} />
                  </Pressable>
                </View>
              </View>
            )}

          </SafeAreaView>
        </LinearGradient>

        {/* Everything below the value arrives on a sheet that overlaps the
            band. The overlap is what makes the two read as foreground and
            background rather than as two blocks stacked on each other. */}
        <View style={s.sheet}>
          {/* The grab handle. It is not draggable and does not pretend to be —
              it is the mark that says "this is a surface lying over the one
              behind it", which is the whole reason the sheet has a rounded
              top and an overlap. Without it the join reads as two blocks
              that happen to have different colours. */}
          <View style={s.handle} />

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
          // honest claim is the one that also conveys the tracking: it says
          // how often we look, which is the thing a live feed is actually
          // promising.
          sub="Ranked on the week · refreshed twice a day"
          action={
            pulse && pulse.length > 3
              ? { label: "See all", onPress: () => router.push("/movers") }
              : undefined
          }
        />
        {/* Bars from a shared zero, not a treemap and not a rail.
          *
          * The rail could only say the order things were in. The treemap that
          * replaced it said magnitude and direction at once, but paid for it
          * with the names — below about 62pt a tile could only be a colour.
          * This keeps every name and lets the bar carry the same two facts.
          *
          * Growing from a CENTRE line is the part that matters: a bar always
          * starting at the left needs its colour read before you know which
          * way it went, and colour alone is the one channel some people
          * cannot use. Here the direction is the geometry. */}
        {pulse === undefined ? (
          <View style={s.movers}>
            {[0, 1, 2].map((i) => <Bone key={i} h={54} r={10} />)}
          </View>
        ) : pulse.length === 0 ? (
          <Empty icon="activity" title="No Big Moves"
            body="Prices held steady this week, or too few cards sold to tell." />
        ) : (
          <View style={s.movers}>
            {/* One grid, every mover on it. A chart per card answers "what
                did this one do"; together they answer the question somebody
                opened the app with — which of these is running and which is
                falling. */}
            <View style={s.compare}>
              <TrendCompare
                series={pulse.slice(0, 6).map((p) => ({
                  id: p.cardId ?? p.label,
                  label: p.label,
                  points: p.spark ?? [],
                }))}
                selectedId={focusMover ?? pulse[0]?.cardId ?? pulse[0]?.label}
                onSelect={setFocusMover}
              />
            </View>

            <MoveBars
              rows={pulse.slice(0, 3).map((p) => ({
                label: p.label,
                meta: [p.setName, money(p.price, { fx, from: "USD" })].filter(Boolean).join(" · "),
                change: p.change7d,
                cardId: p.cardId,
                // All four windows here too. Three rows is few enough that
                // the extra line is depth rather than density, and a single
                // figure cannot tell a spike from a trend on any screen.
                periods: {
                  day: p.change24h, week: p.change7d,
                  month: p.change30d, quarter: p.change90d,
                },
              }))}
              // Scaled against the whole week, not against these three. Given
              // its own scale a shortened list redraws the same card at a
              // different size, and the dashboard and the full screen would
              // disagree about how big the week was.
              max={Math.max(...pulse.map((p) => Math.abs(p.change7d ?? 0)), 1)}
              // A mover we cannot name in a catalogue still has a live market
              // behind it, so it goes to the listings for that name rather
              // than nowhere. A tap that does nothing is the same defect as a
              // tap that opens "Card Not Found" — it just fails more quietly.
              onPress={(r) =>
                r.cardId
                  ? router.push(`/card/${r.cardId}` as any)
                  : router.push({ pathname: "/market", params: { q: r.label } })
              }
            />
          </View>
        )}

        {/* ---- what is for sale ---------------------------------------------- */}
        <Section
          title="Cards For Sale"
          sub="From ID-checked sellers, each one reviewed by hand"
          action={forSale && forSale.length > 0 ? { label: "See all", onPress: () => router.push("/market") } : undefined}
        />
        {forSale === undefined ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}
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

/** One heading, everywhere. Sections that each invent their own spacing are
 *  what makes a page look assembled rather than designed. */
function Section({
  title, sub, action,
}: { title: string; sub: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1 }}>
        <Txt variant="h2">{title}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint}>{sub}</Txt>
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} style={s.seeAll}>
          <Txt variant="bodySmall" color={colors.ink}>{action.label}</Txt>
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
  if (ix === undefined) return <Bone h={200} r={14} style={{ marginTop: space.xl }} />;
  if (ix.points.length < 2) return null;

  const first = ix.points[0]!.price;
  const last = ix.points[ix.points.length - 1]!.price;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;

  return (
    <View style={s.index}>
      <View style={s.indexHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="h2">The Market</Txt>
          <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
            {up ? "Up" : "Down"} {Math.abs(pct).toFixed(1)}% · {ix.basket} cards
          </Txt>
        </View>
        <RangePicker value={days} onChange={setDays} />
      </View>
      <PriceChart points={ix.points} height={150} tone={up ? colors.up : colors.down} />
      <Txt variant="bodySmall" color={colors.inkFaint}>
        {/* Saying what it is stops it being read as dollars. */}
        Set to 100 at the start, so this is the shape of the market rather than a
        price. PSA 10s, the cards we see traded most.
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  index: {
    marginTop: space.xl, padding: space.lg, gap: space.sm,
    borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  indexHead: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  root: { flex: 1, backgroundColor: colors.washBottom },
  band: { overflow: "hidden", paddingBottom: space.xxl },
  bandMark: { position: "absolute", right: -110, top: -30 },
  sheet: {
    marginTop: -space.xl,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    backgroundColor: colors.washBottom,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: "center", width: 42, height: 5, borderRadius: 3,
    backgroundColor: colors.lineStrong, marginBottom: space.md,
  },
  bloom: { position: "absolute", top: -260, right: -140, width: 560, height: 560 },

  bar: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingHorizontal: GUTTER, paddingTop: space.sm,
  },
  // Glass on the navy rather than white pills. A white control on a dark band
  // is a hole punched in it; a translucent one belongs to the surface it sits
  // on and lets the bloom and the watermark show through.
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
  watch: {
    padding: space.md,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.05, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  watchArt: {
    height: 150, borderRadius: 14, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center",
  },
  watchGrade: { position: "absolute", left: 6, bottom: 6 },
  watchFollow: {
    position: "absolute", right: 6, top: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999,
    backgroundColor: "rgba(11,22,34,0.72)",
  },
  watchFoot: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.sm },
  move: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },

  valueCard: {
    marginHorizontal: GUTTER, marginTop: space.lg, marginBottom: space.xl,
    borderRadius: 26, overflow: "hidden", backgroundColor: colors.dark,
    shadowColor: "#0B1622", shadowOpacity: 0.28, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  cardBloom: { position: "absolute", right: -120, top: -150, width: 340, height: 340 },
  watermark: { position: "absolute", right: -46, bottom: -54, opacity: 0.07 },
  goldRule: {
    position: "absolute", top: 0, left: 0, right: 0, height: 3,
    backgroundColor: colors.accent, opacity: 0.85,
  },
  cardBody: { padding: space.xl },
  valueRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: 2 },
  bigValue: { fontSize: 40, lineHeight: 46 },
  delta: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  cardStats: {
    flexDirection: "row", alignItems: "center",
    marginTop: space.xl, paddingTop: space.lg,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)",
  },
  statRule: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.12)" },
  strip: {
    flexDirection: "row", alignItems: "stretch",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)",
  },
  stripItem: { flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md },
  stripDivider: {
    position: "absolute", left: 0, top: "22%", bottom: "22%", width: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  valueFoot: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill,
  },
  emptyCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 44, marginTop: space.lg, borderRadius: radius.pill, backgroundColor: colors.accent,
  },
  join: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 48, marginTop: space.lg, borderRadius: radius.pill, backgroundColor: colors.accent,
  },


  sectionHead: {
    flexDirection: "row", alignItems: "flex-end", gap: space.md,
    paddingHorizontal: GUTTER, marginTop: space.xxl, marginBottom: space.md,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionBody: { paddingHorizontal: GUTTER },
  rail: { marginHorizontal: 0 },
  movers: { paddingHorizontal: GUTTER, marginTop: space.sm, gap: space.md },
  compare: {
    padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline,
  },
  railInner: { paddingHorizontal: GUTTER, gap: space.md },

  moverArt: {
    height: 184, borderRadius: 14, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center",
  },
  moveTag: {
    position: "absolute", top: 7, left: 7,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  moverSpark: { position: "absolute", left: 0, right: 0, bottom: 0, opacity: 0.9 },
  moverFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 1 },

  card: { width: 152 },
  // Taller than the flat rail's 200. The focused tile is the subject of the
  // section now, and at the old height it was a thumbnail that happened to be
  // slightly larger than its neighbours.
  focusThumb: {
    height: 258, borderRadius: 20, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center",
  },
  thumb: {
    height: 200, borderRadius: 20, overflow: "hidden",
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
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderStyle: "dashed",
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
