import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "../../components/PageWash";
import { JoinGate } from "../../components/JoinGate";
import { useGuest } from "../../lib/guest";
import { Txt } from "../../components/Text";
import { Avatar } from "../../components/Avatar";
import { VerifiedShield } from "../../components/VerifiedBadge";
import { useTier, TIER_NAMES } from "../../lib/tiers";
import { useSession } from "../../lib/session";
import { signOut } from "../../lib/auth";
import { useIdentity } from "../../lib/useIdentity";
import { fetchSubscription } from "../../lib/billing";
import { useNavScroll } from "../../lib/navbar";
import { useTabBarClearance } from "../../components/TabBar";
import { colors, radius, space } from "../../theme";

type Row = {
  icon: keyof typeof Feather.glyphMap; label: string; hint?: string; to: string;
  /** Query for the destination. A "?" inside `to` is a path segment as far as
   *  the router is concerned, so it belongs here instead. */
  params?: Record<string, string>;
};


/* Four tiles instead of four rows.
 *
 * These are the things opened daily, and as full-width rows with a sentence
 * each they took a third of the screen to say four words. A tile is one word
 * and a tap target, and the row underneath it goes to the things opened
 * monthly. */
const QUICK: { icon: keyof typeof Feather.glyphMap; label: string; to: string }[] = [
  { icon: "message-circle", label: "Messages", to: "/messages" },
  { icon: "eye", label: "Watchlist", to: "/watchlist" },
  { icon: "tag", label: "Listings", to: "/mylistings" },
  { icon: "inbox", label: "Offers", to: "/offers" },
];

/* The rest, grouped by errand and WITHOUT hints.
 *
 * Every row carried a line of explanation, which doubled its height and made
 * fourteen rows read as twenty-eight. A label that needs a sentence is the
 * wrong label; these are all one word or two. */
const SELLING: Row[] = [
  { icon: "message-square", label: "Community", to: "/community" },
  { icon: "star", label: "Rate a deal", to: "/rate" },
];

const HELP: Row[] = [
  { icon: "life-buoy", label: "Get help", to: "/support" },
  { icon: "flag", label: "Report something", to: "/support/new", params: { kind: "report" } },
  { icon: "alert-triangle", label: "Disputes", to: "/disputes" },
];

const ACCOUNT: Row[] = [
  { icon: "bell", label: "Notifications", to: "/alerts" },
  { icon: "shield", label: "Identity verification", to: "/idcheck" },
  { icon: "credit-card", label: "Plan", to: "/plans" },
  { icon: "settings", label: "Account settings", to: "/account" },
];

/** Profile.
 *
 *  Two things are stated at the top rather than buried: whether the ID check
 *  has passed, and which plan is running. Both change what the rest of the app
 *  will let you do, so hiding them behind a tap is how a member ends up at the
 *  end of the sell flow being told they cannot list. */
export default function Profile() {
  const navScroll = useNavScroll();
  const clearance = useTabBarClearance();
  // Browsing is open to anyone; this is not. See JoinGate for why the
  // line is drawn here rather than at the front door.
  const guest = useGuest();
  const router = useRouter();
  const session = useSession();
  const { verified, reviewing, known } = useIdentity(session?.userId ?? "");
  const [plan, setPlan] = useState<string | null>(null);
  const { tier, refresh: refreshTier } = useTier();

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (session?.userId) {
      fetchSubscription(session.userId).then((sub) => {
        if (alive) setPlan(sub.status === "active" || sub.status === "trialing" ? sub.plan_id : null);
      });
    }
    return () => { alive = false; };
  }, [session?.userId]));

  const out = () =>
    Alert.alert("Sign out?", "You'll need your password to get back in.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Sign out", style: "destructive",
        onPress: async () => { await signOut(); router.replace("/welcome"); },
      },
    ]);


  if (guest) {
    return (
      <JoinGate
        title="You're Missing This"
        why="Browsing and search stay open as a guest. Everything that happens between people needs an account."
        preview={[
          { icon: "offer", tone: colors.ink, title: "Offer received",
            body: "A$420 for your Charizard", when: "now" },
          { icon: "messages", tone: colors.info, title: "Marcus replied",
            body: "Still available? Happy to collect.", when: "2m" },
          { icon: "verified", tone: colors.up, title: "You're verified",
            body: "You can list cards now.", when: "1h" },
        ]}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false} {...navScroll}>
        <View style={s.who}>
          <Pressable onPress={() => router.push("/avatar")}>
            <Avatar name={session?.name ?? "?"} id={session?.avatar} size={64} />
            <View style={s.editFace}>
              <Feather name="edit-2" size={10} color={colors.onPrimary} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt variant="h1" numberOfLines={1}>{session?.name ?? "Not signed in"}</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
              {session?.email ?? ""}
            </Txt>
          </View>
        </View>

        <View style={s.status}>
          <Pressable
            style={[s.statusCell, { borderRightWidth: 1, borderRightColor: colors.line }]}
            onPress={() => router.push(verified ? "/ladder" : "/idcheck")}
          >
            {verified ? (
              <VerifiedShield size={22} />
            ) : (
              <Feather
                name={reviewing ? "clock" : "alert-circle"}
                size={16}
                color={reviewing ? colors.info : colors.accent}
              />
            )}
            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: 6 }}>Level</Txt>
            <Txt variant="h3">
              {tier ? `${tier.tier} · ${TIER_NAMES[tier.tier]}` : !known ? "…" : "0 · Browsing"}
            </Txt>
          </Pressable>
          <Pressable style={s.statusCell} onPress={() => router.push("/plans")}>
            <Feather name="credit-card" size={16} color={plan ? colors.accent : colors.inkFaint} />
            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: 6 }}>Plan</Txt>
            <Txt variant="h3" style={{ textTransform: "capitalize" }}>{plan ?? "None"}</Txt>
          </Pressable>
        </View>

        {/* The four things opened daily, as tiles. The whole ladder used to
            live here — a screenful explaining the tier system on a page
            somebody opened to reach their messages. The Level tile above
            already goes there, so it is one tap away instead of always
            underfoot. */}
        <View style={s.quick}>
          {QUICK.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => router.push(q.to as any)}
              style={({ pressed }) => [s.tile, pressed && { backgroundColor: colors.surfaceSunk }]}
            >
              <Feather name={q.icon} size={19} color={colors.ink} />
              <Txt variant="bodySmall" style={{ marginTop: 6 }}>{q.label}</Txt>
            </Pressable>
          ))}
        </View>

        <Section title="Trading" rows={SELLING} onPress={(r) => router.push((r.params ? { pathname: r.to, params: r.params } : r.to) as never)} />
        <Section title="Help" rows={HELP} onPress={(r) => router.push((r.params ? { pathname: r.to, params: r.params } : r.to) as never)} />
        <Section title="Account" rows={ACCOUNT} onPress={(r) => router.push((r.params ? { pathname: r.to, params: r.params } : r.to) as never)} />

        {/* Legal was two full rows with chevrons, competing with the things
            people came here to do. It is a footnote, and it reads as one. */}
        <View style={s.legal}>
          <Pressable onPress={() => router.push("/legal/terms")}>
            <Txt variant="bodySmall" color={colors.inkFaint}>Terms of use</Txt>
          </Pressable>
          <Txt variant="bodySmall" color={colors.inkFaint}>·</Txt>
          <Pressable onPress={() => router.push("/legal/privacy")}>
            <Txt variant="bodySmall" color={colors.inkFaint}>Privacy</Txt>
          </Pressable>
        </View>

        <Pressable onPress={out} style={s.out}>
          <Feather name="log-out" size={15} color={colors.down} />
          <Txt variant="button" color={colors.down}>Sign out</Txt>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, rows, onPress }: { title: string; rows: Row[]; onPress: (r: Row) => void }) {
  return (
    <>
      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xxl }}>{title}</Txt>
      <View style={s.group}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => onPress(r)}
            style={({ pressed }) => [
              s.row,
              i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
              pressed && { backgroundColor: colors.surfaceSunk },
            ]}
          >
            <Feather name={r.icon} size={17} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{r.label}</Txt>
              {r.hint && <Txt variant="bodySmall" color={colors.inkFaint}>{r.hint}</Txt>}
            </View>
            <Feather name="chevron-right" size={17} color={colors.inkFaint} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  body: { paddingHorizontal: space.xl, paddingTop: space.sm },
  who: { flexDirection: "row", alignItems: "center", gap: space.lg },
  editFace: {
    position: "absolute", right: -2, bottom: -2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  status: {
    flexDirection: "row", marginTop: space.xl,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk, overflow: "hidden",
  },
  statusCell: { flex: 1, alignItems: "center", paddingVertical: space.lg },
  group: {
    marginTop: space.sm, borderRadius: radius.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  quick: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.xl,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  legal: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
    marginTop: space.xxl,
  },
  out: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 50, marginTop: space.xxl, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
  },
});
