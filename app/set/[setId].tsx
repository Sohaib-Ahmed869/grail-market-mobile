import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBack } from "../../lib/nav";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
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
        <Pressable onPress={goBack} hitSlop={12} style={s.back}>
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
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
        <Loader fill />
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
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.art} resizeMode="cover" />
              ) : (
                <View style={[s.art, s.artEmpty]}>
                  <Feather name="image" size={16} color={colors.inkFaint} />
                </View>
              )}
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
  back: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  logo: { width: 64, height: 34 },
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.md },
  tile: { flex: 1 },
  art: { width: "100%", aspectRatio: 0.72, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  artEmpty: { alignItems: "center", justifyContent: "center" },
});
