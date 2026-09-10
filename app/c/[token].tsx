import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Loader } from "../../components/Loader";
import { CardArt } from "../../components/CardArt";
import { GraderBadge } from "../../components/GraderChips";
import { sharedCollection, type SharedEntry } from "../../lib/market";
import { money, useFx } from "../../lib/fx";
import { useSession } from "../../lib/session";
import { colors, radius, shadow, space, type } from "../../theme";

/** Somebody else's binder, opened from a link.
 *
 *  Readable without an account, because a link you have to sign up to open is
 *  not a link you can send anyone. What it shows is the cards and what they
 *  are worth — never what the owner paid, and so never whether they are up or
 *  down. The value of a collection is a fact about cards; the cost is a fact
 *  about a person's finances.
 */
export default function SharedCollection() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const session = useSession();
  const fx = useFx();
  const [data, setData] = useState<Awaited<ReturnType<typeof sharedCollection>> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    sharedCollection(String(token)).then((r) => { if (alive) setData(r); });
    return () => { alive = false; };
  }, [token]);

  if (data === undefined) return <Screen back><Loader fill /></Screen>;

  if (data === null) {
    return (
      <Screen back>
        <View style={s.gone}>
          <View style={s.goneIcon}><Feather name="link-2" size={22} color={colors.inkFaint} /></View>
          <Txt variant="h2" center style={{ marginTop: space.md }}>This link is off</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Whoever shared it has turned it off, or it was never a link to a collection.
          </Txt>
        </View>
      </Screen>
    );
  }

  const first = data.entries.find((e) => e.imageUrl);

  return (
    <Screen back>
      {/* The binder, as a hand of the best of it. */}
      <View style={s.hero}>
        <View style={s.fan}>
          {data.entries.filter((e) => e.imageUrl).slice(0, 3).reverse().map((e, i, all) => (
            <View
              key={e.entryId}
              style={[s.fanCard, {
                transform: [{ rotate: `${(i - (all.length - 1) / 2) * 9}deg` }],
                marginLeft: i === 0 ? 0 : -34,
                zIndex: i,
              }]}
            >
              <CardArt uri={e.imageUrl} iconSize={16} />
            </View>
          ))}
          {!first && (
            <View style={s.fanCard}><Feather name="image" size={18} color={colors.inkFaint} /></View>
          )}
        </View>
        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
          {data.owner}&rsquo;s collection
        </Txt>
        <Txt style={s.value} numberOfLines={1} adjustsFontSizeToFit>
          {data.priced > 0 ? money(data.value, { fx, from: "USD" }) : "—"}
        </Txt>
        <Txt variant="bodySmall" color={colors.inkMuted}>
          {data.cards} card{data.cards === 1 ? "" : "s"}
          {data.priced < data.cards
            ? ` · ${data.priced} priced, ${data.cards - data.priced} we can’t value yet`
            : ""}
        </Txt>
      </View>

      {!session && (
        <Pressable onPress={() => router.push("/signup")} style={({ pressed }) => [s.join, pressed && { opacity: 0.9 }]}>
          <Txt variant="button" color={colors.dark}>Start your own collection</Txt>
          <Feather name="arrow-right" size={16} color={colors.dark} />
        </Pressable>
      )}

      <View style={{ gap: 4, marginTop: space.xl }}>
        {data.entries.map((e) => <Row key={e.entryId} entry={e} onPress={() =>
          e.catalogId && router.push(`/card/${encodeURIComponent(e.catalogId)}` as never)} />)}
      </View>

      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Shared by {data.owner}. What they paid is not shared.
      </Txt>
    </Screen>
  );
}

function Row({ entry: e, onPress }: { entry: SharedEntry; onPress: () => void }) {
  const fx = useFx();
  return (
    <Pressable
      onPress={onPress}
      disabled={!e.catalogId}
      style={({ pressed }) => [s.row, pressed && e.catalogId && { opacity: 0.72 }]}
    >
      <View style={s.art}><CardArt uri={e.imageUrl} iconSize={14} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt variant="h3" numberOfLines={1}>{e.cardName}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
          {[e.setName, e.cardNumber && `#${e.cardNumber}`, e.quantity > 1 && `×${e.quantity}`]
            .filter(Boolean).join(" · ")}
        </Txt>
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          <GraderBadge grader={e.grader ?? "RAW"} grade={e.grade} />
        </View>
      </View>
      <Txt style={[s.price, e.value == null && { color: colors.inkFaint, ...type.bodySmall }]}>
        {e.value != null ? money(e.value * (e.quantity || 1), { fx, from: "USD" }) : "no price yet"}
      </Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: "center", marginTop: space.lg },
  fan: { flexDirection: "row", alignItems: "center", height: 132 },
  fanCard: {
    width: 88, height: 122, borderRadius: 10, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface, ...shadow.lifted,
  },
  value: { ...type.display, fontSize: 40, lineHeight: 46, letterSpacing: -1.2, marginTop: 2 },
  join: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 52, marginTop: space.xl, borderRadius: radius.md, backgroundColor: colors.accent,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.sm, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  art: { width: 44, height: 61, borderRadius: 6, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  price: { ...type.button, color: colors.ink, fontVariant: ["tabular-nums"] },
  gone: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.xl },
  goneIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.field,
  },
});
