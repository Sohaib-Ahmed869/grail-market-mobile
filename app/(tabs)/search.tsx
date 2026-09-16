import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { CardArt } from "../../components/CardArt";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { FilterGroup, FilterSheet, RadioRow } from "../../components/FilterSheet";
import { FollowPlus, editionName, gameName, useQuickFollow } from "../../components/CatalogueTiles";
import {
  CollectionPanel, EmptyState, Eyebrow, PageSub, PageTitle, PanelBone, PearlField, PearlSegment,
  SectionHead, SetSummaryPanel, SortButton, toneFor,
} from "../../components/Pearl";
import { dollars, lens, lh } from "../../components/MarketLens";
import { useFx } from "../../lib/fx";
import { searchCards, type CardHit } from "../../lib/cards";
import { lookup, looksLikeCode, type Lookup } from "../../lib/lookup";
import { allSets, browseGames, type BrowseGame, type SetSummary } from "../../lib/cardmarket";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { gameTheme, sportOf, type GameTheme } from "../../lib/games";
import { fonts } from "../../theme";

type Tab = "collections" | "sets";
type Cat = "tcg" | "language" | "sports" | "entertainment";
type Sort = "relevance" | "name" | "dear" | "cheap";

const SORT_LABEL: Record<Sort, string> = {
  relevance: "Best match", name: "A to Z", dear: "Highest price", cheap: "Lowest price",
};

/** The games people come for, as full-size panels at the top. */
const POPULAR = ["pokemon", "mtg", "onepiece", "yugioh"];

/** What the Sets tab opens on: the newest sets of the collections people
 *  browse most, English and Japanese Pokémon both, and one sport. Each list
 *  is one cached request, asked for only when the tab is opened. */
const FEATURED: { id: string; take: number }[] = [
  { id: "pokemon", take: 5 },
  { id: "pokemonjp", take: 4 },
  { id: "onepiece", take: 4 },
  { id: "mtg", take: 4 },
  { id: "yugioh", take: 3 },
  { id: "lorcana", take: 3 },
  { id: "sport:basketball", take: 3 },
];

const TAGLINE: Record<string, string> = {
  pokemon: "Explore every era",
  mtg: "From Alpha to today",
  onepiece: "Every printing, every parallel",
  yugioh: "From Legend of Blue-Eyes on",
  lorcana: "Every chapter of the inks",
  pokemonjp: "The Japanese originals",
};

const SECTIONS: { cat: Cat; title: string; unit: [string, string] }[] = [
  { cat: "tcg", title: "Trading card games", unit: ["game", "games"] },
  { cat: "sports", title: "Sports", unit: ["sport", "sports"] },
  { cat: "entertainment", title: "Licensed & entertainment", unit: ["game", "games"] },
];

/** Language editions are not panels of their own. A game is listed once and
 *  its language is chosen on the game's page (settled 2026-09-14); Japanese
 *  sets still lead the Sets tab, and a search for one finds its edition. */
const catOf = (g: BrowseGame): Cat =>
  sportOf(g.id) ? "sports"
  : g.baseGame || g.languageName || g.category === "japanese" || g.category === "language" ? "language"
  : g.category === "entertainment" ? "entertainment"
  : "tcg";

const gameSub = (g: BrowseGame) =>
  TAGLINE[g.id]
  ?? (sportOf(g.id) ? "Players, rookies and parallels"
    : g.languageName ? `The ${g.languageName} printings`
    : "Every set we can reach");

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Row =
  | { kind: "section"; key: string; title: string; sub?: string | null; action?: { label: string; onPress: () => void } }
  | { kind: "game"; key: string; game: BrowseGame; compact: boolean }
  | { kind: "set"; key: string; set: SetSummary; gameId: string; eyebrow: string }
  | { kind: "bone"; key: string; compact?: boolean }
  | { kind: "note"; key: string; text: string }
  | { kind: "loading"; key: string }
  | { kind: "hitsHead"; key: string }
  | { kind: "hit"; key: string; hit: CardHit }
  | { kind: "empty"; key: string; title: string; body: string };

/** What was searched for lately. Module-level, so it survives leaving the
 *  tab and coming back; it does not survive a restart, and that is fine for
 *  a list whose whole job is "the thing I typed a minute ago". */
let RECENT: string[] = [];

/** Browse.
 *
 *  Two ways in, on one segmented control. Collections is every game, sport
 *  and language edition we list, as glass panels with a card from each; a
 *  panel opens that game's own page. Sets is the newest sets of the
 *  collections people browse most; a set opens straight onto its priced
 *  cards.
 *
 *  The search box does both jobs: it narrows the collections or sets on
 *  screen as you type, and after a pause it searches every card by name,
 *  printed number or cert — the results appear under what matched. Each
 *  query carries a sequence number so a slow reply for "char" can never
 *  overwrite a fast one for "charizard".
 */
export default function Browse() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const fx = useFx();
  const quick = useQuickFollow();
  const router = useRouter();
  // `?game=` is how the dashboard opens a game, and `?filters=1` opens the
  // sheet — a screen you can only reach by tapping cannot be linked to.
  const { game: wanted, filters: openFilters } =
    useLocalSearchParams<{ game?: string; filters?: string }>();

  const [tab, setTab] = useState<Tab>("collections");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<Extract<Lookup, { kind: "cert" }> | null>(null);
  const seq = useRef(0);

  const [games, setGames] = useState<BrowseGame[] | null>(null);
  const [setLists, setSetLists] = useState<Record<string, SetSummary[]>>({});
  const asked = useRef(new Set<string>());

  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("relevance");

  const needle = fold(q.trim());
  const searching = needle.length >= 2;

  useEffect(() => {
    let alive = true;
    browseGames().then((g) => { if (alive) setGames(g); });
    return () => { alive = false; };
  }, []);

  const loadSets = (ids: string[]) => {
    for (const id of ids) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      allSets(id).then((list) => setSetLists((m) => ({ ...m, [id]: list })));
    }
  };

  // The spotlight is Pokémon's newest set, so its list is wanted at once;
  // the rest only when the Sets tab is opened.
  useEffect(() => { loadSets(["pokemon"]); }, []);
  useEffect(() => { if (tab === "sets") loadSets(FEATURED.map((f) => f.id)); }, [tab]);

  useEffect(() => {
    if (openFilters === "1") setSheet(true);
  }, [openFilters]);

  const openGame = (g: { id: string; name: string; baseGame?: string; languageName?: string }, gameTab?: string) =>
    router.push({
      pathname: "/game/[id]",
      params: { id: g.id, name: editionName(g), ...(gameTab ? { tab: gameTab } : {}) },
    } as never);

  const labelOf = (id: string) => {
    const g = games?.find((x) => x.id === id);
    return g ? editionName(g) : gameTheme(id).label;
  };

  const openSet = (set: SetSummary, gameId: string) =>
    router.push({ pathname: "/set/[setId]", params: { setId: set.setId, game: gameId, gameName: labelOf(gameId) } } as never);

  // Arriving with a game named hands straight on to that game's page, then
  // forgets the param so coming back to this tab lands on Browse rather than
  // bouncing forward again.
  useEffect(() => {
    if (!wanted) return;
    const g = games?.find((x) => x.id === wanted);
    router.setParams({ game: undefined } as never);
    router.push({ pathname: "/game/[id]", params: g ? { id: g.id, name: editionName(g) } : { id: String(wanted) } } as never);
  }, [wanted]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setSearched(false); setCert(null); setBusy(false); return; }
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

  // ---- card results ------------------------------------------------------------
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
      // Unpriced last in BOTH directions: no price is not a cheap price.
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

  const filtersOn = (gameFilter ? 1 : 0) + (rarityFilter ? 1 : 0) + (sort !== "relevance" ? 1 : 0);
  const reset = () => { setGameFilter(null); setRarityFilter(null); setSort("relevance"); };
  const toggle = (k: string) => setOpen(open === k ? null : k);

  // ---- the page, as rows ---------------------------------------------------------
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const plural = (n: number, [one, many]: [string, string]) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
    let matched = 0;

    if (tab === "collections") {
      if (!games) {
        for (let i = 0; i < 4; i++) out.push({ kind: "bone", key: `b:${i}`, compact: i > 1 });
      } else if (!searching) {
        for (const id of POPULAR) {
          const g = games.find((x) => x.id === id);
          if (g) out.push({ kind: "game", key: `p:${g.id}`, game: g, compact: false });
        }
        const pk = setLists.pokemon;
        const spot = pk?.find((x) => Number(x.total) > 0) ?? pk?.[0];
        if (spot) {
          out.push({ kind: "section", key: "h:spot", title: "In the spotlight" });
          out.push({ kind: "set", key: "spot", set: spot, gameId: "pokemon", eyebrow: "POKÉMON · NEWEST SET" });
        }
        for (const sec of SECTIONS) {
          const list = games.filter((g) => catOf(g) === sec.cat && !POPULAR.includes(g.id));
          if (!list.length) continue;
          out.push({ kind: "section", key: `h:${sec.cat}`, title: sec.title, sub: plural(list.length, sec.unit) });
          for (const g of list) out.push({ kind: "game", key: `g:${g.id}`, game: g, compact: true });
        }
      } else {
        const list = games.filter((g) => fold(editionName(g)).includes(needle) || fold(g.name).includes(needle));
        matched = list.length;
        if (list.length) {
          out.push({ kind: "section", key: "h:match", title: "Collections", sub: plural(list.length, ["match", "matches"]) });
          for (const g of list.slice(0, 8)) out.push({ kind: "game", key: `m:${g.id}`, game: g, compact: true });
        }
      }
    } else if (!searching) {
      for (const f of FEATURED) {
        const g = games?.find((x) => x.id === f.id);
        const title = g ? editionName(g) : gameTheme(f.id).label;
        const list = setLists[f.id];
        out.push({
          kind: "section", key: `h:${f.id}`, title,
          sub: list ? plural(list.length, ["set", "sets"]) : "Loading",
          action: list?.length ? { label: "See all", onPress: () => openGame(g ?? { id: f.id, name: title }, "sets") } : undefined,
        });
        if (!list) {
          out.push({ kind: "bone", key: `b:${f.id}` });
        } else if (!list.length) {
          out.push({ kind: "note", key: `n:${f.id}`, text: "These sets didn't load. Open the game to try again." });
        } else {
          for (const set of list.slice(0, f.take)) {
            out.push({ kind: "set", key: `s:${f.id}:${set.setId}`, set, gameId: f.id, eyebrow: title.toUpperCase() });
          }
        }
      }
    } else {
      const found: { set: SetSummary; gameId: string }[] = [];
      for (const f of FEATURED) {
        for (const set of setLists[f.id] ?? []) {
          if (fold(set.name).includes(needle)) found.push({ set, gameId: f.id });
          if (found.length >= 30) break;
        }
      }
      matched = found.length;
      if (found.length) {
        out.push({ kind: "section", key: "h:sets", title: "Sets", sub: `${found.length}${found.length === 30 ? "+" : ""} in featured collections` });
        for (const x of found) {
          out.push({ kind: "set", key: `f:${x.gameId}:${x.set.setId}`, set: x.set, gameId: x.gameId, eyebrow: labelOf(x.gameId).toUpperCase() });
        }
      }
    }

    if (searching) {
      if (busy) {
        out.push({ kind: "loading", key: "loading" });
      } else if (searched && hits.length) {
        out.push({ kind: "hitsHead", key: "hits" });
        if (!shown.length) out.push({ kind: "empty", key: "e:filter", title: "Nothing under that filter", body: "Clear a filter to see the rest." });
        for (const [i, h] of shown.entries()) out.push({ kind: "hit", key: `c:${h.cardId}:${i}`, hit: h });
      } else if (searched && !matched) {
        out.push({
          kind: "empty", key: "e:none",
          title: tab === "collections" ? "No matching categories" : "No matching sets",
          body: "Try a game, sport, set or card name, or the number printed on the card.",
        });
      }
    }
    return out;
  }, [tab, games, setLists, searching, needle, busy, searched, hits, shown]);

  const head = (
    <View style={s.head}>
      <Eyebrow>THE COLLECTIONS</Eyebrow>
      <PageTitle>Browse</PageTitle>
      <PageSub>A world worth knowing.</PageSub>
      <PearlField value={q} onChangeText={setQ} placeholder="Find a category, set or card" />

      {RECENT.length > 0 && !searching && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recent}
          style={{ marginHorizontal: -20 }} keyboardShouldPersistTaps="handled">
          <Feather name="clock" size={13} color={lens.inkFaint} style={{ alignSelf: "center" }} />
          {RECENT.map((r) => (
            <Pressable key={r} onPress={() => setQ(r)} style={({ pressed }) => [s.recentChip, pressed && { opacity: 0.7 }]}>
              <Txt style={s.recentTxt}>{r}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PearlSegment<Tab>
        options={[{ id: "collections", label: "Collections" }, { id: "sets", label: "Sets" }]}
        value={tab}
        onChange={setTab}
      />
    </View>
  );

  const openCard = (h: CardHit) =>
    // A sports entry only resolves inside its set, so the set travels with it.
    router.push({
      pathname: "/card/[id]",
      params: sportOf(h.game) ? { id: h.cardId, set: h.setId } : { id: h.cardId },
    } as never);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />

      {cert ? (
        <ScrollView contentContainerStyle={{ paddingBottom: clearance }} keyboardShouldPersistTaps="handled">
          {head}
          <CertResult cert={cert} />
        </ScrollView>
      ) : (
        <FlatList
          {...navScroll}
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingBottom: clearance }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          windowSize={9}
          ListHeaderComponent={head}
          ListFooterComponent={
            !searching && tab === "collections" && games && games.length === 0 ? (
              <EmptyState title="Couldn't load the collections" body="Search by card name above while it comes back." />
            ) : null
          }
          renderItem={({ item }) => {
            switch (item.kind) {
              case "section":
                return <SectionHead title={item.title} sub={item.sub} action={item.action} />;
              case "game": {
                const g = item.game;
                return (
                  <View style={[s.gutter, { marginBottom: item.compact ? 10 : 13 }]}>
                    <CollectionPanel
                      title={gameName(g)}
                      chip={g.languageName ?? null}
                      sub={gameSub(g)}
                      meta={g.sets ? `${g.sets.toLocaleString()} sets` : null}
                      imageUri={g.preview ?? null}
                      gameId={g.id}
                      tone={toneFor(g.id)}
                      compact={item.compact}
                      onPress={() => openGame(g)}
                    />
                  </View>
                );
              }
              case "set":
                return (
                  <View style={[s.gutter, { marginBottom: 12 }]}>
                    <SetSummaryPanel set={item.set} gameId={item.gameId} eyebrow={item.eyebrow}
                      tone={toneFor(item.gameId)} onPress={() => openSet(item.set, item.gameId)} />
                  </View>
                );
              case "bone":
                return <View style={[s.gutter, { marginBottom: 12 }]}><PanelBone compact={item.compact} /></View>;
              case "note":
                return <Txt style={[s.note, s.gutter]}>{item.text}</Txt>;
              case "loading":
                return <View style={{ paddingVertical: 28 }}><Loader /></View>;
              case "hitsHead":
                return (
                  <View style={[s.gutter, s.hitsHead]}>
                    <View style={{ flex: 1 }}>
                      <Txt style={s.hitsTitle}>Cards</Txt>
                      <Txt style={s.hitsCount}>
                        {shown.length === hits.length ? `${hits.length} results` : `${shown.length} of ${hits.length}`}
                      </Txt>
                    </View>
                    <SortButton
                      label={filtersOn > 0 ? `${SORT_LABEL[sort]} · ${filtersOn}` : "Sort & filter"}
                      onPress={() => { setOpen("sort"); setSheet(true); }}
                    />
                  </View>
                );
              case "hit": {
                const h = item.hit;
                return (
                  <Pressable onPress={() => openCard(h)}
                    style={({ pressed }) => [s.hit, pressed && { backgroundColor: "rgba(255,255,255,0.35)" }]}>
                    <View style={s.hitArt}><CardArt uri={h.imageUrl} iconSize={16} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt style={s.hitName} numberOfLines={1}>{h.name}</Txt>
                      <Txt style={s.hitSet} numberOfLines={1}>
                        {[h.setName, h.localId ? `#${h.localId}` : null].filter(Boolean).join(" · ")}
                      </Txt>
                      <View style={s.hitTags}>
                        <Tag theme={gameTheme(h.game)}>{labelOf(h.game)}</Tag>
                        {h.rarity && h.rarity !== "None" ? <Tag gold>{h.rarity}</Tag> : null}
                      </View>
                    </View>
                    <View style={s.hitEnd}>
                      {h.rawUsd != null ? <Txt style={s.hitPrice}>{dollars(h.rawUsd, fx).text}</Txt> : null}
                      {h.cardId !== "market" && (
                        <FollowPlus on={quick.isFollowed(h.cardId)}
                          onPress={() => quick.toggle({
                            cardId: h.cardId, name: h.name, setName: h.setName,
                            number: h.localId || null, imageUrl: h.imageUrl,
                          })} />
                      )}
                    </View>
                  </Pressable>
                );
              }
              case "empty":
                return (
                  <EmptyState title={item.title} body={item.body}
                    action={item.key === "e:none" ? { label: "Clear search", onPress: () => setQ("") } : undefined} />
                );
            }
          }}
        />
      )}

      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onReset={reset}
        canReset={filtersOn > 0}
        applyLabel={`Show ${shown.length} ${shown.length === 1 ? "result" : "results"}`}
      >
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
      </FilterSheet>
    </SafeAreaView>
  );
}

function Tag({ children, gold, theme }: { children: string; gold?: boolean; theme?: GameTheme }) {
  return (
    <View style={[s.tag, gold && s.tagGold, theme && { backgroundColor: theme.wash }]}>
      <Txt style={[s.tagTxt, gold && { color: lens.goldText }, theme && { color: theme.tint }]} numberOfLines={1}>
        {children}
      </Txt>
    </View>
  );
}

async function viaLookup(term: string): Promise<{
  hits: CardHit[];
  cert: Extract<Lookup, { kind: "cert" }> | null;
}> {
  const r = await lookup(term);
  if (!r) return { hits: [], cert: null };
  if (r.kind === "cert") return { hits: [], cert: r };
  if (r.kind === "card") return { hits: [r.card], cert: null };
  return { hits: r.results, cert: null };
}

/** A certificate number, handed to the company that issued it.
 *
 *  We hold no grading company's data and are not going to pretend to. Their
 *  register is the only authority on whether a slab is real, so the honest
 *  answer to a cert number is a door to it — and when the number alone does
 *  not say which company, every door rather than a guess. */
function CertResult({ cert }: { cert: Extract<Lookup, { kind: "cert" }> }) {
  return (
    <View style={s.certWrap}>
      <SectionHead title={`Certificate ${cert.cert}`}
        sub={cert.grader ? `Check it on ${cert.grader}'s own register` : "Try each grading company's register"} />
      <View style={[s.gutter, { gap: 10 }]}>
        {cert.links.map((l) => (
          <Pressable key={l.grader} onPress={() => Linking.openURL(l.url)}
            style={({ pressed }) => [s.certLink, pressed && { opacity: 0.75 }]}>
            <Txt style={s.certTxt}>Check with {l.grader}</Txt>
            <Feather name="arrow-up-right" size={16} color={lens.goldText} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  gutter: { paddingHorizontal: 20 },

  recent: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, marginTop: 12 },
  recentChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.6)" },
  recentTxt: { fontFamily: fonts.medium, fontSize: 13, lineHeight: lh(13), color: lens.inkSoft },

  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: lh(13), color: lens.inkSoft, marginBottom: 12 },

  hitsHead: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 26, marginBottom: 6 },
  hitsTitle: { fontFamily: fonts.semi, fontSize: 22, lineHeight: lh(22), letterSpacing: -0.5, color: lens.ink },
  hitsCount: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft },
  hit: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: lens.hairline,
  },
  hitArt: {
    width: 54, height: 75, borderRadius: 6, overflow: "hidden", backgroundColor: "#D8DDE3",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.8)",
  },
  hitName: { fontFamily: fonts.semi, fontSize: 15.5, lineHeight: lh(15.5), color: lens.ink },
  hitSet: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 1 },
  hitTags: { flexDirection: "row", gap: 5, marginTop: 5 },
  hitEnd: { alignItems: "flex-end", justifyContent: "center", gap: 6, minWidth: 44 },
  hitPrice: { fontFamily: fonts.semi, fontSize: 16, lineHeight: lh(16), color: lens.ink, fontVariant: ["tabular-nums"] },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.6)", maxWidth: 150 },
  tagGold: { backgroundColor: lens.cream },
  tagTxt: { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: lh(10.5), color: lens.inkSoft },

  certWrap: { paddingTop: 4 },
  certLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 54,
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", backgroundColor: "rgba(255,255,255,0.7)",
  },
  certTxt: { fontFamily: fonts.semi, fontSize: 15, lineHeight: lh(15), color: lens.ink },
});
