import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Icon } from "./Icon";
import { Txt } from "./Text";
import { colors, radius, shadow, space, type } from "../theme";

/** The two things you can do with a card, in one row.
 *
 *  Follow is a compact pill that fills gold and changes its word once you
 *  have; Sell is the wide one, lit navy-to-gold like every primary action in
 *  the app, with its icon in a small circle the way the actions under the
 *  collection card carry theirs. Two full-width buttons stacked on top of each
 *  other gave both the same weight, and they do not have the same weight:
 *  one of them is a bookmark and the other is a sale.
 */
export function CardActions({
  followed, following, onFollow, onSell, selling,
}: {
  followed: boolean;
  following: boolean;
  onFollow: () => void;
  onSell: () => void;
  selling?: boolean;
}) {
  return (
    <View style={s.row}>
      <Pressable
        onPress={onFollow}
        disabled={followed || following}
        accessibilityRole="button"
        accessibilityState={{ selected: followed, busy: following }}
        style={({ pressed }) => [
          s.follow,
          followed && s.followOn,
          pressed && !followed && s.pressed,
        ]}
      >
        <View style={[s.iconRing, followed && s.iconRingOn]}>
          {following ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Icon name="follow" size={17} filled={followed} color={followed ? colors.accent : colors.ink} />
          )}
        </View>
        <View style={{ minWidth: 0 }}>
          <Txt variant="button" color={followed ? colors.accent : colors.ink} numberOfLines={1}>
            {followed ? "Following" : "Follow"}
          </Txt>
          {/* The alert is the point of following, and the one line that
              says so is worth its 12pt. */}
          <Txt style={s.sub} color={followed ? colors.accent : colors.inkFaint} numberOfLines={1}>
            {followed ? "10% either way" : "Alert on ±10%"}
          </Txt>
        </View>
      </Pressable>

      <Pressable
        onPress={onSell}
        disabled={selling}
        accessibilityRole="button"
        style={({ pressed }) => [s.sell, pressed && s.pressed]}
      >
        <LinearGradient
          colors={["#1A2632", "#22344A", colors.accent]}
          locations={[0, 0.64, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.sellIcon}>
          <Feather name="tag" size={16} color={colors.onPrimary} />
        </View>
        <Txt variant="button" color={colors.onPrimary} numberOfLines={1} style={{ flex: 1 }}>
          Sell one of these
        </Txt>
        <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  follow: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 58, paddingLeft: 6, paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.lineStrong,
    flexShrink: 0,
  },
  followOn: { backgroundColor: colors.accentWash, borderColor: colors.accent },
  iconRing: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
  iconRingOn: { backgroundColor: colors.surface },
  sub: { ...type.overline, fontSize: 11, lineHeight: 13, marginTop: 1 },

  sell: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 58, paddingLeft: 6, paddingRight: space.lg,
    borderRadius: radius.pill, overflow: "hidden",
    backgroundColor: colors.ink,
    ...shadow.card,
  },
  sellIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
