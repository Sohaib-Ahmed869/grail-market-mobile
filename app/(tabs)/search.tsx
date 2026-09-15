import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Linking, Pressable, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { CardArt } from "../../components/CardArt";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { ActiveBar, FilterGroup, FilterSheet, RadioRow } from "../../components/FilterSheet";
import {
  FollowPlus, GameTile, GameTileBone, Segmented, editionName, gameName, useQuickFollow,
} from "../../components/CatalogueTiles";
import { money, useFx } from "../../lib/fx";
import { searchCards, type CardHit } from "../../lib/cards";
import { lookup, looksLikeCode, type Lookup } from "../../lib/lookup";
import { browseGames, type BrowseGame } from "../../lib/cardmarket";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { gameTheme, sportOf, type GameTheme } from "../../lib/games";
import { colors, radius, shadow, space, type } from "../../theme";

type Cat = "all" | "tcg" | "sports" | "entertainment";
const CATS: { id: Cat; label: string; title: string }[] = [
  { id: "all", label: "All", title: "Everything we list" },
  { id: "tcg", label: "TCG", title: "Trading card games" },
  { id: "sports", label: "Sports", title: "Sports cards" },
  { id: "entertainment", label: "Licensed", title: "Licensed & entertainment" },
];

/** A game's category, with sports read off the id as well as the server's
 *  field — an API build older than the sports catalogue sends no category
 *  for a `ch:` game, and that must still land under Sports. */
/** Language editions are not games on this screen. Japanese Pokémon is
 *  Pokémon: you open Pokémon and choose the language there, the way a shop
 *  shelves a game once and asks which language you want. */
const catOf = (g: BrowseGame): Cat | "language" =>
  sportOf(g.id) ? "sports"
  : g.baseGame || g.languageName || g.category === "japanese" || g.category === "language" ? "language"
  : ((g.category as Cat | undefined) ?? "tcg");

type GridRow =
  | { kind: "head"; key: string; title: string; sub: string }
  | { kind: "row"; key: string; games: BrowseGame[] };

type GameSort = "popular" | "az";
type Sort = "relevance" | "name" | "dear" | "cheap";

const SORT_LABEL: Record<Sort, string> = {
  relevance: "Best match", name: "A to Z", dear: "Highest price", cheap: "Lowest price",
};

/** What was searched for lately. Module-level, so it survives leaving the
 *  tab and coming back; it does not survive a restart, and that is fine for
 *  a list whose whole job is "the thing I typed a minute ago". */
let RECENT: string[] = [];

/** The Catalogue.
 *
 *  Two levels, the way every collector app people already use is built: the
 *  first screen is every game and sport we list, as a grid; a tile opens that
 *  game's own page with its sets and its cards side by side. This screen used
 *  to try to be both levels at once — the games collapsing into a rail over
 *  a set grid — and read as neither.
 *
 *  "Moving now" is gone from here on purpose. It is on the dashboard, and
 *  above the grid it pushed the one thing this screen is for below the fold.
 *
 *  Typing runs the query once the typing pauses, and each query carries a
 *  sequence number so a slow reply for "char" can never overwrite a fast one
 *  for "charizard".
 */
export default function Search() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const fx = useFx();
  const quick = useQuickFollow();
  const router = useRouter();
  // `?game=` is how the dashboard's game row opens a game, and `?filters=1`
  // opens the sheet — a screen you can only reach by tapping is a screen you
  // cannot link to from a notification.
  const { game: wanted, filters: openFilters } =
    useLocalSearchParams<{ game?: string; filters?: string }>();

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<Extract<Lookup, { kind: "cert" }> | null>(null);
  const seq = useRef(0);

  const [games, setGames] = useState<BrowseGame[] | null>(null);
  const [cat, setCat] = useState<Cat>("all");
  const [gameSort, setGameSort] = useState<GameSort>("popular");

  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("relevance");

  const browsing = q.trim().length < 2;

  useEffect(() => {
    let alive = true;
    browseGames().then((g) => { if (alive) setGames(g); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (openFilters === "1") setSheet(true);
  }, [openFilters]);

  const openGame = (g: { id: string; name: string }) =>
    router.push({ pathname: "/game/[id]", params: { id: g.id, name: editionName(g) } } as never);

  // Arriving with a game named hands straight on to that game's page, then
  // forgets the param so coming back to this tab lands on the grid rather
  // than bouncing forward again.
  useEffect(() => {
    if (!wanted) return;
    const g = games?.find((x) => x.id === wanted);
    router.setParams({ game: undefined } as never);
    router.push({ pathname: "/game/[id]", params: g ? { id: g.id, name: editionName(g) } : { id: String(wanted) } } as never);
  }, [wanted]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setSearched(false); setCert(null); return; }
    const mine = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      const r = looksLikeCode(t) ? await viaLookup(t) : { hits: await searchCards(t), cert: null };
      if (mine !== seq.current) return;   // a newer query has already answered
      setHits(r.hits);
      setCert(r.cert);
      setBusy(false);
      setSearched(true);
      if (r.hits.length || r.cert) RECENT = [t, ...RECENT.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  // ---- the grid ----------------------------------------------------------------
  const counts = useMemo(() => {
    const m: Record<Cat | "language", number> = { all: 0, tcg: 0, sports: 0, entertainment: 0, language: 0 };
    for (const g of games ?? []) { const c = catOf(g); m[c] += 1; if (c !== "language") m.all += 1; }
    return m;
  }, [games]);

  const shownGames = useMemo(() => {
    const list = (games ?? []).filter((g) => cat === "all" ? catOf(g) !== "language" : catOf(g) === cat);
    // "Popular" is the server's order, which is written by hand with the
    // games people come for first. A to Z is for the long tail.
    return gameSort === "az" ? [...list].sort((a, b) => gameName(a).localeCompare(gameName(b))) : list;
  }, [games, cat, gameSort]);

  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = [];
    const block = (key: string, title: string, sub: string, list: BrowseGame[]) => {
      if (!list.length) return;
      rows.push({ kind: "head", key: `h:${key}`, title, sub });
      for (let i = 0; i < list.length; i += 2) rows.push({ kind: "row", key: `${key}:${i}`, games: list.slice(i, i + 2) });
    };
    const catTitle = CATS.find((c) => c.id === cat)!.title;
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    const sub = cat === "all"
      ? `${counts.tcg + counts.entertainment} games · ${counts.sports} sports`
      : cat === "sports" ? plural(counts.sports, "sport", "sports") : plural(counts[cat], "game", "games");
    block(cat, catTitle, sub, shownGames);
    return rows;
  }, [shownGames, cat, counts]);

  // ---- results -----------------------------------------------------------------
  // Only what is present in THESE results. A filter offering Lorcana over a
  // list with no Lorcana in it is a dead control.
  const gamesInHits = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hits) m.set(h.game, (m.get(h.game) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [hits]);
  const raritiesInHits = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hits) {
      if (gameFilter && h.game !== gameFilter) continue;
      if (h.rarity && h.rarity !== "None") m.set(h.rarity, (m.get(h.rarity) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [hits, gameFilter]);
  const shown = useMemo(() => {
    let list = hits;
    if (gameFilter) list = list.filter((h) => h.game === gameFilter);
    if (rarityFilter) list = list.filter((h) => h.rarity === rarityFilter);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name) || a.setName.localeCompare(b.setName));
    else if (sort === "dear" || sort === "cheap") {
      const dir = sort === "dear" ? -1 : 1;
      // Unpriced last in BOTH directions: no price is not a cheap price, and a
      // "lowest first" list led by the cards we know nothing about would call
      // them the bargains.
      list = [...list].sort((a, b) => {
        const x = a.rawUsd ?? null, y = b.rawUsd ?? null;
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * dir;
      });
    }
    return list;
  }, [hits, gameFilter, rarityFilter, sort]);

  // The sheet counts and resets the list that is on screen, never the other
  // one — a badge saying "1 filter" over a grid nothing in the sheet touched
  // is how this screen came to lie about itself before.
  const filtersOn = browsing
    ? (cat !== "all" ? 1 : 0) + (gameSort !== "popular" ? 1 : 0)
    : (gameFilter ? 1 : 0) + (rarityFilter ? 1 : 0) + (sort !== "relevance" ? 1 : 0);
  const reset = () => {
    if (browsing) { setCat("all"); setGameSort("popular"); return; }
    setGameFilter(null); setRarityFilter(null); setSort("relevance");
  };
  const toggle = (k: string) => setOpen(open === k ? null : k);

  const labelOf = (id: string) => {
    const g = games?.find((x) => x.id === id);
    return g ? gameName(g) : gameTheme(id).label;
  };

  const openCard = (h: CardHit) =>
    // A sports entry only resolves inside its set — it has no id of its own
    // anywhere else — so the set travels with it. A trading card opens alone,
    // as it always did.
    router.push({
      pathname: "/card/[id]",
      params: sportOf(h.game) ? { id: h.cardId, set: h.setId } : { id: h.cardId },
    } as never);

  const head = (
    <View style={s.head}>
      <Txt variant="display">Catalogue</Txt>
      <View style={s.fieldRow}>
        <View style={s.field}>
          <Feather name="search" size={17} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Cards, players, sets or cert number"
            placeholderTextColor={colors.inkFaint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={s.input}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear">
              <Feather name="x-circle" size={17} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setSheet(true)}
          style={({ pressed }) => [s.filterBtn, filtersOn > 0 && s.filterBtnOn, pressed && { opacity: 0.85 }]}
          accessibilityLabel="Filters"
        >
          <Feather name="sliders" size={18} color={filtersOn > 0 ? colors.onPrimary : colors.ink} />
          {filtersOn > 0 && <View style={s.badge}><Txt style={s.badgeTxt}>{filtersOn}</Txt></View>}
        </Pressable>
      </View>

      {RECENT.length > 0 && browsing && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recent}
          style={{ marginHorizontal: -space.xl }} keyboardShouldPersistTaps="handled">
          <Feather name="clock" size={13} color={colors.inkFaint} style={{ alignSelf: "center" }} />
          {RECENT.map((r) => (
            <Pressable key={r} onPress={() => setQ(r)} style={({ pressed }) => [s.recentChip, pressed && { opacity: 0.7 }]}>
              <Txt variant="bodySmall" color={colors.inkMuted}>{r}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const catTitle = CATS.find((c) => c.id === cat)!;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />

      {cert ? (
        <>
          {head}
          <CertResult cert={cert} clearance={clearance} />
        </>
      ) : browsing ? (
        <FlatList
          key="games"
          {...navScroll}
          data={games == null ? [] : gridRows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingBottom: clearance }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          ListHeaderComponent={
            <View>
              {head}
              <View style={s.pad}>
                <View style={{ marginTop: space.lg }}>
                  <Segmented<Cat> options={CATS} value={cat} onChange={setCat} />
                </View>
                {games == null && (
                  <View style={s.sectionHead}>
                    <Txt variant="h2">{catTitle.title}</Txt>
                    <Txt variant="bodySmall" color={colors.inkFaint}>Loading</Txt>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            games == null ? (
              <View style={{ gap: space.md }}>
                {[0, 1, 2].map((i) => <View key={i} style={s.gridRow}><View style={{ flex: 1 }}><GameTileBone /></View><View style={{ flex: 1 }}><GameTileBone /></View></View>)}
              </View>
            ) : cat === "sports" ? (
              <Empty icon="activity" title="Sports is still loading in"
                body="The sports catalogue hasn't answered yet. Pull back in a moment — or search a player's name above." />
            ) : (
              <Empty icon="wifi-off" title="Couldn't load the catalogue" body="Search by card name above while it comes back." />
            )
          }
          renderItem={({ item }) =>
            item.kind === "head" ? (
              <View style={[s.pad, s.sectionHead]}>
                <Txt variant="h2">{item.title}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint}>{item.sub}</Txt>
              </View>
            ) : (
              <View style={s.gridRow}>
                {/* Each in its own flex cell: a tile sizes itself by aspect
                    ratio, and an aspect-ratio box that is also the flex item
                    takes its width from its content instead of the row. */}
                {item.games.map((g) => <View key={g.id} style={{ flex: 1 }}><GameTile game={g} onPress={() => openGame(g)} /></View>)}
                {item.games.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            )}
        />
      ) : (
        <FlatList
          key="cards"
          {...navScroll}
          data={shown}
          keyExtractor={(c, i) => `${c.cardId}:${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: clearance }}
          ListHeaderComponent={
            <View>
              {head}
              {searched && !busy && hits.length > 0 && (
                <View style={s.pad}>
                  <ActiveBar
                    count={shown.length === hits.length ? `${hits.length} results` : `${shown.length} of ${hits.length}`}
                    pills={[
                      gameFilter && { label: labelOf(gameFilter), clear: () => setGameFilter(null) },
                      rarityFilter && { label: rarityFilter, clear: () => setRarityFilter(null) },
                      sort !== "relevance" && { label: SORT_LABEL[sort], clear: () => setSort("relevance") },
                    ]}
                    onOpen={() => { setOpen("game"); setSheet(true); }}
                  />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            busy ? <Loader fill /> : searched ? (
              <Empty icon="search"
                title={hits.length ? "Nothing under that filter" : "No match"}
                body={hits.length ? "Clear a filter to see the rest." : "Try the number printed on the card, or scan it instead."} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => openCard(item)}
              style={({ pressed }) => [s.hit, pressed && { backgroundColor: colors.surfaceSunk }]}>
              <View style={s.hitArt}><CardArt uri={item.imageUrl} iconSize={16} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="h3" numberOfLines={1}>{item.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                  {[item.setName, item.localId ? `#${item.localId}` : null].filter(Boolean).join(" · ")}
                </Txt>
                <View style={s.hitTags}>
                  <Tag theme={gameTheme(item.game)}>{labelOf(item.game)}</Tag>
                  {item.rarity && item.rarity !== "None" ? <Tag gold>{item.rarity}</Tag> : null}
                </View>
              </View>
              {/* The ungraded price, when the catalogue publishes one for this
                  exact card, and the "+" beside it — follow without opening. */}
              <View style={s.hitEnd}>
                {item.rawUsd != null
                  ? <Txt style={s.hitPrice}>{money(item.rawUsd, { fx, from: "USD" })}</Txt>
                  : null}
                {item.cardId !== "market" && !sportOf(item.game) && (
                  <FollowPlus on={quick.isFollowed(item.cardId)}
                    onPress={() => quick.toggle({
                      cardId: item.cardId, name: item.name, setName: item.setName,
                      number: item.localId || null, imageUrl: item.imageUrl,
                    })} />
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onReset={reset}
        canReset={filtersOn > 0}
        applyLabel={browsing
          ? `Show ${shownGames.length} ${shownGames.length === 1 ? "game" : "games"}`
          : `Show ${shown.length} ${shown.length === 1 ? "result" : "results"}`}
      >
        {browsing ? (
          <>
            <FilterGroup title="Category" value={CATS.find((c) => c.id === cat)!.title}
              open={open === "category" || open == null} onToggle={() => setOpen(open === "category" || open == null ? "none" : "category")}>
              {CATS.map((c) => (
                <RadioRow key={c.id} label={c.id === "all" ? "All categories" : c.title} on={cat === c.id}
                  onPress={() => setCat(c.id)} count={games ? counts[c.id] : undefined} />
              ))}
            </FilterGroup>
            <FilterGroup title="Sort by" value={gameSort === "popular" ? "Most popular" : "A to Z"}
              open={open === "sort"} onToggle={() => toggle("sort")}>
              <RadioRow label="Most popular" on={gameSort === "popular"} onPress={() => setGameSort("popular")} />
              <RadioRow label="A to Z" on={gameSort === "az"} onPress={() => setGameSort("az")} />
            </FilterGroup>
          </>
        ) : (
          <>
            <FilterGroup title="Sort by" value={SORT_LABEL[sort]}
              open={open === "sort" || open == null} onToggle={() => setOpen(open === "sort" || open == null ? "none" : "sort")}>
              <RadioRow label="Best match" on={sort === "relevance"} onPress={() => setSort("relevance")} />
              <RadioRow label="A to Z" on={sort === "name"} onPress={() => setSort("name")} />
              {hits.some((h) => h.rawUsd != null) && (
                <>
                  <RadioRow label="Highest price" on={sort === "dear"} onPress={() => setSort("dear")} />
                  <RadioRow label="Lowest price" on={sort === "cheap"} onPress={() => setSort("cheap")} />
                </>
              )}
            </FilterGroup>
            {gamesInHits.length > 1 && (
              <FilterGroup title="Game" value={gameFilter ? labelOf(gameFilter) : "Any game"}
                open={open === "game"} onToggle={() => toggle("game")}>
                <RadioRow label="Any game" on={!gameFilter} onPress={() => { setGameFilter(null); setRarityFilter(null); }} count={hits.length} />
                {gamesInHits.map(([g, n]) => (
                  <RadioRow key={g} label={labelOf(g)} on={gameFilter === g} count={n}
                    onPress={() => { setGameFilter(g); setRarityFilter(null); }} />
                ))}
              </FilterGroup>
            )}
            {raritiesInHits.length > 0 && (
              <FilterGroup title="Rarity" value={rarityFilter ?? "Any rarity"}
                open={open === "rarity"} onToggle={() => toggle("rarity")}>
                <RadioRow label="Any rarity" on={!rarityFilter} onPress={() => setRarityFilter(null)} />
                {raritiesInHits.map(([r, n]) => (
                  <RadioRow key={r} label={r} on={rarityFilter === r} count={n} onPress={() => setRarityFilter(r)} />
                ))}
              </FilterGroup>
            )}
          </>
        )}
      </FilterSheet>
    </SafeAreaView>
  );
}

function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Feather name={icon as never} size={22} color={colors.inkFaint} /></View>
      <Txt variant="h3" center style={{ marginTop: space.md }}>{title}</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>{body}</Txt>
    </View>
  );
}

function Tag({ children, gold, theme }: { children: string; gold?: boolean; theme?: GameTheme }) {
  return (
    <View style={[s.tag, gold && s.tagGold, theme && { backgroundColor: theme.wash }]}>
      <Txt style={[s.tagTxt, gold && { color: "#8A6D3B" }, theme && { color: theme.tint }]} numberOfLines={1}>
        {children}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  pad: { paddingHorizontal: space.xl },
  fieldRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  field: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: space.md,
    height: 52, paddingHorizontal: space.lg,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  filterBtn: {
    width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, ...shadow.card,
  },
  filterBtnOn: { backgroundColor: colors.ink },
  badge: {
    position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeTxt: { ...type.overline, fontSize: 11, color: colors.dark },

  recent: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.xl, marginTop: space.md },
  recentChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.field },

  sectionHead: { marginTop: space.xl, marginBottom: space.md },
  gridRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginBottom: space.md },

  hit: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.xl, paddingVertical: space.md,
  },
  hitArt: { width: 56, height: 78, borderRadius: 7, overflow: "hidden", backgroundColor: colors.surfaceSunk, ...shadow.card },
  hitTags: { flexDirection: "row", gap: 5, marginTop: 3 },
  hitEnd: { alignItems: "flex-end", justifyContent: "center", gap: 6, minWidth: 44 },
  hitPrice: { ...type.button, fontSize: 14.5, color: colors.ink, fontVariant: ["tabular-nums"] },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.field },
  tagGold: { backgroundColor: colors.accentWash },
  tagTxt: { ...type.overline, fontSize: 10.5, color: colors.inkMuted },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: colors.field },

  certWrap: { paddingHorizontal: space.xl, paddingTop: space.xl },
  certLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.lg, height: 54,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
});

async function viaLookup(term: string): Promise<{
  hits: CardHit[];
  cert: Extract<Lookup, { kind: "cert" }> | null;
  note: string | null;
}> {
  const r = await lookup(term);
  if (!r) return { hits: [], cert: null, note: null };
  if (r.kind === "cert") return { hits: [], cert: r, note: null };
  if (r.kind === "card") return { hits: [r.card], cert: null, note: null };
  return { hits: r.results, cert: null, note: r.note ?? null };
}

/** A certificate number, handed to the company that issued it.
 *
 *  We hold no grading company's data and are not going to pretend to. Their
 *  register is the only authority on whether a slab is real, so the honest
 *  answer to a cert number is a door to it — and when the number alone does
 *  not say which company, all four doors rather than a guess. */
function CertResult({ cert, clearance }: { cert: Extract<Lookup, { kind: "cert" }>; clearance: number }) {
  return (
    <View style={[s.certWrap, { paddingBottom: clearance }]}>
      <Txt variant="h2">Certificate {cert.cert}</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        {cert.grader
          ? `Check it on ${cert.grader}'s own register — they are the only authority on it.`
          : "That number doesn't say which company graded it. Try the registers below."}
      </Txt>
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {cert.links.map((l) => (
          <Pressable key={l.grader} onPress={() => Linking.openURL(l.url)}
            style={({ pressed }) => [s.certLink, pressed && { opacity: 0.7 }]}>
            <Txt variant="button">Check with {l.grader}</Txt>
            <Feather name="external-link" size={15} color={colors.inkMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
