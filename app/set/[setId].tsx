import { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS, FlatList, Image, Platform, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "../../components/BackButton";
import { useBack } from "../../lib/nav";
import { Bloom } from "../../components/Bloom";
import { Txt } from "../../components/Text";
import { CardArt, Shimmer } from "../../components/CardArt";
import { setDetail, type SetDetail } from "../../lib/cardmarket";
import { money, useFx } from "../../lib/fx";
import { colors, radius, shadow, space, type } from "../../theme";

type Card = SetDetail["cards"][number];
type Sort = "number" | "price-desc" | "price-asc" | "name";

const SORTS: { id: Sort; label: string; short: string }[] = [
  { id: "number", label: "By number", short: "Number" },
  { id: "price-desc", label: "Price, high to low", short: "Price ↓" },
  { id: "price-asc", label: "Price, low to high", short: "Price ↑" },
  { id: "name", label: "By name", short: "Name" },
];

/** One set, as a page you scroll rather than a panel of controls.
 *
 *  The first version of this put a search box, four sort chips and eight
 *  rarity chips above the grid, fixed, so a third of the screen was buttons
 *  before a single card — and every card carried four lines of type under it
 *  with "Ungraded" repeated a hundred and twenty times.
 *
 *  Now the set has a header worth looking at, everything above the cards
 *  scrolls away with them, sort is one control, rarity is one row, and a tile
 *  is a picture with its name and its price. Ungraded is said once, up top,
 *  where it is true of the whole page.
 */
export default function SetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  const goBack = useBack("/(tabs)/search");
  const fx = useFx();
  const [set, setSet] = useState<SetDetail | null | undefined>(undefined);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("number");
  const [rarity, setRarity] = useState<string | null>(null);

  useEffect(() => { setDetail(String(setId)).then(setSet); }, [setId]);

  const rarities = useMemo(() => {
    const seen: string[] = [];
    for (const c of set?.cards ?? []) if (c.rarity && !seen.includes(c.rarity)) seen.push(c.rarity);
    return seen;
  }, [set]);

  const priced = useMemo(() => (set?.cards ?? []).filter((c) => c.rawUsd != null).length, [set]);

  const shown = useMemo(() => {
    let list = set?.cards ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(needle) || c.localId.toLowerCase().includes(needle),
      );
    }
    if (rarity) list = list.filter((c) => c.rarity === rarity);
    const byNum = (a: Card, b: Card) =>
      numberOf(a.localId) - numberOf(b.localId) || a.localId.localeCompare(b.localId);
    const sorted = [...list];
    if (sort === "number") sorted.sort(byNum);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name) || byNum(a, b));
    else {
      // Unpriced last in both directions. Null is the absence of a number,
      // and a "cheapest first" list led by the cards we know least about
      // would present them as the best value.
      const dir = sort === "price-desc" ? -1 : 1;
      sorted.sort((a, b) => {
        if (a.rawUsd == null && b.rawUsd == null) return byNum(a, b);
        if (a.rawUsd == null) return 1;
        if (b.rawUsd == null) return -1;
        return (a.rawUsd - b.rawUsd) * dir || byNum(a, b);
      });
    }
    return sorted;
  }, [set, q, sort, rarity]);

  const pickSort = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...SORTS.map((s) => s.label), "Cancel"], cancelButtonIndex: SORTS.length },
        (i) => { if (i < SORTS.length) setSort(SORTS[i]!.id); },
      );
    } else {
      // No sheet on Android; step through them.
      const i = SORTS.findIndex((s) => s.id === sort);
      setSort(SORTS[(i + 1) % SORTS.length]!.id);
    }
  };

  const open = (card: Card) =>
    router.push({ pathname: "/card/[id]", params: { id: card.cardId, set: String(setId) } } as never);

  const year = set?.releasedAt ? set.releasedAt.slice(0, 4) : null;
  const filtering = q.trim().length > 0 || rarity != null;
  const heroArt = set?.logo ?? set?.cards?.[0]?.imageUrl ?? null;

  const header = (
    <View>
      {/* ---- the set, as a band ------------------------------------------ */}
      <View style={s.band}>
        <LinearGradient
          colors={["#2C3D4B", colors.dark, "#0B131B"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.bloom} pointerEvents="none"><Bloom size={420} color={colors.accent} opacity={0.42} /></View>
        {heroArt ? (
          <Image
            source={{ uri: heroArt }}
            style={[s.bandArt, set?.logo ? s.bandLogo : s.bandCard]}
            resizeMode={set?.logo ? "contain" : "cover"}
            blurRadius={set?.logo ? 0 : 14}
          />
        ) : null}
        <SafeAreaView edges={["top"]} style={s.bandInner}>
          <BackButton onPress={goBack} onDark />
          <View style={s.bandText}>
            {set ? (
              <>
                <Txt variant="display" color={colors.onDark} numberOfLines={2}>{set.name}</Txt>
                <Txt variant="bodySmall" color={colors.onDarkMuted} style={{ marginTop: 4 }}>
                  {set.cards.length} cards{year ? ` · ${year}` : ""}
                  {priced > 0 ? ` · ${priced === set.cards.length ? "all" : priced} priced, ungraded` : ""}
                </Txt>
              </>
            ) : set === undefined ? (
              <View style={{ gap: 8 }}>
                <View style={[s.boneDark, { width: "60%", height: 26 }]} />
                <View style={[s.boneDark, { width: "38%", height: 12 }]} />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      {/* ---- the sheet: find, sort, filter --------------------------------- */}
      <View style={s.sheet}>
        <View style={s.controls}>
          <View style={s.field}>
            <Feather name="search" size={16} color={colors.inkFaint} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Name or number"
              placeholderTextColor={colors.inkFaint}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={s.input}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
                <Feather name="x-circle" size={16} color={colors.inkFaint} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={pickSort} style={({ pressed }) => [s.sortBtn, pressed && { opacity: 0.8 }]} accessibilityLabel="Sort">
            <Feather name="sliders" size={15} color={colors.ink} />
            <Txt variant="overline" color={colors.ink}>{SORTS.find((x) => x.id === sort)!.short}</Txt>
          </Pressable>
        </View>

        {rarities.length > 0 && (
          <FlatList
            horizontal
            data={[null, ...rarities]}
            keyExtractor={(r) => r ?? "all"}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.rail}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: r }) => {
              const on = rarity === r;
              return (
                <Pressable
                  onPress={() => setRarity(r)}
                  style={[s.chip, on && s.chipOn]}
                  accessibilityState={{ selected: on }}
                >
                  <Txt variant="overline" color={on ? colors.onPrimary : colors.inkMuted} style={{ flexShrink: 0 }}>
                    {r ? prettyRarity(r) : "All"}
                  </Txt>
                </Pressable>
              );
            }}
          />
        )}

        {filtering && set ? (
          <Txt variant="bodySmall" color={colors.inkFaint} style={s.count}>
            {shown.length} of {set.cards.length}
          </Txt>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      {set === undefined ? (
        <View>
          {header}
          <View style={s.skeletonGrid}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={s.skeletonTile}>
                <View style={s.art}><Shimmer /></View>
                <View style={[s.bone, { width: "70%" }]} />
              </View>
            ))}
          </View>
        </View>
      ) : set === null ? (
        <View>
          {header}
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xxxl }}>
            That set couldn&rsquo;t be loaded.
          </Txt>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.cardId}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md, paddingHorizontal: space.lg }}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={{ marginTop: space.xxxl, alignItems: "center", gap: 4 }}>
              <Txt variant="h3" center>Nothing matches</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center>
                Try a different name or number, or clear the filter.
              </Txt>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [s.tile, pressed && s.tilePressed]}>
              <View style={s.art}><CardArt uri={item.imageUrl} iconSize={20} /></View>
              <View style={s.line}>
                <Txt variant="h3" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{item.name}</Txt>
                <Txt style={[s.price, item.rawUsd == null && { color: colors.inkFaint }]}>
                  {item.rawUsd != null ? money(item.rawUsd, { fx, from: "USD" }) : "—"}
                </Txt>
              </View>
              <Txt variant="overline" color={colors.inkFaint} numberOfLines={1}>
                #{item.localId}{item.rarity ? ` · ${prettyRarity(item.rarity)}` : ""}
              </Txt>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const prettyRarity = (r: string) =>
  r.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const numberOf = (id: string) => {
  const m = id.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },

  band: { overflow: "hidden", paddingBottom: space.xxl + 20 },
  bloom: { position: "absolute", right: -140, top: -160 },
  bandArt: { position: "absolute", opacity: 0.55 },
  bandLogo: { top: 44, right: -8, width: 210, height: 108, transform: [{ rotate: "-5deg" }] },
  bandCard: { top: -20, right: -50, width: 220, height: 310, opacity: 0.35, transform: [{ rotate: "10deg" }] },
  bandInner: { paddingHorizontal: space.lg, paddingTop: space.sm },
  bandText: { marginTop: space.lg, maxWidth: "72%" },
  boneDark: { borderRadius: 4, backgroundColor: "rgba(255,255,255,0.14)" },

  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    backgroundColor: colors.washBottom,
    paddingTop: space.lg, paddingBottom: space.sm,
  },
  controls: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg },
  field: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 46, paddingHorizontal: space.md,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    ...shadow.card,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    height: 46, paddingHorizontal: space.md,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    ...shadow.card,
  },
  rail: { flexDirection: "row", gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  count: { paddingHorizontal: space.lg, marginTop: space.md },

  list: { paddingBottom: space.xxxl, gap: space.md, paddingTop: space.sm },
  tile: {
    flex: 1, padding: 8, paddingBottom: 10, borderRadius: 16,
    backgroundColor: colors.surface, ...shadow.card,
  },
  tilePressed: { opacity: 0.85 },
  art: { width: "100%", aspectRatio: 0.72, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  line: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginTop: 8 },
  price: { ...type.button, color: colors.ink, fontVariant: ["tabular-nums"] },

  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  skeletonTile: { width: "47%", gap: 8, padding: 8, borderRadius: 16, backgroundColor: colors.surface },
  bone: { height: 12, borderRadius: 4, backgroundColor: colors.line },
});
