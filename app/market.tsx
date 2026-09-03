import { useCallback, useEffect, useState } from "react";
import {
  FlatList, Image, Pressable, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBack } from "../lib/nav";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../components/PageWash";
import { SkeletonCard } from "../components/Skeleton";
import { Txt } from "../components/Text";
import { GraderBadge } from "../components/GraderChips";
import { browse, num, type Listing } from "../lib/market";
import { VARIANTS } from "../lib/grading";
import { colors, radius, space, type } from "../theme";

const money = (v: string | number | null | undefined) => {
  const n = num(v);
  return n == null ? "—" : `A$${Math.round(n).toLocaleString()}`;
};

/** How long it has been up.
 *
 *  Shown on every card, because age is the single most useful thing a buyer
 *  can know that the seller would rather they didn't: a card that has sat for
 *  six weeks is priced wrong, and that is the opening for an offer. */
function age(iso: string | null): string {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

const GAMES = [
  { id: "", label: "All" },
  { id: "pokemon", label: "Pokémon" },
  { id: "onepiece", label: "One Piece" },
  { id: "mtg", label: "Magic" },
  { id: "yugioh", label: "Yu-Gi-Oh!" },
];

// TAG is in this list deliberately. It is small, it grades to 1000 points, and
// leaving it out of the filter is how a TAG slab ends up mis-sorted as raw.
const GRADERS = ["PSA", "BGS", "CGC", "SGC", "TAG", "AGS"];

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
];

export default function Market() {
  const router = useRouter();
  const goBack = useBack();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [game, setGame] = useState("");
  const [grader, setGrader] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);
  const [sort, setSort] = useState("featured");
  // Seeded from the route, so arriving here from a price mover lands on the
  // listings for that card rather than on the whole market with the name
  // typed nowhere.
  const { q: fromRoute } = useLocalSearchParams<{ q?: string }>();
  // Open when we arrived with a term, so the reason the list is narrowed is
  // on screen and one tap from being cleared. Seeding a hidden field and
  // showing filtered results is how a market looks broken.
  const [open, setOpen] = useState(Boolean(fromRoute));
  // The rest of what the scope document asks a buyer to be able to narrow by.
  const [q, setQ] = useState(fromRoute ?? "");
  const [setName, setSetName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [variant, setVariant] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [band, setBand] = useState<{ min?: number; max?: number } | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const r = await browse({
      game: game || undefined,
      grader: grader ?? undefined,
      graded: raw ? false : undefined,
      q: q.trim() || undefined,
      set: setName.trim() || undefined,
      number: cardNumber.trim() || undefined,
      variant: variant ?? undefined,
      grade: grade ?? undefined,
      min: band?.min, max: band?.max,
      sort,
    });
    setRows(r.listings);
  }, [game, grader, raw, sort, q, setName, cardNumber, variant, grade, band]);

  useEffect(() => { load(); }, [load]);

  const filters = [
    game && GAMES.find((g) => g.id === game)?.label, grader, raw && "Raw only",
    setName.trim(), cardNumber.trim(), variant, grade, band,
  ].filter(Boolean).length;

  const clearAll = () => {
    setGame(""); setGrader(null); setRaw(false);
    setSetName(""); setCardNumber(""); setVariant(null); setGrade(null); setBand(null);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <View style={s.head}>
        <View style={s.headRow}>
          <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Go back" style={s.back}>
            <Feather name="chevron-left" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt variant="display">Market</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
              {sort === "featured" ? "Featured first, then newest" : SORTS.find((x) => x.id === sort)?.label}
              {rows ? ` · ${rows.length} listing${rows.length === 1 ? "" : "s"}` : ""}
            </Txt>
          </View>
          <Pressable onPress={() => setOpen((o) => !o)} style={[s.filterBtn, filters > 0 && s.filterOn]}>
            <Feather name="sliders" size={15} color={filters ? colors.onPrimary : colors.ink} />
            {filters > 0 && (
              <Txt variant="overline" color={colors.onPrimary}>{filters}</Txt>
            )}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}>
          {GAMES.map((g) => (
            <Chip key={g.id} label={g.label} on={game === g.id} onPress={() => setGame(g.id)} />
          ))}
        </ScrollView>

        {open && (
          <View style={s.panel}>
            <Txt variant="overline" color={colors.inkFaint}>Grading company</Txt>
            <View style={s.wrap}>
              <Chip label="Any" on={grader == null && !raw} onPress={() => { setGrader(null); setRaw(false); }} />
              {GRADERS.map((g) => (
                <Chip key={g} label={g} on={grader === g} onPress={() => { setGrader(g); setRaw(false); }} />
              ))}
              <Chip label="Raw only" on={raw} onPress={() => { setRaw(true); setGrader(null); }} />
            </View>

            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.md }}>Grade</Txt>
            <View style={s.wrap}>
              <Chip label="Any" on={grade == null} onPress={() => setGrade(null)} />
              {["10", "9.5", "9", "8.5", "8"].map((g) => (
                <Chip key={g} label={g} on={grade === g} onPress={() => setGrade(g)} />
              ))}
            </View>

            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.md }}>
              Printing
            </Txt>
            <View style={s.wrap}>
              <Chip label="Any" on={variant == null} onPress={() => setVariant(null)} />
              {VARIANTS.slice(0, 6).map((v) => (
                <Chip key={v.value} label={v.label} on={variant === v.value}
                  onPress={() => setVariant(v.value)} />
              ))}
            </View>

            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.md }}>Price</Txt>
            <View style={s.wrap}>
              <Chip label="Any" on={band == null} onPress={() => setBand(null)} />
              {[
                { label: "Under A$100", min: undefined, max: 100 },
                { label: "A$100–500", min: 100, max: 500 },
                { label: "A$500–2k", min: 500, max: 2000 },
                { label: "A$2k+", min: 2000, max: undefined },
              ].map((b) => (
                <Chip
                  key={b.label}
                  label={b.label}
                  on={band?.min === b.min && band?.max === b.max}
                  onPress={() => setBand({ min: b.min, max: b.max })}
                />
              ))}
            </View>

            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.md }}>
              Set and number
            </Txt>
            <View style={s.pair}>
              <TextInput
                value={setName}
                onChangeText={setSetName}
                placeholder="Base Set"
                placeholderTextColor={colors.inkFaint}
                style={[s.input, { flex: 2 }]}
              />
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="#4"
                placeholderTextColor={colors.inkFaint}
                style={[s.input, { flex: 1 }]}
              />
            </View>

            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.md }}>Order</Txt>
            <View style={s.wrap}>
              {SORTS.map((x) => (
                <Chip key={x.id} label={x.label} on={sort === x.id} onPress={() => setSort(x.id)} />
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={rows ?? []}
        keyExtractor={(l) => l.listing_id}
        numColumns={2}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={s.list}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={
          rows == null ? (
            <View style={s.skeletonGrid}>
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} grid />)}
            </View>
          ) : (
            <View style={s.empty}>
              <Feather name="shopping-bag" size={22} color={colors.inkFaint} />
              <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Here Yet</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
                {filters ? "Nothing matches those filters." : "Listings appear once they've been checked."}
              </Txt>
              {filters > 0 && (
                <Pressable onPress={clearAll} style={s.clearBtn}>
                  <Txt variant="button">Clear {filters} filter{filters === 1 ? "" : "s"}</Txt>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => {
          const market = num(item.market_value);
          const price = num(item.price) ?? 0;
          const under = market != null && price < market;
          const img = item.photos?.[0]?.url ?? item.image_url;
          return (
            <Pressable
              onPress={() => router.push(`/listing/${item.listing_id}` as any)}
              style={({ pressed }) => [s.tile, pressed && { opacity: 0.85 }]}
            >
              <View style={s.shot}>
                {img ? (
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Feather name="image" size={20} color={colors.inkFaint} />
                )}
                <View style={s.overlay}>
                  {item.featured && (
                    <View style={[s.tag, { backgroundColor: colors.accent }]}>
                      <Txt variant="overline" color={colors.onPrimary} style={s.tagTxt}>Featured</Txt>
                    </View>
                  )}
                  {item.photo_verified && (
                    <View style={[s.tag, { backgroundColor: colors.up }]}>
                      <Feather name="camera" size={8} color={colors.onPrimary} />
                    </View>
                  )}
                </View>
                <View style={s.gradeTag}>
                  <GraderBadge grader={item.grader ?? "RAW"} grade={item.grade} />
                </View>
              </View>
              <Txt variant="h3" numberOfLines={1} style={{ marginTop: space.sm }}>{item.card_name}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                {item.set_name ?? ""}
              </Txt>
              <Txt variant="h2" style={{ marginTop: 2 }}>{money(item.price)}</Txt>
              <Txt variant="bodySmall" color={under ? colors.up : colors.inkFaint} numberOfLines={1}>
                {market != null
                  ? `${under ? "under" : "over"} market ${money(market)}`
                  : "no market value yet"}
              </Txt>
              <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: 2 }}>
                Listed {age(item.live_at)}
              </Txt>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Txt variant="bodySmall" color={on ? colors.onPrimary : colors.inkMuted}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  back: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    height: 38, paddingHorizontal: space.md, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.lineStrong,
  },
  filterOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  rail: { marginTop: space.lg, marginHorizontal: -space.xl, paddingHorizontal: space.xl },
  panel: {
    marginTop: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: {
    paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
    marginRight: 6,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  list: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxxl, gap: space.xl },
  tile: { flex: 1 },
  shot: {
    aspectRatio: 0.72, borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center",
  },
  overlay: { position: "absolute", top: 6, left: 6, flexDirection: "row", gap: 4 },
  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4 },
  tagTxt: { fontSize: 11, letterSpacing: 0.1 },
  gradeTag: { position: "absolute", bottom: 6, left: 6 },
  empty: { alignItems: "center", marginTop: space.xxxl, width: "100%" },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, width: "100%" },
  pair: { flexDirection: "row", gap: 6, marginTop: 6 },
  input: {
    height: 42, paddingHorizontal: space.md, ...type.bodySmall, color: colors.ink,
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.surface,
  },
  clearBtn: {
    marginTop: space.lg, paddingHorizontal: space.lg, height: 42,
    alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong,
  },
});
