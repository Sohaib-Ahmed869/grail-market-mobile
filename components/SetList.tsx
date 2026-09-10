import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CardArt } from "./CardArt";
import { Txt } from "./Text";
import { money, useFx } from "../lib/fx";
import { colors, radius, shadow, space, type } from "../theme";

export type SetCard = {
  cardId: string; name: string; localId: string;
  imageUrl: string | null; rawUsd: number | null; rarity: string | null;
};

type Sort = "number" | "dear" | "cheap" | "name";

const SORTS: { id: Sort; label: string }[] = [
  { id: "number", label: "Set order" },
  { id: "dear", label: "Most valuable" },
  { id: "cheap", label: "Least valuable" },
  { id: "name", label: "A to Z" },
];

/** The whole set, as a list you can sort.
 *
 *  The deck is for thumbing through a set the way you would a binder, and
 *  that is the right default — but it is a terrible way to answer "what is
 *  the good card in here", which is the question anybody opening an unfamiliar
 *  set actually has. This is the other half: every card at once, with a
 *  price against each, ordered by whatever you want to know.
 *
 *  Sorting by price puts the unpriced at the BOTTOM in both directions. A
 *  null is the absence of a number, and a "cheapest first" list led by the
 *  cards we know least about would be presenting them as the best value in
 *  the set.
 */
export function SetList({
  visible, cards, currentId, setName, onPick, onClose,
}: {
  visible: boolean;
  cards: SetCard[];
  currentId: string;
  setName: string;
  onPick: (cardId: string) => void;
  onClose: () => void;
}) {
  const fx = useFx();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("number");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle
      ? cards.filter((c) => c.name.toLowerCase().includes(needle) || c.localId.toLowerCase().includes(needle))
      : cards;
    const byNum = (a: SetCard, b: SetCard) =>
      numberOf(a.localId) - numberOf(b.localId) || a.localId.localeCompare(b.localId);
    const out = [...list];
    if (sort === "number") out.sort(byNum);
    else if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name) || byNum(a, b));
    else {
      const dir = sort === "dear" ? -1 : 1;
      out.sort((a, b) => {
        if (a.rawUsd == null && b.rawUsd == null) return byNum(a, b);
        if (a.rawUsd == null) return 1;      // unpriced last, both ways
        if (b.rawUsd == null) return -1;
        return (a.rawUsd - b.rawUsd) * dir || byNum(a, b);
      });
    }
    return out;
  }, [cards, q, sort]);

  const priced = useMemo(() => cards.filter((c) => c.rawUsd != null).length, [cards]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="h2" numberOfLines={1}>{setName || "This set"}</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint}>
              {cards.length} cards
              {priced > 0 ? ` · ${priced === cards.length ? "all" : priced} priced, ungraded` : ""}
            </Txt>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={s.close} accessibilityLabel="Close">
            <Feather name="x" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.field}>
          <Feather name="search" size={16} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Name or number"
            placeholderTextColor={colors.inkFaint}
            autoCorrect={false}
            autoCapitalize="none"
            style={s.input}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear">
              <Feather name="x-circle" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        {/* Wrapped, not scrolled.
         *
         *  This was a horizontal ScrollView with `flexGrow: 0`, which in a
         *  flex column gives it no height of its own: the row collapsed to a
         *  few points and clipped the chips, so each label showed as a
         *  sliver across the middle of its own letters. Four chips fit in two
         *  lines at any width, and a wrapping row cannot collapse. */}
        <View style={s.sorts}>
          {SORTS.map((x) => (
            <Pressable key={x.id} onPress={() => setSort(x.id)}
              style={({ pressed }) => [s.chip, sort === x.id && s.chipOn, pressed && !(sort === x.id) && { opacity: 0.7 }]}
              accessibilityState={{ selected: sort === x.id }}>
              <Txt variant="label" color={sort === x.id ? colors.onPrimary : colors.ink}>{x.label}</Txt>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={shown}
          keyExtractor={(c, i) => `${c.cardId}:${i}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: space.xxxl }}
          ListEmptyComponent={
            <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xxl }}>
              Nothing matches that.
            </Txt>
          }
          renderItem={({ item }) => {
            const here = item.cardId === currentId;
            return (
              <Pressable
                onPress={() => { onPick(item.cardId); onClose(); }}
                style={({ pressed }) => [s.row, here && s.rowHere, pressed && { backgroundColor: colors.surfaceSunk }]}
              >
                <View style={s.art}><CardArt uri={item.imageUrl} iconSize={14} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="h3" numberOfLines={1}>{item.name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                    #{item.localId}{item.rarity ? ` · ${pretty(item.rarity)}` : ""}
                  </Txt>
                </View>
                {/* A dash, never a zero: unpriced is unknown, not worthless. */}
                <Txt style={[s.price, item.rawUsd == null && { color: colors.inkFaint }]}>
                  {item.rawUsd != null ? money(item.rawUsd, { fx, from: "USD" }) : "—"}
                </Txt>
                {here && <Feather name="check" size={16} color={colors.accent} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const pretty = (r: string) => r.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const numberOf = (id: string) => {
  const m = id.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md,
  },
  close: {
    width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.field,
  },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 46, marginHorizontal: space.xl, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  sorts: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: space.xl, paddingVertical: space.md,
  },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.field },
  chipOn: { backgroundColor: colors.ink },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.xl, paddingVertical: space.sm,
  },
  rowHere: { backgroundColor: colors.accentWash },
  art: { width: 40, height: 56, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  price: { ...type.button, color: colors.ink, fontVariant: ["tabular-nums"] },
});
