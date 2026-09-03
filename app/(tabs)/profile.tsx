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
import { TierLadder } from "../../components/TierGate";
import { useTier, TIER_NAMES } from "../../lib/tiers";
import { useSession } from "../../lib/session";
import { signOut } from "../../lib/auth";
import { useIdentity } from "../../lib/useIdentity";
import { fetchSubscription } from "../../lib/billing";
import { colors, radius, space } from "../../theme";

type Row = {
  icon: keyof typeof Feather.glyphMap; label: string; hint?: string; to: string;
};

const TALKING: Row[] = [
  { icon: "message-circle", label: "Messages", hint: "Buyers and sellers, about a card", to: "/messages" },
];

const COMMUNITY: Row[] = [
  { icon: "message-square", label: "Community", hint: "Pulls, grades, prices and arguments", to: "/community" },
];

const COLLECTING: Row[] = [
  { icon: "eye", label: "Watchlist", hint: "Cards you follow, and when to be told", to: "/watchlist" },
];

const SELLING: Row[] = [
  { icon: "tag", label: "My listings", hint: "Live, in review and sold", to: "/mylistings" },
  { icon: "inbox", label: "My offers", hint: "What you've offered on other cards", to: "/offers" },
  { icon: "star", label: "Rate a deal", hint: "Both sides rate once it's changed hands", to: "/rate" },
];

const ACCOUNT: Row[] = [
  { icon: "smile", label: "Your face", hint: "Pick one of the built-in avatars", to: "/avatar" },
  { icon: "credit-card", label: "Plan", to: "/plans" },
  { icon: "shield", label: "Identity verification", to: "/idcheck" },
];

/** Profile.
 *
 *  Two things are stated at the top rather than buried: whether the ID check
 *  has passed, and which plan is running. Both change what the rest of the app
 *  will let you do, so hiding them behind a tap is how a member ends up at the
 *  end of the sell flow being told they cannot list. */
export default function Profile() {
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
        icon={"user"}
        title="No account yet"
        why="You are looking around as a guest. Browsing and search stay open either way."
        points={[
          "ID-checked members only, so you know who you are dealing with",
          "Sell your own cards once you are verified",
          "Offers, messages and your listing history in one place",
        ]}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
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

        <Txt variant="h2" style={{ marginTop: space.xxl }}>What You Can Do</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
          Each level opens the next thing. Friction lands where the risk is.
        </Txt>
        <TierLadder tier={tier} />

        <Section title="Messages" rows={TALKING} onPress={(r) => router.push(r.to as any)} />
        <Section title="Collecting" rows={COLLECTING} onPress={(r) => router.push(r.to as any)} />
        <Section title="Community" rows={COMMUNITY} onPress={(r) => router.push(r.to as any)} />
        <Section title="Selling" rows={SELLING} onPress={(r) => router.push(r.to as any)} />
        <Section title="Account" rows={ACCOUNT} onPress={(r) => router.push(r.to as any)} />

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
  body: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: 130 },
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
  out: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 50, marginTop: space.xxl, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
  },
});
