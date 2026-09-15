import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { CardArt } from "../../components/CardArt";
import { Txt } from "../../components/Text";
import { money, useFx } from "../../lib/fx";
import { colors, radius, shadow, space, type } from "../../theme";

/** One sealed product.
 *
 *  Everything on this page arrives with the tap — the grid already holds the
 *  product's picture and its prices — so it opens instantly and asks nothing
 *  of the server.
 *
 *  No eBay asks here, on purpose. Sealed listings are searched by name, and
 *  "Elite Trainer Box" and "Pokemon Center Elite Trainer Box" of the same set
 *  are a US$60 and a US$670 product one word apart; a median over whatever
 *  the name search returned would be exactly the confident wrong figure this
 *  app refuses to print. The price shown is TCGplayer's for this product id.
 */
export default function SealedProductPage() {
  const { name, set, image, market, low, url } = useLocalSearchParams<{
    id: string; name?: string; set?: string; image?: string; market?: string; low?: string; url?: string;
  }>();
  const fx = useFx();
  const marketUsd = market ? Number(market) : null;
  const lowUsd = low ? Number(low) : null;

  return (
    <Screen back>
      <View style={s.hero}><CardArt uri={image || null} resizeMode="contain" iconSize={30} /></View>

      <Txt variant="h1" center style={{ marginTop: space.xl }}>{name}</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>{set} · Sealed</Txt>

      <View style={s.quote}>
        <Txt variant="overline" color={colors.inkFaint} center>Market price</Txt>
        <Txt style={s.price}>{marketUsd != null && Number.isFinite(marketUsd) ? money(marketUsd, { fx, from: "USD" }) : "—"}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} center>
          {marketUsd != null
            ? `TCGplayer, for this exact product${lowUsd != null ? ` · lowest listed ${money(lowUsd, { fx, from: "USD" })}` : ""}`
            : "No recent sale on TCGplayer — a pre-order, or too scarce to have sold."}
        </Txt>
      </View>

      {url ? (
        <Pressable onPress={() => Linking.openURL(String(url))}
          style={({ pressed }) => [s.buy, pressed && { opacity: 0.9 }]} accessibilityRole="link">
          <Txt variant="button" color={colors.onPrimary}>View on TCGplayer</Txt>
          <Feather name="external-link" size={16} color={colors.onPrimary} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: {
    alignSelf: "center", width: "82%", aspectRatio: 1, marginTop: space.lg, padding: space.lg,
    borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.surface, ...shadow.lifted,
  },
  quote: {
    marginTop: space.xl, paddingVertical: space.lg, paddingHorizontal: space.lg, gap: 4,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card,
  },
  price: { ...type.price, fontVariant: ["tabular-nums"], color: colors.ink, textAlign: "center" },
  buy: {
    marginTop: space.xl, height: 54, borderRadius: radius.pill, backgroundColor: colors.ink,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
  },
});
