import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { money, useFx } from "../lib/fx";
import type { ShopQuote } from "../lib/cardmarket";
import { colors, radius, space } from "../theme";

/** Where this card can be bought, and for how much.
 *
 *  The page above answers what a card is worth. This answers the question
 *  people ask straight after, which is where to get one.
 *
 *  The two kinds of row are kept visibly apart, because they are different
 *  promises. A LIVE row is a listing that exists right now and the tap opens
 *  it. A MARKET row is the shop's own published price for the product with a
 *  link to its page — a real number from a real shop, but not a copy we can
 *  promise is in stock. Neither TCGplayer nor Cardmarket lets us read their
 *  sellers' inventory, so quietly rendering their market price in the same
 *  shape as an eBay listing would be selling a summary as a stock check.
 *
 *  Every figure keeps its own currency until the moment it is shown, so the
 *  Cardmarket euro and the TCGplayer dollar each convert at their own rate
 *  rather than one being relabelled as the other. */
export function BuyAt({ shops }: { shops: ShopQuote[] | null | undefined }) {
  const fx = useFx();
  if (!shops?.length) return null;

  const live = shops.filter((s) => s.kind === "live");
  const market = shops.filter((s) => s.kind === "market");

  const row = (s: ShopQuote, i: number) => {
    const price = money(s.price, { fx, from: s.currency });
    const open = s.url ? () => Linking.openURL(s.url as string) : undefined;
    return (
      <Pressable
        key={`${s.id}-${s.basis}`}
        style={({ pressed }) => [
          st.row,
          i === 0 ? st.rowFirst : null,
          pressed && open ? st.rowPressed : null,
        ]}
        onPress={open}
        disabled={!open}
        accessibilityRole={open ? "link" : undefined}
        accessibilityLabel={
          open ? `${s.name}, ${price}, ${s.basis} — opens ${s.name}` : `${s.name}, ${price}`
        }
      >
        <View style={st.rowMain}>
          <Txt variant="body" style={st.shop}>{s.name}</Txt>
          {/* What the number IS, never dropped. "median ask" and "price
              trend" are different claims and the label is what keeps a
              reader from averaging them in their head. */}
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {s.basis}
            {s.count ? ` · ${s.count} ${s.count === 1 ? "listing" : "listings"}` : ""}
            {s.low != null && s.low !== s.price ? ` · from ${money(s.low, { fx, from: s.currency })}` : ""}
          </Txt>
        </View>
        <View style={st.rowEnd}>
          <Txt variant="body" style={st.price}>{price}</Txt>
          {open && <Feather name="external-link" size={13} color={colors.inkFaint} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={st.wrap}>
      <Txt variant="overline" color={colors.inkFaint}>Buy this card</Txt>

      {live.length > 0 && (
        <View style={st.group}>
          <Txt variant="bodySmall" color={colors.inkMuted} style={st.groupLabel}>
            On sale now
          </Txt>
          <View style={st.card}>{live.map(row)}</View>
        </View>
      )}

      {market.length > 0 && (
        <View style={st.group}>
          <Txt variant="bodySmall" color={colors.inkMuted} style={st.groupLabel}>
            What these shops price it at
          </Txt>
          <View style={st.card}>{market.map(row)}</View>
          {/* Said once, plainly, rather than hedged on every row. */}
          <Txt variant="bodySmall" color={colors.inkFaint} style={st.foot}>
            Their own market price, not a stock check — tap to see what is
            actually listed.
          </Txt>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: space.xxl, gap: space.md },
  group: { gap: space.xs },
  groupLabel: { marginTop: space.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  // The divider belongs BETWEEN rows, so the first one does not draw a line
  // against the card's own border a hairline above it.
  rowFirst: { borderTopWidth: 0 },
  rowPressed: { backgroundColor: colors.surfaceSunk },
  rowMain: { flex: 1, gap: 2 },
  rowEnd: { flexDirection: "row", alignItems: "center", gap: space.sm },
  shop: { fontWeight: "600" },
  price: { fontWeight: "700" },
  foot: { marginTop: space.xs },
});
