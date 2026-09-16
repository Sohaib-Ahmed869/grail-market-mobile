import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PageWash } from "../../components/PageWash";
import { BackButton } from "../../components/BackButton";
import { Txt } from "../../components/Text";
import { FilterGroup, FilterSheet, RadioRow } from "../../components/FilterSheet";
import { editionName, useQuickFollow } from "../../components/CatalogueTiles";
import {
  Callout, EmptyState, Eyebrow, PearlField, PriceTile, PriceTileBone, CHECKING_LISTINGS_WHY, NOTHING_LISTED_WHY, SortButton, monthYear, setLogo,
} from "../../components/Pearl";
import { dollars, lens, lh } from "../../components/MarketLens";
import { browseGames, setDetail, type SetDetail } from "../../lib/cardmarket";
import { gameTheme, sportOf } from "../../lib/games";
import { useFx } from "../../lib/fx";
import { useBack } from "../../lib/nav";
import { useSportsArt } from "../../lib/sportsart";
import { fonts } from "../../theme";

type Card = SetDetail["cards"][number];
type Sort = "number" | "high" | "low";
const SORT_LABEL: Record<Sort, string> = {
  number: "Card number", high: "Price: high to low", low: "Price: low to high",
};

/** Which game a set id belongs to, where the id says. Screens that open a set
 *  pass the game along; this covers a set opened from a link. */
function gameOfSet(setId: string): string | null {
  const sport = /^sport:([^:]+):/.exec(setId);
  if (sport) return `sport:${sport[1]}`;
  const listed = /^tcg:([^:]+):/.exec(setId);
  if (listed) return listed[1]!;
  if (/^mtg:/.test(setId)) return "mtg";
  if (/^optcg[:-]/i.test(setId)) return "onepiece";
  return null;
}

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Trailing number of a collector number; sports entries have none and keep
 *  the catalogue's own order (most-listed player first). */
const numberOf = (id: string) => {
  const m = id.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

function sortCards(list: Card[], sort: Sort): Card[] {
  const byNum = (a: Card, b: Card) => numberOf(a.localId) - numberOf(b.localId) || a.localId.localeCompare(b.localId);
  if (sort === "number") return [...list].sort(byNum);
  const dir = sort === "high" ? -1 : 1;
  // Unpriced last in BOTH directions. No price is not a low price, and a
  // "low to high" list led by the cards we know nothing about would call
  // them the bargains of the set.
  return [...list].sort((a, b) => {
    if (a.rawUsd == null && b.rawUsd == null) return byNum(a, b);
    if (a.rawUsd == null) return 1;
    if (b.rawUsd == null) return -1;
    return (a.rawUsd - b.rawUsd) * dir || byNum(a, b);
  });
}

type Item = Card | { cardId: "__pad" };

/** A set, and every card in it with its raw price.
 *
 *  This route used to hand straight over to the first card's page. The Pearl
 *  design opens a set onto its cards instead — the whole binder priced at a
 *  glance, sortable by value — which is the question someone browsing a set
 *  is actually asking. A card still opens its own page, with the set as its
 *  deck to swipe through.
 */
export default function SetScreen() {
  const params = useLocalSearchParams<{ setId: string; game?: string; gameName?: string }>();
  const setId = String(params.setId);
  const gameId = params.game ? String(params.game) : gameOfSet(setId);
  const sport = sportOf(gameId) != null || /^sport:/.test(setId);
  const router = useRouter();
  const back = useBack("/(tabs)/search");
  const insets = useSafeAreaInsets();
  const fx = useFx();
  const quick = useQuickFollow();

  const [label, setLabel] = useState(params.gameName ? String(params.gameName) : "");
  useEffect(() => {
    if (label || !gameId) return;
    let alive = true;
    browseGames().then((gs) => {
      if (!alive) return;
      const g = gs.find((x) => x.id === gameId);
      setLabel(g ? editionName(g) : gameTheme(gameId).label);
    });
    return () => { alive = false; };
  }, [gameId]);

  const [detail, setDetailData] = useState<SetDetail | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setDetailData(undefined);
    setDetail(setId).then((d) => { if (alive) setDetailData(d); });
    return () => { alive = false; };
  }, [setId]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("number");
  const [sheet, setSheet] = useState(false);

  const cards = detail?.cards ?? [];
  const priced = useMemo(() => cards.filter((c) => c.rawUsd != null).length, [cards]);
  const shown = useMemo(() => {
    const n = fold(q.trim());
    const list = n ? cards.filter((c) => fold(`${c.name} ${c.localId}`).includes(n)) : cards;
    return sortCards(list, sport ? "number" : sort);
  }, [cards, q, sort, sport]);
  // An odd last card keeps half the row rather than stretching across it.
  const data = useMemo<Item[]>(() => (shown.length % 2 ? [...shown, { cardId: "__pad" }] : shown), [shown]);

  // Sports players mostly arrive without a picture; ask for the ones that
  // scroll into view. A ref, because FlatList refuses a viewability callback
  // that changes identity between renders.
  const { art, asks, want } = useSportsArt();
  const onViewable = useRef(({ viewableItems }: { viewableItems: { item: Item }[] }) => {
    want(viewableItems.map((v) => v.item).filter((c): c is Card => c.cardId !== "__pad").map((c) => c.cardId));
  }).current;

  const noun = sport ? "players" : "cards";
  const total = Number(detail?.total) || cards.length;
  const facts = [
    detail ? `${total.toLocaleString()} ${noun}` : null,
    sport ? null : monthYear(detail?.releasedAt),
  ].filter(Boolean).join(" · ");
  const logo = detail ? setLogo(detail) : null;

  const head = (
    <View style={s.pad}>
      <View style={s.backline}>
        <BackButton onPress={back} />
        <Txt style={s.backTxt} numberOfLines={1}>{label || "Browse"}</Txt>
      </View>

      <View style={s.headerShadow}>
        <View style={s.header}>
          <LinearGradient colors={["rgba(246,248,242,0.95)", "rgba(220,230,228,0.85)"] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(196,198,224,0.75)", "rgba(255,255,255,0)"] as const}
            start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.8 }} style={StyleSheet.absoluteFill} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>{(label || "The set").toUpperCase()}</Eyebrow>
            <Txt style={s.title} numberOfLines={3}>{detail?.name || (detail === null ? "Set" : " ")}</Txt>
            {facts ? <Txt style={s.sub} numberOfLines={2}>{facts}</Txt> : null}
          </View>
          {logo ? <Image source={{ uri: logo }} style={s.logo} resizeMode="contain" /> : null}
        </View>
      </View>

      <PearlField value={q} onChangeText={setQ} placeholder={sport ? "Search this set's players" : "Search this set"} />

      {detail && cards.length > 0 && (
        <View style={s.controls}>
          <Txt style={s.count}>
            {q.trim() ? `${shown.length} of ${cards.length.toLocaleString()} ${noun}` : `${cards.length.toLocaleString()} ${noun}`}
          </Txt>
          {!sport && priced > 0 && <SortButton label={SORT_LABEL[sort]} onPress={() => setSheet(true)} />}
        </View>
      )}

      {!sport && detail && sort !== "number" && priced > 0 && priced < cards.length && (
        <Callout
          title="Some prices aren’t available"
          body="Cards without a raw price have no estimate. They appear last when sorted by price."
        />
      )}
      <View style={{ height: 14 }} />
    </View>
  );

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <FlatList
        data={data}
        keyExtractor={(c, i) => `${c.cardId}:${i}`}
        numColumns={2}
        columnWrapperStyle={s.row}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={head}
        initialNumToRender={8}
        windowSize={9}
        onViewableItemsChanged={sport ? onViewable : undefined}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        ListEmptyComponent={
          detail === undefined ? (
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => <View key={i} style={s.row}><PriceTileBone /><PriceTileBone /></View>)}
            </View>
          ) : detail === null ? (
            <EmptyState title="This set couldn't be loaded" body="Its catalogue didn't answer. Go back and try again in a moment." />
          ) : cards.length ? (
            <EmptyState title="No cards match" body="Try a card name or number, or clear your search."
              action={{ label: "Clear search", onPress: () => setQ("") }} />
          ) : (
            <EmptyState title="No cards listed" body="This set has no cards in the catalogue yet." />
          )
        }
        ListFooterComponent={
          cards.length > 0 ? (
            <Txt style={[s.caption, s.pad]}>
              {sport
                ? "Sports prices are the cheapest single copy of each player on sale on eBay right now. Base cards are usually the cheapest; parallels and numbered cards list for more."
                : `Raw values are the catalogue's ungraded prices in ${dollars(1, fx).ccy}, not graded slabs.`}
            </Txt>
          ) : null
        }
        renderItem={({ item, index }) => {
          if (item.cardId === "__pad") return <View style={{ flex: 1 }} />;
          const c = item as Card;
          const image = c.imageUrl ?? art[c.cardId] ?? null;
          const ask = c.askFrom ?? asks[c.cardId] ?? null;
          const askKnown = c.askFrom != null || c.cardId in asks;
          return (
            <PriceTile
              name={c.name}
              number={c.localId || null}
              imageUrl={image}
              usd={sport ? ask?.price ?? null : c.rawUsd}
              currency={sport ? ask?.currency ?? "USD" : "USD"}
              note={sport && ask?.count ? `${ask.count.toLocaleString()} listed on eBay` : null}
              fx={fx}
              alt={index % 2 === 1}
              label={sport ? "LISTED FROM" : "RAW · UNGRADED"}
              priceWhy={sport ? (askKnown ? NOTHING_LISTED_WHY : CHECKING_LISTINGS_WHY) : undefined}
              followed={quick.isFollowed(c.cardId)}
              onFollow={() => quick.toggle({
                cardId: c.cardId, name: c.name, setName: detail?.name ?? null,
                number: c.localId || null, imageUrl: image,
              })}
              onPress={() => router.push({ pathname: "/card/[id]", params: { id: c.cardId, set: setId } } as never)}
            />
          );
        }}
      />

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onReset={() => setSort("number")}
        canReset={sort !== "number"}
        applyLabel={`Show ${shown.length.toLocaleString()} ${noun}`}
      >
        <FilterGroup title="Sort by" value={SORT_LABEL[sort]} open onToggle={() => {}}>
          {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
            <RadioRow key={k} label={SORT_LABEL[k]} on={sort === k} onPress={() => setSort(k)} />
          ))}
        </FilterGroup>
      </FilterSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  backline: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6, paddingBottom: 12 },
  backTxt: { fontFamily: fonts.medium, fontSize: 14, lineHeight: lh(14), color: lens.ink, flexShrink: 1 },

  headerShadow: {
    borderRadius: 22,
    shadowColor: "#263D4C", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 9 }, elevation: 4,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12, minHeight: 120, padding: 18,
    borderRadius: 22, overflow: "hidden", borderWidth: 1.5, borderColor: "#FFFFFF",
  },
  title: { fontFamily: fonts.semi, fontSize: 28, lineHeight: lh(28), letterSpacing: -1, color: lens.ink, marginTop: 6 },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: lh(14), color: lens.inkSoft, marginTop: 2 },
  logo: { width: 96, height: 60 },

  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 },
  count: { fontFamily: fonts.regular, fontSize: 14, lineHeight: lh(14), color: lens.inkSoft },

  row: { gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 8 },
});
