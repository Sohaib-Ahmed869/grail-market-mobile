import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

// The brand is navy AND gold, so the primary carries both — running diagonally
// from a lit navy through the base navy into a warm bronze at the far corner.
//
// It stops at bronze rather than reaching the actual gold. White on #A88D60 is
// about 2.6:1, which is unreadable; #6B5A3E is 5.3:1 and still plainly on its
// way to gold. The corner is where the warmth belongs anyway — a gradient that
// crosses the middle of a button puts the seam right under the label.
const NAVY_GOLD = ["#2C3E52", colors.ink, "#6B5A3E"] as const;
// Navy holds to nearly two thirds so the label sits entirely on it and the
// warmth is a corner flourish. At the midpoint the two met right under the
// text, which put a muddy olive behind the middle of the word.
const NAVY_GOLD_STOPS = [0, 0.64, 1] as const;
const GOLD_LIT = ["#D8BE8E", colors.accent, "#8E7245"] as const;
const GOLD_STOPS = [0, 0.5, 1] as const;

type Kind = "primary" | "secondary" | "ghost" | "accent" | "ghostLight" | "link";

export function Button({
  label, onPress, kind = "primary", disabled, loading, icon, style, full = true, pill,
}: {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
  /** Taller, for a screen that is one decision. The corner is already fully
   *  round everywhere — this only changes the height. */
  pill?: boolean;
}) {
  const off = disabled || loading;
  // Filled buttons are lit rather than flat. The gradient is inside, under
  // the label, so it clips to the same pill without the parent needing
  // overflow:hidden — which would also clip the shadow that lifts it.
  const grad = kind === "primary" ? NAVY_GOLD : kind === "accent" ? GOLD_LIT : null;
  const stops = kind === "primary" ? NAVY_GOLD_STOPS : GOLD_STOPS;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      disabled={off}
      onPress={onPress}
      // 52pt: comfortably past the 44pt minimum, and the height the whole
      // app uses so stacked actions line up
      style={({ pressed }) => [
        s.base,
        full && { alignSelf: "stretch" },
        kind === "primary" && s.primary,
        kind === "secondary" && s.secondary,
        kind === "ghost" && s.ghost,
        kind === "accent" && s.accent,
        kind === "ghostLight" && s.ghost,
        kind === "link" && s.link,
        pill && s.pill,
        pressed && !off && (kind === "link" ? s.linkPressed : s.pressed),
        off && s.off,
        style,
      ]}
    >
      {grad && !off && (
        <LinearGradient
          colors={grad}
          locations={stops}
          // Diagonal. Straight down would band the button in horizontal
          // stripes; corner to corner reads as light falling across it.
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, s.grad]}
        />
      )}
      {loading ? (
        <ActivityIndicator color={kind === "primary" ? colors.onPrimary : colors.ink} />
      ) : (
        <View style={s.row}>
          {icon}
          <Txt
            variant="button"
            color={
              kind === "primary" ? colors.onPrimary
              : kind === "accent" ? colors.onAccent
              : kind === "ghostLight" ? colors.onDark
              : kind === "link" ? colors.inkMuted
              : colors.ink
            }
            style={[
              icon ? { marginLeft: space.sm } : undefined,
              // Underlined, because a centred line of text with no box around
              // it is not obviously pressable — and a second bordered button
              // under the first gives two choices equal weight when one of
              // them is plainly the answer.
              kind === "link" && s.linkTxt,
            ]}
          >
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Fully round, everywhere. Two corner treatments across one app is a choice
  // the eye reads as an inconsistency rather than as a hierarchy — the weight
  // of a button is carried by its fill, not by its radius.
  base: {
    height: 52, borderRadius: radius.pill, overflow: "hidden",
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl,
  },
  grad: { borderRadius: radius.pill },
  row: { flexDirection: "row", alignItems: "center" },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  ghost: { backgroundColor: "transparent" },
  link: { backgroundColor: "transparent", height: 44, overflow: "visible" },
  linkTxt: { textDecorationLine: "underline" },
  linkPressed: { opacity: 0.55 },
  pill: { height: 58 },
  // gold is the loudest thing on the page, so it carries navy text: white on
  // gold falls under 3:1 and stops being readable in sunlight
  accent: { backgroundColor: colors.accent },
  pressed: { opacity: 0.86, transform: [{ scale: 0.994 }] },
  off: { opacity: 0.45 },
});
