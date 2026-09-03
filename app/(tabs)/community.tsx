import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { Txt } from "../../components/Text";
import { SkeletonList, SkeletonPost } from "../../components/Skeleton";
import { PostRow } from "../../components/PostRow";
import { communities, feed, joinCommunity, type Community, type Post } from "../../lib/community";
import { useSession } from "../../lib/session";
import { useNavScroll } from "../../lib/navbar";
import { colors, radius, space } from "../../theme";

const SORTS = [
  { id: "hot", label: "Hot", icon: "trending-up" as const },
  { id: "new", label: "New", icon: "clock" as const },
  { id: "top", label: "Top", icon: "award" as const },
];

/** The forum.
 *
 *  One screen for both the feed and the community it is filtered to, because
 *  they are the same list with a different where-clause, and splitting them
 *  into two screens means two scroll positions and two ways to be lost.
 */
export default function Community() {
  const navScroll = useNavScroll();
  const router = useRouter();
  const session = useSession();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === "string" ? params.slug : null;

  const [sort, setSort] = useState("hot");
  const [posts, setPosts] = useState<Post[] | undefined>(undefined);
  const [subs, setSubs] = useState<Community[]>([]);

  const load = useCallback(() => {
    let alive = true;
    setPosts(undefined);
    feed(slug, sort).then((p) => { if (alive) setPosts(p); });
    communities().then((c) => { if (alive) setSubs(c); });
    return () => { alive = false; };
  }, [slug, sort]);
  useFocusEffect(load);

  const here = subs.find((c) => c.slug === slug) ?? null;
  const needsAccount = () => router.push("/signup");

  const toggleJoin = async () => {
    if (!session) return needsAccount();
    if (!here) return;
    await joinCommunity(here.slug, here.joined);
    communities().then(setSubs);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />

      <View style={s.head}>
        <View style={s.headRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="display" numberOfLines={1}>{here ? here.name : "Community"}</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
              {here
                ? `${here.members} member${here.members === 1 ? "" : "s"} · ${here.posts} post${here.posts === 1 ? "" : "s"}`
                : "Ask, show, argue about prices"}
            </Txt>
          </View>
          {here && (
            <Pressable onPress={toggleJoin} style={[s.join, here.joined && s.joined]}>
              <Txt variant="button" color={here.joined ? colors.ink : colors.onPrimary}>
                {here.joined ? "Joined" : "Join"}
              </Txt>
            </Pressable>
          )}
        </View>

        {/* The communities. Horizontal because there are five, and a vertical
            list of five would push the posts off the screen. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}>
          <Chip label="All" on={!slug} onPress={() => router.setParams({ slug: undefined })} />
          {subs.map((c) => (
            <Chip
              key={c.slug}
              label={c.name}
              accent={c.accent}
              on={slug === c.slug}
              onPress={() => router.setParams({ slug: c.slug })}
            />
          ))}
          <Pressable
            onPress={() => (session ? router.push("/community/make") : needsAccount())}
            style={s.makeChip}
          >
            <Feather name="plus" size={14} color={colors.ink} />
            <Txt variant="bodySmall" color={colors.ink}>New Community</Txt>
          </Pressable>
        </ScrollView>

        <View style={s.sorts}>
          {SORTS.map((x) => (
            <Pressable key={x.id} onPress={() => setSort(x.id)} style={[s.sort, sort === x.id && s.sortOn]}>
              <Feather name={x.icon} size={13} color={sort === x.id ? colors.ink : colors.inkFaint} />
              <Txt variant="bodySmall" color={sort === x.id ? colors.ink : colors.inkFaint}>{x.label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        {...navScroll}
        data={posts ?? []}
        keyExtractor={(p) => p.post_id}
        contentContainerStyle={s.list}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={
          posts === undefined ? (
            <SkeletonList count={5}>{() => <SkeletonPost />}</SkeletonList>
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Feather name="message-square" size={20} color={colors.inkFaint} />
              </View>
              <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Posted Yet</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
                {here
                  ? `Be the first in ${here.name}. A pull, a grade you disagree with, a price that looks wrong.`
                  : "Pick a community and start it off — or make one of your own."}
              </Txt>
              {!here && (
                <Pressable
                  onPress={() => (session ? router.push("/community/make") : needsAccount())}
                  style={s.emptyBtn}
                >
                  <Feather name="plus" size={15} color={colors.ink} />
                  <Txt variant="button">New Community</Txt>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => <PostRow post={item} onNeedsAccount={needsAccount} />}
      />

      <Pressable
        onPress={() => (session
          ? router.push({ pathname: "/community/new", params: slug ? { slug } : {} })
          : needsAccount())}
        style={s.fab}
      >
        <Feather name="edit-3" size={19} color={colors.onPrimary} />
        <Txt variant="button" color={colors.onPrimary}>Post</Txt>
      </Pressable>
    </SafeAreaView>
  );
}

function Chip({
  label, on, onPress, accent,
}: { label: string; on: boolean; onPress: () => void; accent?: string | null }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      {accent && <View style={[s.chipDot, { backgroundColor: accent }]} />}
      <Txt variant="bodySmall" color={on ? colors.onPrimary : colors.inkMuted}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  join: {
    paddingHorizontal: space.lg, height: 36, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.ink,
  },
  joined: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  rail: { marginHorizontal: -space.xl, paddingHorizontal: space.xl, marginTop: space.lg },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.md, paddingVertical: 8, marginRight: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  sorts: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  sort: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  sortOn: { backgroundColor: colors.surfaceSunk },
  list: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 150, gap: space.md },
  empty: { alignItems: "center", marginTop: space.xxl },
  makeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: space.md, paddingVertical: 8, marginRight: 6,
    borderRadius: radius.pill, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: colors.lineStrong, backgroundColor: "transparent",
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: space.lg, paddingHorizontal: space.lg, height: 42,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong,
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
  fab: {
    position: "absolute", right: space.xl, bottom: 108,
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.lg, height: 50, borderRadius: radius.pill,
    backgroundColor: colors.ink,
    shadowColor: "#0B1622", shadowOpacity: 0.25, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
});
