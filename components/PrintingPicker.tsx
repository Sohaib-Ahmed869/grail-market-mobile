import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { Note } from "./Note";
import { money, useFx } from "../lib/fx";
import { alsoSold, priceOf, type Variant } from "../lib/cardmarket";
import { colors, radius, shadow, space, type } from "../theme";

/** Which printing of this card is the one in your hand.
 *
 *  A collector number is not a card. OP13-118 is five different objects: a
 *  base Secret Rare around US$13, a Parallel near US$80, a Wanted Poster at
 *  US$330, a Super Alternate Art over US$2,000, and a Red Super Alternate Art
 *  the market prices in four figures. Our catalogue gives all five one id, so
 *  the app used to answer with a median of whatever a marketplace returned
 *  for the words on the card — A$197 for the last of those.
 *
 *  This is the honest form of that answer: say the versions exist, show each
 *  one's picture and price, and let the person point at theirs. Pictures
 *  rather than names, because the names are the thing nobody can tell apart —
 *  "Super Alternate Art" and "Red Super Alternate Art" are one word different
 *  and two thousand dollars apart, and the difference is visible at a glance.
 *
 *  A printing with no market price is shown as "none listed" and never as
 *  zero. For a chase card that is the true state: nobody has one for sale.
 */
export function PrintingPicker({
  variants, selected, onSelect, ambiguous,
}: {
  variants: Variant[];
  selected: number | null;
  onSelect: (productId: number | null) => void;
  ambiguous?: boolean;
}) {
  const fx = useFx();
  if (variants.length < 2) return null;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Txt variant="overline" color={colors.inkFaint}>
          {variants.length} versions of this card
        </Txt>
        {selected != null && (
          <Pressable onPress={() => onSelect(null)} hitSlop={8}>
            <Txt variant="label" color={colors.inkMuted}>Clear</Txt>
          </Pressable>
        )}
      </View>

      {ambiguous && selected == null && (
        <View style={{ marginBottom: space.md }}>
          <Note icon="alert-triangle" tone="accent">
            These versions are worth very different amounts. Pick the one you are
            holding and we will price that, rather than guess.
          </Note>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {variants.map((v) => {
          const on = v.productId === selected;
          return (
            <Pressable
              key={v.productId}
              onPress={() => onSelect(on ? null : v.productId)}
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${v.variant ?? "Base printing"}, ${priceOf(v) ? money(priceOf(v)!.usd, { fx, from: "USD" }) : "no price"}`}
              style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <View style={s.art}>
                {v.imageUrl
                  ? <Image source={{ uri: v.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Feather name="image" size={16} color={colors.inkFaint} />}
                {on && (
                  <View style={s.tick}><Feather name="check" size={12} color={colors.dark} /></View>
                )}
              </View>
              <Txt variant="label" numberOfLines={2} style={s.name}>
                {v.variant ?? "Base printing"}
              </Txt>
              {(() => {
                const p = priceOf(v);
                return (
                  <>
                    <Txt
                      style={[s.price, !p && { color: colors.inkFaint, ...type.bodySmall }]}
                      numberOfLines={1}
                    >
                      {p ? money(p.usd, { fx, from: "USD" }) : "no price"}
                    </Txt>
                    {/* Which KIND of number it is. A sale and an ask are not
                        the same claim, and on the scarcest printings the only
                        figure that exists is somebody's asking price. */}
                    {p && (
                      <Txt style={s.basis} numberOfLines={1}>
                        {p.sold
                          ? "last sold"
                          : alsoSold(v) != null
                            ? `asking · sold ${money(alsoSold(v)!, { fx, from: "USD" })}`
                            : "asking"}
                      </Txt>
                    )}
                  </>
                );
              })()}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: space.xl, marginHorizontal: -space.xl },
  head: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, marginBottom: space.sm,
  },
  rail: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.xl, paddingVertical: 4 },
  tile: {
    width: 108, padding: 8, borderRadius: radius.md,
    backgroundColor: colors.surface, ...shadow.card,
    borderWidth: 1.5, borderColor: "transparent",
  },
  tileOn: { borderColor: colors.accent },
  art: {
    width: "100%", aspectRatio: 0.72, borderRadius: 8, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center",
  },
  tick: {
    position: "absolute", top: 5, right: 5,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.accent,
  },
  name: { marginTop: 6, minHeight: 34 },
  price: { ...type.button, color: colors.ink, fontVariant: ["tabular-nums"] },
  basis: { ...type.overline, fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
});
