import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Image, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { searchCards, type CardHit } from "../../lib/cards";
import { allSets, type SetSummary } from "../../lib/cardmarket";
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
  const [sets, setSets] = useState<SetSummary[] | null>(null);
  useEffect(() => { allSets().then(setSets); }, []);
  const browsing = q.trim().length < 2;

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setSearched(false); return; }
    const mine = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      const r = await searchCards(t);
      if (mine !== seq.current) return;   // a newer query has already answered
      setHits(r);
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
            ? "Search a name or a code like OP13-119, or browse a set below."
            : "A name, or a printed code like OP13-119."}
        </Txt>

        <View style={s.field}>
          <Feather name="search" size={17} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Charizard, Umbreon VMAX, OP13-119…"
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

      {browsing ? (
        <FlatList
          {...navScroll}
          data={sets ?? []}
          keyExtractor={(x) => x.setId}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={[s.setList, { paddingBottom: clearance }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Txt variant="overline" color={colors.inkFaint} style={{ marginBottom: space.md }}>
              {sets == null ? "Loading sets" : `${sets.length} sets · newest first`}
            </Txt>
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
