import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SvgUri } from "react-native-svg";
import { CardArt, Shimmer } from "../../components/CardArt";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { searchCards, type CardHit } from "../../lib/cards";
import { lookup, looksLikeCode, type Lookup } from "../../lib/lookup";
import {
  allSets, browseGames, marketPulse, type BrowseGame, type Pulse, type SetSummary,
} from "../../lib/cardmarket";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { gameTheme, type GameTheme } from "../../lib/games";
import { colors, radius, shadow, space, type } from "../../theme";

const GAME_LABEL: Record<string, string> = {
  pokemon: "Pokémon", onepiece: "One Piece", mtg: "Magic",
  yugioh: "Yu-Gi-Oh!", lorcana: "Lorcana", digimon: "Digimon",
};

type Sort = "relevance" | "name";
type SetSort = "newest" | "oldest" | "az" | "biggest";

const SET_SORTS: { id: SetSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "az", label: "A to Z" },
  { id: "biggest", label: "Most cards" },
];

/** What was searched for lately. Module-level, so it survives leaving the
 *  tab and coming back; it does not survive a restart, and that is fine for
 *  a list whose whole job is "the thing I typed a minute ago". */
let RECENT: string[] = [];

/** Search.
 *
 *  Typing runs the query, but not on every keystroke — a request per character
 *  is three wasted round trips for every useful one, and on a phone that is
 *  battery as well as bandwidth. It waits until the typing pauses.
 *
 *  Results are also raced: a slow reply for "char" must not overwrite a fast
 *  one for "charizard". Each query carries a sequence number and anything
 *  stale is dropped.
 *
 *  With an empty box the screen is a place to browse, not a blank: what is
 *  moving now as a rail of art, the games as covers, and the chosen game's
 *  sets as a grid. Pictures first, because a card is a picture — a list of
 *  names is what a spreadsheet would show. */
export default function Search() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const router = useRouter();
  // The dashboard's game row opens this screen already pointed at a game.
  const { game: wanted } = useLocalSearchParams<{ game?: string }>();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);
  const input = useRef<TextInput>(null);

  const [cert, setCert] = useState<Extract<Lookup, { kind: "cert" }> | null>(null);
  const [, setNote] = useState<string | null>(null);

  // ---- browsing -------------------------------------------------------------
  const [games, setGames] = useState<BrowseGame[] | null>(null);
  const [game, setGame] = useState<BrowseGame | null>(null);
  const [sets, setSets] = useState<SetSummary[] | null>(null);
  const [pulse, setPulse] = useState<Pulse[] | null>(null);

  useEffect(() => {
    let alive = true;
    browseGames().then((g) => {
      if (!alive) return;
      setGames(g);
      setGame((cur) => cur ?? g.find((x) => x.id === wanted) ?? g[0] ?? null);
    });
    marketPulse().then((p) => { if (alive) setPulse(p); });
    return () => { alive = false; };
  }, []);

  // Arriving with a game named, or arriving again with a different one.
  useEffect(() => {
    if (!wanted || !games) return;
    const g = games.find((x) => x.id === wanted);
    if (g) setGame(g);
  }, [wanted, games]);
  useEffect(() => {
    if (!game) { setSets(null); return; }
    let alive = true;
    setSets(null);
    allSets(game.id).then((r) => { if (alive) setSets(r); });
    return () => { alive = false; };
  }, [game?.id]);

  // ---- filters over results ---------------------------------------------------
  const [sheet, setSheet] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("relevance");
  const [setSort_, setSetSort] = useState<SetSort>("newest");

  const browsing = q.trim().length < 2;

  // The sheet governs two different lists, so it has to count and reset the
  // one on screen. Counting all of them together is how the badge came to
  // say "1 filter" over a browse list that no filter in the sheet touched:
  // the game chips were setting a results filter while the sets below came
  // from `game`, which nothing in the sheet changed.
  const filtersOn = browsing
    ? (setSort_ !== "newest" ? 1 : 0)
    : (gameFilter ? 1 : 0) + (rarityFilter ? 1 : 0) + (sort !== "relevance" ? 1 : 0);
  const resetFilters = () => {
    if (browsing) { setSetSort("newest"); return; }
    setGameFilter(null); setRarityFilter(null); setSort("relevance");
  };

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setSearched(false); setCert(null); setNote(null); return; }
    const mine = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      const r = looksLikeCode(t) ? await viaLookup(t) : { hits: await searchCards(t), cert: null, note: null };
      if (mine !== seq.current) return;   // a newer query has already answered
      setHits(r.hits);
      setCert(r.cert);
      setNote(r.note);
      setBusy(false);
      setSearched(true);
      if (r.hits.length || r.cert) RECENT = [t, ...RECENT.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  // The games and rarities present in THESE results, for the chips. A filter
  // that offers Lorcana over a list with no Lorcana in it is a dead control.
  const gamesInHits = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hits) m.set(h.game, (m.get(h.game) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [hits]);
  const raritiesInHits = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hits) if (h.rarity && h.rarity !== "None") m.set(h.rarity, (m.get(h.rarity) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [hits]);
  const shown = useMemo(() => {
    let list = hits;
    if (gameFilter) list = list.filter((h) => h.game === gameFilter);
    if (rarityFilter) list = list.filter((h) => h.rarity === rarityFilter);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name) || a.setName.localeCompare(b.setName));
    return list;
  }, [hits, gameFilter, rarityFilter, sort]);

  // The catalogue answers newest first, so that order is the one we leave
  // alone rather than re-derive: half these catalogues publish no release
  // date, and sorting by a field that is null everywhere would silently
  // shuffle the list into the order the array happened to be in.
  const shownSets = useMemo(() => {
    const list = sets ?? [];
    if (setSort_ === "newest") return list;
    const copy = [...list];
    if (setSort_ === "az") copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (setSort_ === "biggest") copy.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    else copy.reverse();
    return copy;
  }, [sets, setSort_]);

  const openCard = (id: string) => router.push(`/card/${encodeURIComponent(id)}` as any);

  const head = (
    <View style={s.head}>
      <Txt variant="display">Search</Txt>
      <View style={s.fieldRow}>
        <View style={s.field}>
          <Feather name="search" size={17} color={colors.inkFaint} />
          <TextInput
            ref={input}
            value={q}
            onChangeText={setQ}
            placeholder="Card, set code or cert number"
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
          style={({ pressed }) => [s.filterBtn, filtersOn > 0 && s.filterBtnOn, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Filters"
        >
          <Feather name="sliders" size={18} color={filtersOn > 0 ? colors.onPrimary : colors.ink} />
          {filtersOn > 0 && (
            <View style={s.filterCount}><Txt style={s.filterCountTxt}>{filtersOn}</Txt></View>
          )}
        </Pressable>
      </View>
    </View>
  );

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
          key="browse"
          {...navScroll}
          data={shownSets}
          keyExtractor={(x, i) => `${x.setId}:${i}`}
          numColumns={2}
          columnWrapperStyle={s.setRow}
          contentContainerStyle={[s.browse, { paddingBottom: clearance }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {head}

              {RECENT.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recent}
                  keyboardShouldPersistTaps="handled">
                  <Feather name="clock" size={13} color={colors.inkFaint} style={{ alignSelf: "center" }} />
                  {RECENT.map((r) => (
                    <Pressable key={r} onPress={() => setQ(r)} style={({ pressed }) => [s.recentChip, pressed && { opacity: 0.7 }]}>
                      <Txt variant="bodySmall" color={colors.inkMuted}>{r}</Txt>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* ---- moving now ------------------------------------------- */}
              {pulse && pulse.length > 0 && (
                <>
                  <SectionHead title="Moving now" sub="Biggest moves this week" action={{ label: "See all", onPress: () => router.push("/movers") }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                    {pulse.slice(0, 8).map((p) => {
                      const pct = p.change7d ?? 0;
                      const up = pct >= 0;
                      return (
                        <Pressable
                          key={p.cardId ?? p.label}
                          onPress={() => p.cardId ? openCard(p.cardId) : router.push({ pathname: "/market", params: { q: p.label } })}
                          style={({ pressed }) => [s.trend, pressed && { transform: [{ scale: 0.98 }] }]}
                        >
                          <CardArt uri={p.imageUrl} iconSize={22} />
                          <LinearGradient
                            colors={["rgba(11,22,34,0)", "rgba(11,22,34,0.85)"]}
                            locations={[0.45, 1]}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                          />
                          <View style={s.trendFoot}>
                            <Txt variant="label" color={colors.onDark} numberOfLines={1}>{p.label}</Txt>
                            <Txt variant="bodySmall" color={colors.onDarkMuted} numberOfLines={1} style={{ fontSize: 12 }}>
                              {p.setName ?? GAME_LABEL[p.game ?? ""] ?? ""}
                            </Txt>
                          </View>
                          <View style={[s.trendPct, { backgroundColor: up ? "#2ECC8A" : "#F26B5E" }]}>
                            <Txt style={s.trendPctTxt}>{up ? "+" : "−"}{Math.abs(pct).toFixed(0)}%</Txt>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* ---- the games, as covers ---------------------------------- */}
              <SectionHead title="Browse by game" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}
                keyboardShouldPersistTaps="handled">
                {(games ?? []).map((g) => <GameCover key={g.id} game={g} on={game?.id === g.id} onPress={() => setGame(g)} />)}
                {games == null && [0, 1, 2, 3].map((i) => <View key={i} style={[s.cover, { overflow: "hidden" }]}><Shimmer /></View>)}
              </ScrollView>

              {game && (
                <SectionHead
                  title={`${GAME_LABEL[game.id] ?? game.name} sets`}
                  sub={sets == null
                    ? "Loading"
                    : `${sets.length} sets · ${SET_SORTS.find((x) => x.id === setSort_)!.label.toLowerCase()}`}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            sets == null
              ? (
                <View style={[s.setRow, { paddingHorizontal: space.xl }]}>
                  {[0, 1].map((i) => <View key={i} style={s.setTile}><View style={[s.setWell, { overflow: "hidden" }]}><Shimmer /></View></View>)}
                </View>
              )
              : (
                <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xl }}>
                  Sets couldn&rsquo;t be loaded. Search by name instead.
                </Txt>
              )
          }
          renderItem={({ item, index }) => (
            <SetTile
              set={item}
              fresh={setSort_ === "newest" && index < 2}
              onPress={() => router.push(`/set/${encodeURIComponent(item.setId)}` as any)}
            />
          )}
        />
      ) : (
        <FlatList
          key="cards"
          {...navScroll}
          data={shown}
          keyExtractor={(c) => c.cardId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.list, { paddingBottom: clearance }]}
          ListHeaderComponent={
            <View>
              {head}
              {hits.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}
                  keyboardShouldPersistTaps="handled">
                  <Chip label={`All · ${hits.length}`} on={!gameFilter} onPress={() => setGameFilter(null)} />
                  {gamesInHits.map(([g, n]) => (
                    <Chip key={g} label={`${GAME_LABEL[g] ?? g} · ${n}`} on={gameFilter === g}
                      onPress={() => setGameFilter(gameFilter === g ? null : g)} />
                  ))}
                </ScrollView>
              )}
              {searched && !busy && hits.length > 0 && (
                <Txt variant="bodySmall" color={colors.inkFaint} style={s.count}>
                  {shown.length === hits.length ? `${hits.length} cards` : `${shown.length} of ${hits.length} cards`}
                  {rarityFilter ? ` · ${rarityFilter}` : ""}{sort === "name" ? " · A to Z" : ""}
                </Txt>
              )}
            </View>
          }
          ListEmptyComponent={
            busy ? (
              <Loader fill />
            ) : searched ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}><Feather name="search" size={22} color={colors.inkFaint} /></View>
                <Txt variant="h3" center style={{ marginTop: space.md }}>
                  {hits.length ? "Nothing under that filter" : "No match"}
                </Txt>
                <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
                  {hits.length ? "Clear a filter to see the rest." : "Try the printed code on the card, or scan it instead."}
                </Txt>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openCard(item.cardId)}
              style={({ pressed }) => [s.hit, pressed && { backgroundColor: colors.surfaceSunk }]}
            >
              <View style={s.hitArt}><CardArt uri={item.imageUrl} iconSize={16} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="h3" numberOfLines={1}>{item.name}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                  {item.setName} · #{item.localId}
                </Txt>
                <View style={s.hitTags}>
                  <Tag theme={gameTheme(item.game)}>{gameTheme(item.game).label}</Tag>
                  {item.rarity && item.rarity !== "None" ? <Tag gold>{item.rarity}</Tag> : null}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.inkFaint} />
            </Pressable>
          )}
        />
      )}

      {/* ---- the filter sheet ------------------------------------------------ */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Txt variant="h2">Filters</Txt>
            {filtersOn > 0 && (
              <Pressable onPress={resetFilters} hitSlop={8}>
                <Txt variant="label" color={colors.inkMuted}>Reset</Txt>
              </Pressable>
            )}
          </View>

          {/* Browsing, the game chips ARE the browse — they move the list of
              sets underneath. Searching, they narrow the results. Same row,
              two jobs, because in both cases "game" means the one thing on
              screen the person is looking at. */}
          <Txt variant="overline" color={colors.inkFaint} style={s.sheetLabel}>Game</Txt>
          <View style={s.wrap}>
            {!browsing && <Chip label="Any" on={!gameFilter} onPress={() => setGameFilter(null)} />}
            {(games ?? []).map((g) => (
              <Chip
                key={g.id}
                label={GAME_LABEL[g.id] ?? g.name}
                on={browsing ? game?.id === g.id : gameFilter === g.id}
                onPress={() => browsing
                  ? setGame(g)
                  : setGameFilter(gameFilter === g.id ? null : g.id)}
              />
            ))}
          </View>

          {!browsing && raritiesInHits.length > 0 && (
            <>
              <Txt variant="overline" color={colors.inkFaint} style={s.sheetLabel}>Rarity</Txt>
              <View style={s.wrap}>
                <Chip label="Any" on={!rarityFilter} onPress={() => setRarityFilter(null)} />
                {raritiesInHits.map(([r, n]) => (
                  <Chip key={r} label={`${r} · ${n}`} on={rarityFilter === r}
                    onPress={() => setRarityFilter(rarityFilter === r ? null : r)} />
                ))}
              </View>
            </>
          )}

          <Txt variant="overline" color={colors.inkFaint} style={s.sheetLabel}>
            {browsing ? "Order sets by" : "Sort"}
          </Txt>
          <View style={s.wrap}>
            {browsing
              ? SET_SORTS.map((x) => (
                  <Chip key={x.id} label={x.label} on={setSort_ === x.id} onPress={() => setSetSort(x.id)} />
                ))
              : (
                <>
                  <Chip label="Best match" on={sort === "relevance"} onPress={() => setSort("relevance")} />
                  <Chip label="A to Z" on={sort === "name"} onPress={() => setSort("name")} />
                </>
              )}
          </View>

          <Pressable onPress={() => setSheet(false)} style={({ pressed }) => [s.apply, pressed && { opacity: 0.9 }]}>
            <Txt variant="button" color={colors.onPrimary}>
              {browsing
                ? `Show ${shownSets.length} set${shownSets.length === 1 ? "" : "s"}`
                : `Show ${shown.length} card${shown.length === 1 ? "" : "s"}`}
            </Txt>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1 }}>
        <Txt variant="h2">{title}</Txt>
        {sub ? <Txt variant="bodySmall" color={colors.inkFaint}>{sub}</Txt> : null}
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Txt variant="label">{action.label}</Txt>
          <Feather name="chevron-right" size={14} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

/** A game as a cover: its art filling a small poster, its name on it, and a
 *  gold ring when it is the one open below. Pokemon and Yu-Gi-Oh publish a
 *  set logo rather than a card, and a logo is shown as a logo — small, on
 *  navy — because a logo stretched to fill a poster looks like a mistake. */
function GameCover({ game, on, onPress }: { game: BrowseGame; on: boolean; onPress: () => void }) {
  const logo = Boolean(game.preview && /\/logo\.(png|webp)$/i.test(game.preview) || /sets\//.test(game.preview ?? ""));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.coverWrap, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[s.cover, on && s.coverOn, on && { borderColor: gameTheme(game.id).tint }]}>
        <LinearGradient colors={["#2C3D4B", colors.dark]} style={StyleSheet.absoluteFill} />
        {game.preview ? (
          logo
            ? <Image source={{ uri: game.preview }} style={s.coverLogo} resizeMode="contain" />
            : <Image source={{ uri: game.preview }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={["rgba(11,22,34,0)", "rgba(11,22,34,0.9)"]}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={s.coverFoot}>
          <Txt variant="label" color={colors.onDark} numberOfLines={1}>{GAME_LABEL[game.id] ?? game.name}</Txt>
          {game.sets ? <Txt style={s.coverSets}>{game.sets} sets</Txt> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** A set as a tile: the logo on a soft well, the name and the count under
 *  it, and a gold "New" on the two newest. White on the wash, lifted by a
 *  shadow and never by a border. */
function SetTile({ set, fresh, onPress }: { set: SetSummary; fresh: boolean; onPress: () => void }) {
  const facts = [
    set.total > 0 ? `${set.total} cards` : null,
    set.releasedAt ? set.releasedAt.slice(0, 4) : null,
  ].filter(Boolean).join(" · ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.setTile, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={s.setWell}>
        <LinearGradient colors={["#EEF1F5", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
        <SetLogo uri={set.logo ?? set.symbol} name={set.name} />
        {fresh && <View style={s.fresh}><Txt style={s.freshTxt}>New</Txt></View>}
      </View>
      {/* Two lines, and the box is that tall whether or not it needs both.
          Set names run long — "Extra Booster: One Piece Heroines Edition" —
          and one line turned half this grid into an ellipsis. A fixed height
          is what keeps the two columns level when one name wraps and the
          one beside it does not. */}
      <Txt variant="h3" numberOfLines={2} style={s.setName}>{set.name}</Txt>
      {facts ? <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>{facts}</Txt> : null}
    </Pressable>
  );
}

function SetLogo({ uri, name }: { uri: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const svg = Boolean(uri && /\.svg(\?|$)/i.test(uri));
  if (!uri || failed) {
    return <Txt variant="h2" color={colors.inkMuted}>{monogram(name)}</Txt>;
  }
  if (svg) return <SvgUri uri={uri} width="64%" height="64%" onError={() => setFailed(true)} />;
  return (
    <>
      {!loaded && <Shimmer />}
      <Image
        source={{ uri }} style={s.setLogo} resizeMode="contain" key={uri}
        onLoadEnd={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(true); }}
      />
    </>
  );
}

const monogram = (name: string) =>
  name.split(/[\s:&-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && !on && { opacity: 0.7 }]}
      accessibilityState={{ selected: on }}>
      <Txt variant="label" color={on ? colors.onPrimary : colors.ink}>{label}</Txt>
    </Pressable>
  );
}

function Tag({ children, gold, theme }: { children: string; gold?: boolean; theme?: GameTheme }) {
  return (
    <View style={[s.tag, gold && s.tagGold, theme && { backgroundColor: theme.wash }]}>
      <Txt
        style={[s.tagTxt, gold && { color: "#8A6D3B" }, theme && { color: theme.tint }]}
        numberOfLines={1}
      >
        {children}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
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
  filterCount: {
    position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  filterCountTxt: { ...type.overline, fontSize: 11, color: colors.dark },

  recent: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.xl, marginTop: space.md },
  recentChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.field },

  browse: {},
  sectionHead: {
    flexDirection: "row", alignItems: "flex-end", gap: space.md,
    paddingHorizontal: space.xl, marginTop: space.xxl, marginBottom: space.md,
  },
  rail: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl },

  trend: {
    width: 138, height: 190, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, ...shadow.card,
  },
  trendFoot: { position: "absolute", left: 10, right: 10, bottom: 10 },
  trendPct: { position: "absolute", top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  trendPctTxt: { ...type.overline, fontSize: 11, color: colors.dark, fontVariant: ["tabular-nums"] },

  coverWrap: {},
  cover: {
    width: 104, height: 128, borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.dark, ...shadow.card,
  },
  coverOn: { borderWidth: 2.5, borderColor: colors.accent },
  coverLogo: { position: "absolute", left: 10, right: 10, top: 18, height: 52 },
  coverFoot: { position: "absolute", left: 10, right: 10, bottom: 9 },
  coverSets: { ...type.overline, fontSize: 11, color: colors.onDarkMuted },

  setRow: { gap: space.md, paddingHorizontal: space.xl, marginBottom: space.lg },
  setTile: { flex: 1 },
  setWell: {
    aspectRatio: 1.45, borderRadius: radius.md, overflow: "hidden",
    alignItems: "center", justifyContent: "center", padding: space.md,
    backgroundColor: colors.surface, ...shadow.card,
  },
  setLogo: { width: "100%", height: "100%" },
  setName: { marginTop: space.sm, minHeight: 42 },
  fresh: {
    position: "absolute", top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: radius.pill, backgroundColor: colors.accent,
  },
  freshTxt: { ...type.overline, fontSize: 10.5, color: colors.dark },

  list: {},
  chips: { flexDirection: "row", gap: 6, paddingHorizontal: space.xl, marginTop: space.md },
  chip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.field,
  },
  chipOn: { backgroundColor: colors.ink },
  count: { paddingHorizontal: space.xl, marginTop: space.md },
  hit: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.xl, paddingVertical: space.md,
  },
  hitArt: { width: 56, height: 78, borderRadius: 7, overflow: "hidden", backgroundColor: colors.surfaceSunk, ...shadow.card },
  hitTags: { flexDirection: "row", gap: 5, marginTop: 3 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.field },
  tagGold: { backgroundColor: colors.accentWash },
  tagTxt: { ...type.overline, fontSize: 10.5, color: colors.inkMuted },
  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: colors.field },

  backdrop: { flex: 1, backgroundColor: "rgba(11,22,34,0.45)" },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: space.xl, paddingBottom: space.xxxl, paddingTop: space.sm,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginBottom: space.md },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetLabel: { marginTop: space.xl, marginBottom: space.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  apply: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center", marginTop: space.xxl,
  },

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
