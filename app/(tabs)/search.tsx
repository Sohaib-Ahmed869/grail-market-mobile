import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Txt } from "../../components/Text";
import { searchCards, type CardHit } from "../../lib/cards";
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
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CardHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const seq = useRef(0);

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
      <View style={s.head}>
        <Txt variant="display">Search</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          A name, or a printed code like OP13-119.
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

      <FlatList
        data={hits}
        keyExtractor={(c) => c.cardId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListEmptyComponent={
          busy ? (
            <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.inkFaint} />
          ) : searched ? (
            <View style={s.empty}>
              <Feather name="search" size={22} color={colors.inkFaint} />
              <Txt variant="h3" center style={{ marginTop: space.md }}>No match</Txt>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    height: 52, paddingHorizontal: space.lg, marginTop: space.lg,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.line, backgroundColor: colors.surfaceSunk,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  list: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxxl },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  thumb: { width: 44, height: 61, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 1 },
  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.xl },
});
