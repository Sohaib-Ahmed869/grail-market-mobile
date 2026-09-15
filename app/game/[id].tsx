import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { BackButton } from "../../components/BackButton";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { ActiveBar, FilterGroup, FilterSheet, RadioRow } from "../../components/FilterSheet";
import {
  CardCell, ProductTile, Segmented, SetTile, SetTileBone, editionName, useQuickFollow,
} from "../../components/CatalogueTiles";
import {
  allSets, browseGames, sealedPage, setDetail,
  type BrowseGame, type SealedGroup, type SealedProduct, type SetDetail, type SetSummary,
} from "../../lib/cardmarket";
import { searchCards, type CardHit } from "../../lib/cards";
import { gameTheme, sportOf } from "../../lib/games";
import { useFx } from "../../lib/fx";
import { useBack } from "../../lib/nav";
import { useSportsArt } from "../../lib/sportsart";
import { colors, radius, shadow, space, type } from "../../theme";

type Tab = "sealed" | "sets" | "cards";
type SealedSort = "newest" | "dear" | "cheap";

/** What kind of product, read off its name. Order matters: a "Booster Box
 *  Case" is a case, not a booster box. */
const PRODUCT_TYPES: [string, RegExp][] = [
  ["Case", /\bcase\b/i],
  ["Elite Trainer Box", /elite trainer box/i],
  ["Booster Box", /booster (box|display)/i],
  ["Booster Pack", /booster pack|sleeved booster|\bpack\b/i],
  ["Bundle", /bundle/i],
  ["Tin", /\btin\b/i],
  ["Deck", /\bdeck\b/i],
  ["Collection", /collection|premium|box set|\bbox\b/i],
];
const productType = (name: string) => PRODUCT_TYPES.find(([, re]) => re.test(name))?.[0] ?? "Other";
type SetSort = "newest" | "oldest" | "az" | "biggest" | "listed";
type CardSort = "number" | "dear" | "cheap" | "name";
type Card = SetDetail["cards"][number];
type Group = { set: SetSummary; cards: Card[] };

const CARD_SORTS: { id: CardSort; label: string; needsPrice?: boolean }[] = [
  { id: "number", label: "Set order" },
  { id: "dear", label: "Most valuable", needsPrice: true },
  { id: "cheap", label: "Least valuable", needsPrice: true },
  { id: "name", label: "A to Z" },
];

/** One game: its sets, and its cards.
 *
 *  The catalogue used to open a game straight onto a grid of its sets, and a
 *  set straight onto its cards — so the only way to see a game's cards was
 *  to guess which set they were in first. Now the two are side by side on a
 *  track, and Cards is the whole game, newest set first, loading the next
 *  set as you reach the end of the last.
 *
 *  It pages by SET rather than by card on purpose. Every catalogue behind
 *  this answers a set whole and none of them answers "the next hundred cards
 *  of Magic", so a set is the unit that costs one cached request — and a
 *  header per set is what tells you where in the game you are.
 */
export default function GameScreen() {
  const { id: rawId, name: passedName, tab: passedTab } =
    useLocalSearchParams<{ id: string; name?: string; tab?: string }>();
  const id = String(rawId);
  const router = useRouter();
  const back = useBack("/(tabs)/search");
  const insets = useSafeAreaInsets();
  const fx = useFx();
  const quick = useQuickFollow();
  const sport = sportOf(id) != null;

  const [name, setName] = useState<string>(passedName ? String(passedName) : "");
  // Sealed first: a game is browsed by what you can buy in a shop — the
  // boxes, tins and collections — before it is browsed card by card.
  const [tab, setTab] = useState<Tab>(passedTab === "cards" ? "cards" : passedTab === "sets" ? "sets" : sportOf(String(rawId)) ? "sets" : "sealed");
  const [q, setQ] = useState("");
  // A link that names a tab wins, including one arriving on this page again.
  useEffect(() => { if (passedTab === "cards" || passedTab === "sets" || passedTab === "sealed") setTab(passedTab); }, [passedTab]);

  // ---- the game, and the other editions of it ----------------------------------
  // Read even when the name was passed: the language editions of this game
  // come from the same list, and the page offers them as a switch.
  const [games, setGames] = useState<BrowseGame[] | null>(null);
  useEffect(() => {
    let alive = true;
    browseGames().then((gs) => {
      if (!alive) return;
      setGames(gs);
      const g = gs.find((x) => x.id === id);
      if (!passedName) setName(g ? editionName(g) : id.replace(/^[a-z]+:/i, ""));
    });
    return () => { alive = false; };
  }, [id, passedName]);

  const me = games?.find((g) => g.id === id) ?? null;
  const base = me?.baseGame ?? id;
  /** English first, then each language edition of the same game. Empty when
   *  the game has no other edition, and then the row is not drawn at all. */
  const editions = useMemo(() => {
    const list = (games ?? []).filter((g) => g.id === base || g.baseGame === base);
    return list.length > 1 ? list : [];
  }, [games, base]);

  // ---- sets --------------------------------------------------------------------
  const [sets, setSets] = useState<SetSummary[] | null>(null);
  useEffect(() => {
    let alive = true;
    setSets(null);
    allSets(id).then((r) => { if (alive) setSets(r); });
    return () => { alive = false; };
  }, [id]);

  // ---- sealed product --------------------------------------------------------------
  const [sealed, setSealed] = useState<SealedGroup[]>([]);
  const [sealedNext, setSealedNext] = useState<number | null>(0);
  const [sealedBusy, setSealedBusy] = useState(false);
  /** null until the first page answers; false when the game has no sealed
   *  catalogue at all (sports, most language editions). */
  const [sealedSupported, setSealedSupported] = useState<boolean | null>(null);
  const [sealedSort, setSealedSort] = useState<SealedSort>("newest");
  const [ptype, setPtype] = useState<string | null>(null);
  const sealedEpoch = useRef(0);

  useEffect(() => {
    sealedEpoch.current += 1;
    setSealed([]); setSealedNext(0); setSealedSupported(null); setSealedBusy(false);
  }, [id]);

  const loadSealed = useCallback(async () => {
    if (sealedBusy || sealedNext == null) return;
    const mine = sealedEpoch.current;
    setSealedBusy(true);
    const page = await sealedPage(id, sealedNext);
    if (mine !== sealedEpoch.current) return;
    setSealedBusy(false);
    if (!page) { setSealedNext(null); if (sealedSupported == null) setSealedSupported(true); return; }
    setSealedSupported(page.supported);
    setSealed((g) => [...g, ...page.groups]);
    setSealedNext(page.next);
    // A game with no sealed catalogue has nothing to show on its first tab;
    // move to Sets rather than open onto an explanation, unless a link asked
    // for this tab by name.
    if (!page.supported && passedTab !== "sealed") setTab("sets");
  }, [sealedBusy, sealedNext, id, sealedSupported, passedTab]);

  useEffect(() => {
    if (tab === "sealed" && sealed.length === 0 && sealedNext === 0 && !sealedBusy) void loadSealed();
  }, [tab, sealed.length, sealedNext, sealedBusy, loadSealed]);

  const sealedTypes = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of sealed) for (const p of g.products) { const t = productType(p.name); m.set(t, (m.get(t) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [sealed]);

  type SealedRow =
    | { kind: "head"; key: string; group: SealedGroup; n: number }
    | { kind: "row"; key: string; group: SealedGroup; products: SealedProduct[] };
  const sealedRows = useMemo<SealedRow[]>(() => {
    const rows: SealedRow[] = [];
    const needle = q.trim().toLowerCase();
    for (const g of sealed) {
      let list = g.products;
      if (ptype) list = list.filter((p) => productType(p.name) === ptype);
      if (needle) list = list.filter((p) => p.name.toLowerCase().includes(needle));
      if (!list.length) continue;
      if (sealedSort !== "newest") {
        const dir = sealedSort === "dear" ? -1 : 1;
        // Unpriced last both ways — see sortCards.
        list = [...list].sort((a, b) =>
          a.marketUsd == null ? (b.marketUsd == null ? 0 : 1) : b.marketUsd == null ? -1 : (a.marketUsd - b.marketUsd) * dir);
      }
      rows.push({ kind: "head", key: `h:${g.setId}`, group: g, n: list.length });
      for (let i = 0; i < list.length; i += 2) rows.push({ kind: "row", key: `${g.setId}:${i}`, group: g, products: list.slice(i, i + 2) });
    }
    return rows;
  }, [sealed, ptype, q, sealedSort]);
  const sealedCount = useMemo(() => sealedRows.reduce((n, r) => n + (r.kind === "row" ? r.products.length : 0), 0), [sealedRows]);

  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<string | null>("sort");
  const [setSort, setSetSort] = useState<SetSort>("newest");
  const [year, setYear] = useState<string | null>(null);

  const years = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sets ?? []) {
      const y = s.releasedAt?.slice(0, 4);
      if (y && /^\d{4}$/.test(y)) m.set(y, (m.get(y) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sets]);

  const hasCounts = useMemo(() => (sets ?? []).some((s) => s.total > 0), [sets]);
  const hasListed = useMemo(() => (sets ?? []).some((s) => (s.listed ?? 0) > 0), [sets]);
  const setSorts = useMemo(() => [
    { id: "newest" as const, label: "Newest first" },
    { id: "oldest" as const, label: "Oldest first" },
    { id: "az" as const, label: "A to Z" },
    ...(hasCounts ? [{ id: "biggest" as const, label: "Most cards" }] : []),
    ...(hasListed ? [{ id: "listed" as const, label: "Most listed" }] : []),
  ], [hasCounts, hasListed]);

  const shownSets = useMemo(() => {
    let list = sets ?? [];
    if (year) list = list.filter((s) => s.releasedAt?.startsWith(year));
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((s) => s.name.toLowerCase().includes(needle));
    // The catalogue answers newest first already, and half of them publish
    // no release date, so "newest" is the order we leave alone rather than
    // re-sort on a field that is null on every row.
    if (setSort === "newest") return list;
    const copy = [...list];
    if (setSort === "oldest") copy.reverse();
    else if (setSort === "az") copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (setSort === "biggest") copy.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    else copy.sort((a, b) => (b.listed ?? 0) - (a.listed ?? 0) || a.name.localeCompare(b.name));
    return copy;
  }, [sets, year, q, setSort]);

  // ---- cards -------------------------------------------------------------------
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const cursor = useRef(0);
  const [exhausted, setExhausted] = useState(false);
  const [onlySet, setOnlySet] = useState<string | null>(null);
  const [cardSort, setCardSort] = useState<CardSort>("number");
  const [rarity, setRarity] = useState<string | null>(null);
  /** Bumped whenever the list is reset, so a set still downloading for the
   *  previous filter cannot land in the new one. */
  const epoch = useRef(0);

  // The order Cards walks the game in is the catalogue's own — newest first —
  // not whatever the Sets tab is sorted by. Sorting sets A to Z and then
  // finding Cards also starts at "Aquapolis" would be two tabs quietly
  // sharing a setting nobody set on the second one.
  const walk = useMemo(
    () => (onlySet ? (sets ?? []).filter((s) => s.setId === onlySet) : sets ?? []),
    [sets, onlySet],
  );

  const loadMore = useCallback(async () => {
    if (loadingCards || exhausted || !sets) return;
    const mine = epoch.current;
    setLoadingCards(true);
    // Up to three sets per pull, stopping at the first with cards in it: a
    // run of empty promo sets must not leave the list looking finished.
    for (let tries = 0; tries < 3; tries++) {
      const next = walk[cursor.current];
      if (!next) { setExhausted(true); break; }
      cursor.current += 1;
      const d = await setDetail(next.setId);
      if (mine !== epoch.current) return;
      if (d?.cards.length) {
        setGroups((g) => [...g, { set: { ...next, name: d.name || next.name }, cards: d.cards }]);
        break;
      }
    }
    if (mine === epoch.current) setLoadingCards(false);
  }, [loadingCards, exhausted, sets, walk]);

  // Start over when the walk changes.
  useEffect(() => {
    epoch.current += 1;
    cursor.current = 0;
    setGroups([]);
    setExhausted(false);
    setLoadingCards(false);
  }, [walk]);

  useEffect(() => {
    if (tab === "cards" && sets && groups.length === 0 && !exhausted && !loadingCards) void loadMore();
  }, [tab, sets, groups.length, exhausted, loadingCards, loadMore]);

  // Typing on the Cards tab searches the whole game, not just the sets that
  // happen to be loaded — a filter over what has scrolled past would say "no
  // match" about a card two sets further down.
  const [hits, setHits] = useState<CardHit[] | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const t = q.trim();
    if (tab !== "cards" || t.length < 2) { setHits(null); return; }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const r = await searchCards(t);
      if (mine === seq.current) setHits(r.filter((h) => h.game === id));
    }, 280);
    return () => clearTimeout(timer);
  }, [q, tab, id]);

  // Sports players mostly arrive without a picture; ask for the ones that
  // scroll into view. A ref, because FlatList refuses a viewability callback
  // that changes identity between renders.
  const { art, want } = useSportsArt();
  const onViewable = useRef(({ viewableItems }: { viewableItems: { item: { kind: string; cards?: { cardId: string; imageUrl: string | null }[] } }[] }) => {
    want(viewableItems.flatMap((v) => (v.item.cards ?? []).filter((c) => !c.imageUrl).map((c) => c.cardId)));
  }).current;

  const loadedCards = useMemo(() => groups.flatMap((g) => g.cards), [groups]);
  const priced = useMemo(() => loadedCards.some((c) => c.rawUsd != null), [loadedCards]);
  const rarities = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of loadedCards) if (c.rarity && c.rarity !== "None") m.set(c.rarity, (m.get(c.rarity) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [loadedCards]);

  type Row =
    | { kind: "head"; key: string; set: SetSummary; n: number }
    | { kind: "row"; key: string; set: SetSummary | null; cards: (Card | CardHit)[] };

  const cardRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    const chunk = (key: string, set: SetSummary | null, list: (Card | CardHit)[]) => {
      for (let i = 0; i < list.length; i += 3) rows.push({ kind: "row", key: `${key}:${i}`, set, cards: list.slice(i, i + 3) });
    };
    if (hits) { chunk("hits", null, hits); return rows; }
    for (const g of groups) {
      let list = g.cards;
      if (rarity) list = list.filter((c) => c.rarity === rarity);
      if (!list.length) continue;
      list = sortCards(list, cardSort);
      rows.push({ kind: "head", key: `h:${g.set.setId}`, set: g.set, n: list.length });
      chunk(g.set.setId, g.set, list);
    }
    return rows;
  }, [groups, rarity, cardSort, hits]);

  // ---- the sheet ---------------------------------------------------------------
  const setFiltersOn = (setSort !== "newest" ? 1 : 0) + (year ? 1 : 0);
  const cardFiltersOn = (cardSort !== "number" ? 1 : 0) + (rarity ? 1 : 0) + (onlySet ? 1 : 0);
  const sealedFiltersOn = (sealedSort !== "newest" ? 1 : 0) + (ptype ? 1 : 0);
  const filtersOn = tab === "sealed" ? sealedFiltersOn : tab === "sets" ? setFiltersOn : cardFiltersOn;
  const reset = () => {
    if (tab === "sealed") { setSealedSort("newest"); setPtype(null); }
    else if (tab === "sets") { setSetSort("newest"); setYear(null); }
    else { setCardSort("number"); setRarity(null); setOnlySet(null); }
  };
  const toggle = (k: string) => setOpen(open === k ? null : k);

  const openSet = (setId: string) => router.push(`/set/${encodeURIComponent(setId)}` as never);
  const openCard = (cardId: string, setId?: string | null) =>
    router.push({ pathname: "/card/[id]", params: setId ? { id: cardId, set: setId } : { id: cardId } } as never);

  const setsLabel = sets == null ? "Loading sets" : `${sets.length.toLocaleString()} sets`;

  const head = (
    <View>
      <View style={s.top}>
        <BackButton onPress={back} />
        <Pressable onPress={() => setSheet(true)} accessibilityLabel="Filters"
          style={({ pressed }) => [s.filterBtn, filtersOn > 0 && s.filterBtnOn, pressed && { opacity: 0.85 }]}>
          <Feather name="sliders" size={17} color={filtersOn > 0 ? colors.onPrimary : colors.ink} />
          {filtersOn > 0 && <View style={s.badge}><Txt style={s.badgeTxt}>{filtersOn}</Txt></View>}
        </Pressable>
      </View>

      <View style={s.pad}>
        <Txt variant="display" numberOfLines={2}>{name || " "}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
          {setsLabel} · {sport ? "Sports" : me?.languageName ? `${me.languageName} edition` : "Trading card game"}
        </Txt>

        {editions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -space.xl, marginTop: space.md }} contentContainerStyle={s.editions}>
            {editions.map((g) => {
              const on = g.id === id;
              return (
                <Pressable key={g.id}
                  onPress={() => { if (!on) router.replace({ pathname: "/game/[id]", params: { id: g.id, name: editionName(g), tab } } as never); }}
                  style={({ pressed }) => [s.edition, on && s.editionOn, pressed && !on && { opacity: 0.7 }]}
                  accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Txt variant="label" color={on ? colors.onPrimary : colors.ink} style={{ fontSize: 13 }}>
                    {g.languageName ?? "English"}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ marginTop: space.lg }}>
          <Segmented<Tab>
            options={[
              ...(sealedSupported === false ? [] : [{ id: "sealed" as const, label: "Sealed" }]),
              { id: "sets" as const, label: "Sets" },
              { id: "cards" as const, label: sport ? "Players" : "Cards" },
            ]}
            value={tab}
            onChange={(t) => { setTab(t); setQ(""); }}
          />
        </View>

        <View style={s.field}>
          <Feather name="search" size={16} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tab === "sealed" ? `Search ${name || "this game"} boxes & packs` : tab === "sets" ? `Search ${name || "this game"} sets` : `Search ${name || "this game"} ${sport ? "players" : "cards"}`}
            placeholderTextColor={colors.inkFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={s.input}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear">
              <Feather name="x-circle" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        <ActiveBar
          count={tab === "sealed"
            ? (sealed.length ? `${sealedCount} ${sealedCount === 1 ? "product" : "products"}` : null)
            : tab === "sets"
            ? (sets == null ? null : `${shownSets.length.toLocaleString()} ${shownSets.length === 1 ? "set" : "sets"}`)
            : hits ? `${hits.length} ${hits.length === 1 ? "match" : "matches"}`
            : groups.length ? `${groups.length} ${groups.length === 1 ? "set" : "sets"} loaded` : null}
          pills={tab === "sealed"
            ? [
                ptype && { label: ptype, clear: () => setPtype(null) },
                sealedSort !== "newest" && { label: sealedSort === "dear" ? "Highest price" : "Lowest price", clear: () => setSealedSort("newest") },
              ]
            : tab === "sets"
            ? [
                setSort !== "newest" && { label: setSorts.find((x) => x.id === setSort)?.label ?? "", clear: () => setSetSort("newest") },
                year && { label: year, clear: () => setYear(null) },
              ]
            : [
                onlySet && { label: sets?.find((x) => x.setId === onlySet)?.name ?? "One set", clear: () => setOnlySet(null) },
                rarity && { label: rarity, clear: () => setRarity(null) },
                cardSort !== "number" && { label: CARD_SORTS.find((x) => x.id === cardSort)!.label, clear: () => setCardSort("number") },
              ]}
          onOpen={() => setSheet(true)}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />

      {tab === "sealed" ? (
        <FlatList
          key="sealed"
          data={sealedRows}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
          ListHeaderComponent={head}
          onEndReachedThreshold={0.6}
          onEndReached={() => { void loadSealed(); }}
          initialNumToRender={6}
          windowSize={9}
          ListFooterComponent={sealedBusy ? <View style={{ paddingVertical: space.xl }}><Loader /></View> : null}
          ListEmptyComponent={
            sealedBusy || sealedSupported == null ? null : sealedSupported === false ? (
              <Empty title="No sealed products" body="We don't have boxes or packs for this game or language yet." />
            ) : (
              <Empty title={sealed.length ? "Nothing under that filter" : "No sealed products"}
                body={sealed.length ? "Clear the search or a filter to see the rest." : "This game's product list didn't answer. Try again shortly."} />
            )
          }
          renderItem={({ item }) =>
            item.kind === "head" ? (
              <View style={s.groupHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="h2" numberOfLines={1}>{item.group.setName}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    {[item.group.releasedAt?.slice(0, 4), `${item.n} ${item.n === 1 ? "product" : "products"}`].filter(Boolean).join(" · ")}
                  </Txt>
                </View>
              </View>
            ) : (
              <View style={s.productRow}>
                {item.products.map((p) => (
                  <ProductTile key={p.productId} name={p.name} setName={item.group.setName}
                    imageUrl={p.imageUrl} marketUsd={p.marketUsd} fx={fx}
                    onPress={() => router.push({ pathname: "/sealed/[id]", params: {
                      id: String(p.productId), name: p.name, set: item.group.setName,
                      image: p.imageUrl ?? "", market: p.marketUsd != null ? String(p.marketUsd) : "",
                      low: p.lowUsd != null ? String(p.lowUsd) : "", url: p.url ?? "",
                    } } as never)} />
                ))}
                {item.products.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            )
          }
        />
      ) : tab === "sets" ? (
        <FlatList
          key="sets"
          data={shownSets}
          keyExtractor={(x, i) => `${x.setId}:${i}`}
          numColumns={2}
          columnWrapperStyle={s.gridRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
          ListHeaderComponent={head}
          initialNumToRender={8}
          windowSize={7}
          ListEmptyComponent={
            sets == null ? (
              <View style={[s.gridRow, { paddingHorizontal: space.xl }]}>
                <SetTileBone /><SetTileBone />
              </View>
            ) : (
              <Empty
                title={sets.length ? "No set matches" : "Sets couldn't be loaded"}
                body={sets.length ? "Clear the search or a filter to see the rest." : "Try again in a moment, or search by card name."}
              />
            )
          }
          renderItem={({ item, index }) => (
            <SetTile
              set={item}
              fresh={setSort === "newest" && !q && !year && index < 2 && !sport}
              tint={gameTheme(id).tint}
              onPress={() => openSet(item.setId)}
            />
          )}
        />
      ) : (
        <FlatList
          key="cards"
          data={cardRows}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
          ListHeaderComponent={head}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (!hits) void loadMore(); }}
          onViewableItemsChanged={sport ? onViewable : undefined}
          viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
          initialNumToRender={6}
          windowSize={9}
          ListFooterComponent={
            !hits && loadingCards ? <View style={{ paddingVertical: space.xl }}><Loader /></View> : null
          }
          ListEmptyComponent={
            hits ? (
              <Empty title="No match in this game" body="Try the number printed on the card, or search every game from the Catalogue." />
            ) : loadingCards || !sets ? null : (
              <Empty title={rarity ? "Nothing under that filter" : "No cards to show"} body={rarity ? "Clear the rarity to see the rest." : "This game's catalogue didn't answer. Try again shortly."} />
            )
          }
          renderItem={({ item }) =>
            item.kind === "head" ? (
              <Pressable onPress={() => openSet(item.set.setId)} style={s.groupHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="h2" numberOfLines={1}>{item.set.name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    {[item.set.releasedAt?.slice(0, 4), `${item.n.toLocaleString()} ${sport ? "players" : "cards"}`].filter(Boolean).join(" · ")}
                  </Txt>
                </View>
                <Txt variant="label">Open</Txt>
                <Feather name="chevron-right" size={15} color={colors.ink} />
              </Pressable>
            ) : (
              <View style={s.cardRow}>
                {item.cards.map((c) => {
                  const hit = "setName" in c;
                  return (
                    <CardCell
                      key={c.cardId}
                      name={c.name}
                      number={c.localId || null}
                      imageUrl={c.imageUrl ?? art[c.cardId] ?? null}
                      rawUsd={hit ? ((c as CardHit).rawUsd ?? null) : (c as Card).rawUsd}
                      fx={fx}
                      onPress={() => openCard(c.cardId, hit ? (c as CardHit).setId : item.set?.setId)}
                      // Not on sports rows: a player-in-set has no single price
                      // for an alert to watch move.
                      followed={sport ? undefined : quick.isFollowed(c.cardId)}
                      onFollow={sport ? undefined : () => quick.toggle({
                        cardId: c.cardId, name: c.name,
                        setName: hit ? (c as CardHit).setName : item.set?.name,
                        number: c.localId || null, imageUrl: c.imageUrl ?? art[c.cardId] ?? null,
                      })}
                    />
                  );
                })}
                {/* Keep the last row's cards the same width as a full row. */}
                {Array.from({ length: 3 - item.cards.length }, (_, i) => <View key={i} style={{ flex: 1 }} />)}
              </View>
            )
          }
        />
      )}

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onReset={reset}
        canReset={filtersOn > 0}
        applyLabel={tab === "sealed"
          ? `Show ${sealedCount} ${sealedCount === 1 ? "product" : "products"}`
          : tab === "sets"
          ? `Show ${shownSets.length.toLocaleString()} ${shownSets.length === 1 ? "set" : "sets"}`
          : `Show ${sport ? "players" : "cards"}`}
      >
        {tab === "sealed" ? (
          <>
            <FilterGroup title="Sort by" value={sealedSort === "newest" ? "Newest set first" : sealedSort === "dear" ? "Highest price, within each set" : "Lowest price, within each set"}
              open={open === "sort"} onToggle={() => toggle("sort")}>
              <RadioRow label="Newest set first" on={sealedSort === "newest"} onPress={() => setSealedSort("newest")} />
              <RadioRow label="Highest price" on={sealedSort === "dear"} onPress={() => setSealedSort("dear")} />
              <RadioRow label="Lowest price" on={sealedSort === "cheap"} onPress={() => setSealedSort("cheap")} />
            </FilterGroup>
            {sealedTypes.length > 0 && (
              <FilterGroup title="Product type" value={ptype ?? "All products"} open={open === "type"} onToggle={() => toggle("type")}>
                <RadioRow label="All products" on={!ptype} onPress={() => setPtype(null)} />
                {sealedTypes.map(([t, n]) => <RadioRow key={t} label={t} on={ptype === t} onPress={() => setPtype(t)} count={n} />)}
              </FilterGroup>
            )}
          </>
        ) : tab === "sets" ? (
          <>
            <FilterGroup title="Sort by" value={setSorts.find((x) => x.id === setSort)?.label} open={open === "sort"} onToggle={() => toggle("sort")}>
              {setSorts.map((o) => <RadioRow key={o.id} label={o.label} on={setSort === o.id} onPress={() => setSetSort(o.id)} />)}
            </FilterGroup>
            {years.length > 0 && (
              <FilterGroup title="Release year" value={year ?? "Any year"} open={open === "year"} onToggle={() => toggle("year")}>
                <RadioRow label="Any year" on={!year} onPress={() => setYear(null)} count={sets?.length} />
                {years.map(([y, n]) => <RadioRow key={y} label={y} on={year === y} onPress={() => setYear(y)} count={n} />)}
              </FilterGroup>
            )}
          </>
        ) : (
          <>
            <FilterGroup title="Sort by" value={`${CARD_SORTS.find((x) => x.id === cardSort)!.label}, within each set`}
              open={open === "sort"} onToggle={() => toggle("sort")}>
              {CARD_SORTS.filter((o) => !o.needsPrice || priced).map((o) => (
                <RadioRow key={o.id} label={o.label} on={cardSort === o.id} onPress={() => setCardSort(o.id)} />
              ))}
            </FilterGroup>
            <FilterGroup title="Set" value={onlySet ? sets?.find((x) => x.setId === onlySet)?.name : "Every set, newest first"}
              open={open === "set"} onToggle={() => toggle("set")}>
              <RadioRow label="Every set" on={!onlySet} onPress={() => setOnlySet(null)} />
              {/* The newest sixty. A thousand radio rows is not a filter, it
                  is a second catalogue — anything older is a search away. */}
              {(sets ?? []).slice(0, 60).map((x) => (
                <RadioRow key={x.setId} label={x.name} on={onlySet === x.setId} onPress={() => setOnlySet(x.setId)} />
              ))}
            </FilterGroup>
            {rarities.length > 0 && (
              <FilterGroup title="Rarity" value={rarity ?? "Any rarity"} open={open === "rarity"} onToggle={() => toggle("rarity")}>
                <RadioRow label="Any rarity" on={!rarity} onPress={() => setRarity(null)} />
                {rarities.map(([r, n]) => <RadioRow key={r} label={pretty(r)} on={rarity === r} onPress={() => setRarity(r)} count={n} />)}
              </FilterGroup>
            )}
          </>
        )}
      </FilterSheet>
    </SafeAreaView>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Feather name="search" size={20} color={colors.inkFaint} /></View>
      <Txt variant="h3" center style={{ marginTop: space.md }}>{title}</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>{body}</Txt>
    </View>
  );
}

function sortCards(list: Card[], sort: CardSort): Card[] {
  const byNum = (a: Card, b: Card) => numberOf(a.localId) - numberOf(b.localId) || a.localId.localeCompare(b.localId);
  const out = [...list];
  if (sort === "number") return out.sort(byNum);
  if (sort === "name") return out.sort((a, b) => a.name.localeCompare(b.name) || byNum(a, b));
  const dir = sort === "dear" ? -1 : 1;
  // Unpriced last in BOTH directions. A null is the absence of a number, and
  // "cheapest first" led by the cards we know least about would be calling
  // them the best value in the set.
  return out.sort((a, b) => {
    if (a.rawUsd == null && b.rawUsd == null) return byNum(a, b);
    if (a.rawUsd == null) return 1;
    if (b.rawUsd == null) return -1;
    return (a.rawUsd - b.rawUsd) * dir || byNum(a, b);
  });
}

/** Sports sets have no numbers at all, and their order is the catalogue's —
 *  most-listed player first — which a numeric sort must not scramble. */
const numberOf = (id: string) => {
  const m = id.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

const pretty = (r: string) => r.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  top: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md,
  },
  pad: { paddingHorizontal: space.xl },
  filterBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, ...shadow.card,
  },
  filterBtnOn: { backgroundColor: colors.ink },
  badge: {
    position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeTxt: { ...type.overline, fontSize: 11, color: colors.dark },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 46, marginTop: space.md, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },


  editions: { flexDirection: "row", gap: 6, paddingHorizontal: space.xl },
  edition: { paddingHorizontal: 13, height: 32, borderRadius: radius.pill, justifyContent: "center", backgroundColor: colors.field },
  editionOn: { backgroundColor: colors.ink },
  gridRow: { gap: space.md, paddingHorizontal: space.xl, marginBottom: space.lg },
  productRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginBottom: space.xl },
  cardRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginBottom: space.lg },
  groupHead: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: space.xl, marginTop: space.md, marginBottom: space.md,
  },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.field,
  },
});
