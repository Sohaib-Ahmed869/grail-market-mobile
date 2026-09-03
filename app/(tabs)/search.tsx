import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Image, Linking, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { searchCards, type CardHit } from "../../lib/cards";
import { lookup, looksLikeCode, type Lookup } from "../../lib/lookup";
import { allSets, browseGames, type BrowseGame, type SetSummary } from "../../lib/cardmarket";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { colors, radius, space, type } from "../../theme";

const GAME_LABEL: Record<string, string> = {
  pokemon: "Pokémon", onepiece: "One Piece", mtg: "Magic",
  yugioh: "Yu-Gi-Oh!", lorcana: "Lorcana", digimon: "Digimon",
};

/** Search.
 *
 *  Typing runs the query, but not on every keystroke — a request per character
 *  is three wasted round trips for every useful one, and on a phone that is
 *  battery as well as bandwidth. It waits until the typing pauses.
 *
 *  Results are also raced: a slow reply for "char" must not overwrite a fast
 *  one for "charizard". Each query carries a sequence number and anything
 *  stale is dropped. */
export default function Search() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);

  // With an empty box, the screen browses sets rather than showing nothing.
  //
  // A search box only helps someone who already knows the name. Someone
  // holding an unfamiliar card — a Japanese print, a promo with no English on
  // it — can still recognise the set symbol and find the card in the list.
  // What the lookup found when the term was a code or a certificate rather
  // than a name. Null for an ordinary search.
  const [cert, setCert] = useState<Extract<Lookup, { kind: "cert" }> | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Games, then that game's sets, then the cards in a set. Browsing used to
  // open straight onto 218 Pokemon sets, which is the right answer only if
  // you hold a Pokemon card — and no answer at all if you hold a One Piece
  // one, since the list was Pokemon and nothing said so.
  const [games, setGames] = useState<BrowseGame[] | null>(null);
  const [game, setGame] = useState<BrowseGame | null>(null);
  const [sets, setSets] = useState<SetSummary[] | null>(null);

  useEffect(() => { browseGames().then(setGames); }, []);
  useEffect(() => {
    if (!game) { setSets(null); return; }
    let alive = true;
    setSets(null);
    allSets(game.id).then((r) => { if (alive) setSets(r); });
    return () => { alive = false; };
  }, [game]);

  const browsing = q.trim().length < 2;

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setSearched(false); setCert(null); setNote(null); return; }
    const mine = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      // Anything with a digit in it goes through the lookup, which knows
      // about set codes, collector numbers and certificate numbers. A plain
      // name never pays for that round trip.
      const r = looksLikeCode(t) ? await viaLookup(t) : { hits: await searchCards(t), cert: null, note: null };
      if (mine !== seq.current) return;   // a newer query has already answered
      setHits(r.hits);
      setCert(r.cert);
      setNote(r.note);
      setBusy(false);
      setSearched(true);
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <View style={s.head}>
        <Txt variant="display">Search</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          {browsing
            ? "A name, the code printed on the card, or the number on a slab. Or browse a set below."
            : "A name, or a printed code like OP13-119."}
        </Txt>

        <View style={s.field}>
          <Feather name="search" size={17} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="A name, a set code, or a cert number"
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
      </View>

      {cert ? (
        <CertResult cert={cert} clearance={clearance} />
      ) : browsing && !game ? (
        <FlatList
          {...navScroll}
          data={games ?? []}
          keyExtractor={(g) => g.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={[s.setList, { paddingBottom: clearance }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Txt variant="overline" color={colors.inkFaint} style={{ marginBottom: space.md }}>
              Browse by game
            </Txt>
          }
          ListEmptyComponent={games == null ? <Loader fill /> : null}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setGame(item)}
              style={({ pressed }) => [s.gameTile, pressed && { opacity: 0.75 }]}
            >
              {item.preview ? (
                <Image
                  source={{ uri: item.preview }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              {/* The scrim. Set logos are drawn to sit on white and card art
                  is busy, so without it the name is unreadable on about half
                  the tiles and unpredictable on the rest. */}
              <LinearGradient
                colors={["rgba(10,18,25,0.25)", "rgba(10,18,25,0.86)"]}
                locations={[0.25, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Txt variant="h2" color={colors.onDark} numberOfLines={2}>{item.name}</Txt>
              <Txt variant="bodySmall" color={colors.onDarkMuted}>
                {item.sets ? `${item.sets} sets` : "Browse sets"}
              </Txt>
            </Pressable>
          )}
        />
      ) : browsing ? (
        <FlatList
          {...navScroll}
          data={sets ?? []}
          keyExtractor={(x) => x.setId}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={[s.setList, { paddingBottom: clearance }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable onPress={() => setGame(null)} hitSlop={8} style={s.crumb}>
              <Feather name="chevron-left" size={15} color={colors.ink} />
              <Txt variant="button">{game?.name}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint}>
                {sets == null ? "loading" : `${sets.length} sets`}
              </Txt>
            </Pressable>
          }
          ListEmptyComponent={
            sets == null
              ? <Loader fill />
              : (
                <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xxl }}>
                  Sets couldn&rsquo;t be loaded. Search by name instead.
                </Txt>
              )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/set/${encodeURIComponent(item.setId)}` as any)}
              style={({ pressed }) => [s.setTile, pressed && { opacity: 0.75 }]}
            >
              <SetLogo uri={item.logo} name={item.name} />
              <Txt variant="h3" numberOfLines={1} style={{ marginTop: space.sm }}>{item.name}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint}>
                {item.total} card{item.total === 1 ? "" : "s"}
                {item.releasedAt ? ` · ${item.releasedAt.slice(0, 4)}` : ""}
              </Txt>
            </Pressable>
          )}
        />
      ) : (
      <FlatList
        {...navScroll}
        data={hits}
        keyExtractor={(c) => c.cardId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.list, { paddingBottom: clearance }]}
        ListEmptyComponent={
          busy ? (
            <Loader fill />
          ) : searched ? (
            <View style={s.empty}>
              <Feather name="search" size={22} color={colors.inkFaint} />
              <Txt variant="h3" center style={{ marginTop: space.md }}>No Match</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
                Try the printed code on the card, or scan it instead.
              </Txt>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/card/${encodeURIComponent(item.cardId)}` as any)}
            style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={s.thumb} resizeMode="cover" />
            ) : (
              <View style={[s.thumb, s.thumbEmpty]}>
                <Feather name="image" size={16} color={colors.inkFaint} />
              </View>
            )}
            <View style={s.rowText}>
              <Txt variant="h3" numberOfLines={1}>{item.name}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                {item.setName} · #{item.localId}
                {item.rarity ? ` · ${item.rarity}` : ""}
              </Txt>
              <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: 2 }}>
                {GAME_LABEL[item.game] ?? item.game}
              </Txt>
            </View>
            <Feather name="chevron-right" size={18} color={colors.inkFaint} />
          </Pressable>
        )}
      />
      )}
    </SafeAreaView>
  );
}

/** A set's logo, or its name when there isn't one.
 *
 *  Not every set has artwork, and a URL that resolves is not a URL that
 *  loads. Both failures used to end in the same place: a blank white square
 *  with a name underneath, which reads as a broken image rather than a set. */
function SetLogo({ uri, name }: { uri: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={s.setLogoBox}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={s.setLogo}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Txt variant="h3" color={colors.inkMuted} center numberOfLines={3}>{name}</Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    height: 54, paddingHorizontal: space.lg, marginTop: space.lg,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.fieldLine, backgroundColor: colors.field,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  list: { paddingHorizontal: space.xl, paddingTop: space.lg },
  certWrap: { paddingHorizontal: space.xl, paddingTop: space.xl },
  gameTile: {
    flex: 1, height: 132, padding: space.md, justifyContent: "flex-end",
    borderRadius: radius.lg, backgroundColor: colors.dark, overflow: "hidden",
  },
  crumb: {
    flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md,
  },
  certLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.lg, height: 54,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.outline,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  thumb: { width: 44, height: 61, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 1 },
  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.xl },
  setList: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.lg },
  setTile: { flex: 1 },
  setLogoBox: {
    aspectRatio: 1.5, borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
    borderWidth: 1, borderColor: colors.line,
    alignItems: "center", justifyContent: "center", padding: space.md,
  },
  setLogo: { width: "100%", height: "100%" },
});

/** One shape out of the lookup, whichever branch it took.
 *
 *  A code that resolves to a card is shown as a result of one rather than
 *  navigated to: the person typed something they read off a slab, and being
 *  thrown straight onto a card page gives them no chance to see whether it is
 *  the right one. */
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
 *  not say which company, all four doors rather than a guess. A PSA link with
 *  a BGS number in it is a confident wrong answer.
 */
function CertResult({
  cert, clearance,
}: {
  cert: Extract<Lookup, { kind: "cert" }>;
  clearance: number;
}) {
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
          <Pressable
            key={l.grader}
            onPress={() => Linking.openURL(l.url)}
            style={({ pressed }) => [s.certLink, pressed && { opacity: 0.7 }]}
          >
            <Txt variant="button">Check with {l.grader}</Txt>
            <Feather name="external-link" size={15} color={colors.inkMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
