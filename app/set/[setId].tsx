import { useEffect, useMemo, useState } from "react";
import {
  FlatList, Image, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "../../components/BackButton";
import { useBack } from "../../lib/nav";
import { PageWash } from "../../components/PageWash";
import { Bloom } from "../../components/Bloom";
import { Txt } from "../../components/Text";
import { CardArt, Shimmer } from "../../components/CardArt";
import { setDetail, type SetDetail } from "../../lib/cardmarket";
import { money, useFx } from "../../lib/fx";
import { colors, radius, space, type } from "../../theme";

type Card = SetDetail["cards"][number];
type Sort = "number" | "price-desc" | "price-asc" | "name";

const SORTS: { id: Sort; label: string }[] = [
  { id: "number", label: "Number" },
  { id: "price-desc", label: "Price ↓" },
  { id: "price-asc", label: "Price ↑" },
  { id: "name", label: "Name" },
];

/** One set, every card in it, and what each is worth ungraded.
 *
 *  This was a three-column grid of thumbnails with a name and a number, which
 *  is a checklist. What a person opening a set actually wants to know is
 *  which of these cards matter — so it is two columns with room for a price,
 *  a search box for a set of two hundred, a filter by rarity, and a sort by
 *  what things cost. The set's own artwork is the ground the header sits on
 *  rather than a flat grey band, because the artwork is the whole reason
 *  anybody is here.
 *
 *  Cards within a set share a release date, so "sort by date" belongs to the
 *  set list, which is already newest first. Here the date is in the header.
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
  const [pricedOnly, setPricedOnly] = useState(false);

  useEffect(() => { setDetail(String(setId)).then(setSet); }, [setId]);

  // The rarities THIS set contains, in the order they appear. A fixed list
  // would show "Enchanted" on a Pokemon set that has never printed one.
  const rarities = useMemo(() => {
    const seen: string[] = [];
    for (const c of set?.cards ?? []) {
      if (c.rarity && !seen.includes(c.rarity)) seen.push(c.rarity);
    }
    return seen;
  }, [set]);

  const priced = useMemo(
    () => (set?.cards ?? []).filter((c) => c.rawUsd != null).length,
    [set],
  );

  const shown = useMemo(() => {
    let list = set?.cards ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(needle) || c.localId.toLowerCase().includes(needle),
      );
    }
    if (rarity) list = list.filter((c) => c.rarity === rarity);
    if (pricedOnly) list = list.filter((c) => c.rawUsd != null);

    // A price sort puts the unpriced LAST, not first. Null is not a small
    // number; it is the absence of one, and sorting it to the top of a
    // "cheapest first" list would present the cards we know least about as
    // the best value.
    const byNum = (a: Card, b: Card) =>
      numberOf(a.localId) - numberOf(b.localId) || a.localId.localeCompare(b.localId);
    const sorted = [...list];
    if (sort === "number") sorted.sort(byNum);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name) || byNum(a, b));
    else {
      const dir = sort === "price-desc" ? -1 : 1;
      sorted.sort((a, b) => {
        if (a.rawUsd == null && b.rawUsd == null) return byNum(a, b);
        if (a.rawUsd == null) return 1;
        if (b.rawUsd == null) return -1;
        return (a.rawUsd - b.rawUsd) * dir || byNum(a, b);
      });
    }
    return sorted;
  }, [set, q, sort, rarity, pricedOnly]);

  const open = (card: Card) =>
    router.push({
      // The set travels with the card: seven of nine catalogues key cards on
      // an opaque id with no set inside it, and this screen has the set.
      pathname: "/card/[id]",
      params: { id: card.cardId, set: String(setId) },
    } as never);

  const year = set?.releasedAt ? set.releasedAt.slice(0, 4) : null;
  const filtering = q.trim().length > 0 || rarity != null || pricedOnly;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />

      {/* ---- the set as the ground of its own header ---------------------- */}
      {/* Its logo, or failing that its first card, drawn large and faint under
          the title, with the brand's navy and gold blooms behind it. Faded
          out through a gradient into the page so the grid below sits on the
          ordinary paper — the artwork is a backdrop, not a competitor. */}
      <View style={s.hero} pointerEvents="none">
        <View style={s.bloomNavy}><Bloom size={520} color={colors.dark} opacity={0.14} /></View>
        <View style={s.bloomGold}><Bloom size={460} color={colors.accent} opacity={0.22} /></View>
        {(set?.logo ?? set?.cards?.[0]?.imageUrl) ? (
          <Image
            source={{ uri: (set!.logo ?? set!.cards[0]!.imageUrl)! }}
            style={[s.heroArt, set?.logo ? s.heroLogo : s.heroCard]}
            resizeMode={set?.logo ? "contain" : "cover"}
            blurRadius={set?.logo ? 0 : 16}
          />
        ) : null}
        <LinearGradient
          colors={["rgba(250,251,252,0)", "rgba(250,251,252,0.6)", colors.washBottom]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* And from the top, so the art never meets the status bar as a hard
            edge — it emerges out of the page's own ground. */}
        <LinearGradient
          colors={[colors.washTop, "rgba(228,232,238,0)"]}
          locations={[0, 0.45]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={s.head}>
        <BackButton onPress={goBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {set ? (
            <>
              <Txt variant="h1" numberOfLines={2}>{set.name}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted}>
                {set.cards.length} cards
                {year ? ` · ${year}` : ""}
                {priced > 0 ? ` · ${priced} priced` : ""}
              </Txt>
            </>
          ) : set === undefined ? (
            <View style={{ gap: 6 }}>
              <View style={[s.bone, { width: "70%", height: 22 }]} />
              <View style={[s.bone, { width: "40%", height: 12 }]} />
            </View>
          ) : null}
        </View>
      </View>

      {/* ---- search + sort + filter ------------------------------------- */}
      <View style={s.field}>
        <Feather name="search" size={17} color={colors.inkFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Name or number in this set"
          placeholderTextColor={colors.inkFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={s.input}
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
            <Feather name="x-circle" size={17} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      {/* A wrapping row, not a horizontal ScrollView. Eight chips fit on two
          lines and nothing hides off the right edge — and inside a horizontal
          ScrollView on iOS these labels laid out at the right width and then
          drew nothing at all, every pill blank. */}
      <View style={s.chips}>
        {SORTS.map((o) => (
          <Chip key={o.id} on={sort === o.id} label={o.label} onPress={() => setSort(o.id)} />
        ))}
        {(rarities.length > 0 || priced > 0) && <View style={s.chipRule} />}
        {priced > 0 && (
          <Chip on={pricedOnly} label="Priced" icon="tag" onPress={() => setPricedOnly((v) => !v)} />
        )}
        {rarities.map((r) => (
          <Chip
            key={r}
            on={rarity === r}
            label={prettyRarity(r)}
            onPress={() => setRarity((cur) => (cur === r ? null : r))}
          />
        ))}
      </View>

      {/* ---- the cards ---------------------------------------------------- */}
      {set === undefined ? (
        <View style={s.skeletonGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={s.skeletonTile}>
              <View style={s.art}><Shimmer /></View>
              <View style={[s.bone, { width: "80%" }]} />
              <View style={[s.bone, { width: "45%" }]} />
            </View>
          ))}
        </View>
      ) : set === null ? (
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xxxl }}>
          That set couldn&rsquo;t be loaded.
        </Txt>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.cardId}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            filtering ? (
              <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginBottom: space.sm }}>
                {shown.length} of {set.cards.length}
              </Txt>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ marginTop: space.xxxl, alignItems: "center", gap: 4 }}>
              <Txt variant="h3" center>Nothing matches</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center>
                Try a different name or number, or clear a filter.
              </Txt>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [s.tile, pressed && s.tilePressed]}
            >
              <View style={s.art}>
                <CardArt uri={item.imageUrl} iconSize={20} />
              </View>
              <View style={s.body}>
                <Txt variant="h3" numberOfLines={2} style={s.name}>{item.name}</Txt>
                <View style={s.metaRow}>
                  <Txt variant="overline" color={colors.inkFaint}>#{item.localId}</Txt>
                  {item.rarity ? (
                    <View style={s.rarity}>
                      <Txt variant="overline" color={colors.accent} numberOfLines={1}>
                        {prettyRarity(item.rarity)}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                <View style={s.priceRow}>
                  {item.rawUsd != null ? (
                    <Txt style={s.price}>{money(item.rawUsd, { fx, from: "USD" })}</Txt>
                  ) : (
                    <Txt style={[s.price, { color: colors.inkFaint }]}>—</Txt>
                  )}
                  <Txt variant="overline" color={colors.inkFaint}>Ungraded</Txt>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  on, label, icon, onPress,
}: { on: boolean; label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
      {icon ? <Feather name={icon} size={12} color={on ? colors.onPrimary : colors.inkMuted} /> : null}
      <Txt variant="overline" color={on ? colors.onPrimary : colors.inkMuted} style={{ flexShrink: 0 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** "Super_rare" as the source spells it becomes "Super Rare". */
const prettyRarity = (r: string) =>
  r.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/** The number inside a collector id, so "OP17-109" sorts after "OP17-093"
 *  and "4" before "10". Ids with no digits sort to the end together. */
const numberOf = (id: string) => {
  const m = id.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

const HERO_H = 210;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },

  hero: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_H, overflow: "hidden" },
  bloomNavy: { position: "absolute", top: -260, left: -180 },
  bloomGold: { position: "absolute", top: -200, right: -170 },
  heroArt: { position: "absolute", opacity: 0.18 },
  heroLogo: { top: 28, right: -10, width: 230, height: 120, transform: [{ rotate: "-6deg" }] },
  // Pushed further off the corner than it was, because with a quarter of it
  // on the page its left edge read as a rectangle glued to the header. Now
  // only a rotated sliver shows, and the fade below dissolves what is left.
  heroCard: { top: -70, right: -80, width: 220, height: 310, transform: [{ rotate: "12deg" }] },

  head: {
    flexDirection: "row", alignItems: "flex-start", gap: space.md,
    paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md,
    minHeight: 84,
  },
  bone: { height: 12, borderRadius: 4, backgroundColor: colors.line },

  field: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    height: 50, marginHorizontal: space.xl, paddingHorizontal: space.lg,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.outline, backgroundColor: colors.surface,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },

  // No alignItems here. Text inside a horizontal ScrollView is measured
  // against a container that centres it, and on iOS that measurement came
  // back as zero width — every pill drew and every label vanished. Centring
  // lives on the chip itself, and the label refuses to shrink.
  chips: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.xl, paddingVertical: space.md,
  },
  chip: {
    flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6,
    paddingHorizontal: space.md, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.lineStrong, backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipRule: { width: 1, height: 18, backgroundColor: colors.lineStrong, marginHorizontal: 2 },

  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.md },
  tile: {
    flex: 1, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  tilePressed: { opacity: 0.8, borderColor: colors.outline },
  art: { width: "100%", aspectRatio: 0.72, backgroundColor: colors.surfaceSunk },
  body: { padding: space.md, gap: 6 },
  name: { minHeight: 42 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  rarity: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
    backgroundColor: colors.accentWash, flexShrink: 1,
  },
  priceRow: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    marginTop: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line,
  },
  price: { ...type.button, color: colors.ink, fontVariant: ["tabular-nums"] },

  skeletonGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: space.md,
    paddingHorizontal: space.xl, paddingTop: space.sm,
  },
  skeletonTile: {
    width: "47%", gap: 8, padding: space.md, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
});
