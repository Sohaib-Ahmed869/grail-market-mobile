import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BackButton } from "../../components/BackButton";
import { useBack } from "../../lib/nav";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { CardArt, Shimmer } from "../../components/CardArt";
import { setDetail, type SetDetail } from "../../lib/cardmarket";
import { colors, radius, space } from "../../theme";

/** One set, and every card printed in it.
 *
 *  The way to reach a card whose name you cannot type — a Japanese print, a
 *  promo with no readable English — is to recognise the set and look down the
 *  list until the picture matches what is in your hand. */
export default function SetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  const goBack = useBack("/(tabs)/search");
  const [set, setSet] = useState<SetDetail | null | undefined>(undefined);

  useEffect(() => { setDetail(String(setId)).then(setSet); }, [setId]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <View style={s.head}>
        <BackButton onPress={goBack} />
        {set && (
          <View style={{ flex: 1 }}>
            <Txt variant="h1" numberOfLines={1}>{set.name}</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted}>
              {set.cards.length} of {set.total} cards
              {set.releasedAt ? ` · ${set.releasedAt}` : ""}
            </Txt>
          </View>
        )}
        {set?.logo && <Image source={{ uri: set.logo }} style={s.logo} resizeMode="contain" />}
      </View>

      {set === undefined ? (
        <View style={s.skeletonGrid}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={s.skeletonTile}>
              <View style={s.art}><Shimmer /></View>
              <View style={s.skeletonLine} />
            </View>
          ))}
        </View>
      ) : set === null ? (
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.xxxl }}>
          That set couldn&rsquo;t be loaded.
        </Txt>
      ) : (
        <FlatList
          data={set.cards}
          keyExtractor={(c) => c.cardId}
          numColumns={3}
          columnWrapperStyle={{ gap: space.sm }}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/card/${encodeURIComponent(item.cardId)}` as any)}
              style={({ pressed }) => [s.tile, pressed && { opacity: 0.75 }]}
            >
              <View style={s.art}>
                <CardArt uri={item.imageUrl} iconSize={16} />
              </View>
              <Txt variant="bodySmall" numberOfLines={1} style={{ marginTop: 4 }}>{item.name}</Txt>
              <Txt variant="overline" color={colors.inkFaint}>#{item.localId}</Txt>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingBottom: space.md,
  },
  logo: { width: 64, height: 34 },
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.md },
  tile: { flex: 1 },
  art: {
    width: "100%", aspectRatio: 0.72, borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunk, overflow: "hidden",
  },
  skeletonGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: space.sm,
    paddingHorizontal: space.xl, paddingTop: space.sm,
  },
  skeletonTile: { width: "31%", gap: 6 },
  skeletonLine: { height: 11, borderRadius: 4, backgroundColor: colors.line, width: "80%" },
});
