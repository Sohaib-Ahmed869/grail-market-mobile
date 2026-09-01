import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Mark } from "../../components/Brand";
import { Txt } from "../../components/Text";
import { useIdentity } from "../../lib/useIdentity";
import { useSession } from "../../lib/session";
import { colors, radius, space } from "../../theme";



/** Home.
 *
 *  One number, then three ways to act on it. The prototype put the collection
 *  value in a flat card and the actions below the fold; the value is the
 *  reason someone opens the app, so it gets the dark band at the top and the
 *  actions sit on the boundary where the eye already is.
 *
 *  The figure is live market value, not what was paid — that was asked for
 *  directly in the meeting, and it is the difference between a ledger and a
 *  reason to open the app twice a day. */
export default function Home() {
  const session = useSession();
  const userId = session?.userId ?? "";
  const router = useRouter();
  const { verified } = useIdentity(userId);

  return (
    <View style={s.root}>
      <LinearGradient colors={["#22303E", colors.dark]} style={s.hero}>
        <SafeAreaView edges={["top"]}>
          <View style={s.bar}>
            <View style={s.who}>
              <Mark size={26} onDark />
              <View>
                <Txt variant="h3" color={colors.onDark}>{session ? `Hello, ${session.name.split(" ")[0]}` : "Welcome"}</Txt>
                <Txt variant="bodySmall" color={colors.onDarkMuted}>
                  Sydney · {verified ? "Verified member" : "Not yet verified"}
                </Txt>
              </View>
            </View>
            <Pressable hitSlop={10} style={s.bell} accessibilityLabel="Notifications">
              <Feather name="bell" size={18} color={colors.onDark} />
              <View style={s.dot} />
            </Pressable>
          </View>

          <View style={s.valueBlock}>
            <Txt variant="overline" color={colors.onDarkMuted}>Collection · live market value</Txt>
            <Txt variant="price" color={colors.onDark} style={s.value}>A$5,782</Txt>
            <View style={s.deltaRow}>
              <Feather name="trending-up" size={13} color={colors.up} />
              <Txt variant="bodySmall" color={colors.up}>+A$997 all time</Txt>
              <Txt variant="bodySmall" color={colors.onDarkMuted}>· 5 cards · 1 watching</Txt>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* The three actions straddle the boundary, so they read as belonging to
          the number above rather than starting a new list below it. */}
      <View style={s.actions}>
        {[
          { icon: "maximize" as const, label: "Scan a card", to: "/(tabs)/scan" },
          { icon: "search" as const, label: "Search a code", to: "/(tabs)/search" },
          { icon: "tag" as const, label: "Sell a card", to: "/(tabs)/portfolio" },
        ].map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.to as any)}
            style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]}
          >
            <Feather name={a.icon} size={19} color={colors.ink} />
            <Txt variant="bodySmall" color={colors.ink} center>{a.label}</Txt>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHead}>
          <View>
            <Txt variant="h2">Market movers</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint}>
              Biggest 7 day moves on completed sales
            </Txt>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}>
          {MOVERS.map((m) => (
            <View key={m.name} style={s.mover}>
              <View style={[s.thumb, { backgroundColor: m.tint }]} />
              <Txt variant="h3" numberOfLines={1}>{m.name}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>{m.grade}</Txt>
              <View style={s.moverFoot}>
                <Txt variant="h3">{m.price}</Txt>
                <Txt variant="bodySmall" color={m.up ? colors.up : colors.down}>
                  {m.up ? "+" : ""}{m.move}
                </Txt>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// Placeholder until the movers endpoint exists. Shaped like the real thing so
// wiring it is a swap, not a rewrite.
const MOVERS = [
  { name: "Umbreon VMAX", grade: "PSA 10", price: "A$3,940", move: "3.4%", up: true, tint: "#3B3560" },
  { name: "Zoro Manga", grade: "Raw · ungraded", price: "A$1,860", move: "2.8%", up: true, tint: "#2F5540" },
  { name: "Charizard", grade: "PSA 9", price: "A$2,740", move: "1.1%", up: false, tint: "#7A3B22" },
];

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  hero: { paddingBottom: space.xxxl },
  bar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingTop: space.sm,
  },
  who: { flexDirection: "row", alignItems: "center", gap: space.md },
  bell: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dot: {
    position: "absolute", top: 9, right: 10, width: 7, height: 7,
    borderRadius: 4, backgroundColor: colors.accent,
  },
  valueBlock: { paddingHorizontal: space.xl, marginTop: space.xl },
  value: { marginTop: space.xs },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.xs },

  actions: {
    flexDirection: "row", gap: space.sm,
    marginTop: -space.xxl, marginHorizontal: space.xl,
  },
  action: {
    flex: 1, gap: 7, paddingVertical: space.lg,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  body: { paddingTop: space.xxl, paddingBottom: space.xxxl },
  sectionHead: { paddingHorizontal: space.xl, marginBottom: space.md },
  rail: { paddingLeft: space.xl },
  mover: {
    width: 150, marginRight: space.md, padding: space.md, gap: 3,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line,
  },
  thumb: { height: 96, borderRadius: radius.sm, marginBottom: space.sm },
  moverFoot: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 3 },
});
