import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

type Kind = "primary" | "secondary" | "ghost" | "accent" | "ghostLight";

export function Button({
  label, onPress, kind = "primary", disabled, loading, icon, style, full = true,
}: {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const off = disabled || loading;
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
        pressed && !off && s.pressed,
        off && s.off,
        style,
      ]}
    >
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
              : colors.ink
            }
            style={icon ? { marginLeft: space.sm } : undefined}
          >
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl,
  },
  row: { flexDirection: "row", alignItems: "center" },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  ghost: { backgroundColor: "transparent" },
  // gold is the loudest thing on the page, so it carries navy text: white on
  // gold falls under 3:1 and stops being readable in sunlight
  accent: { backgroundColor: colors.accent },
  pressed: { opacity: 0.86, transform: [{ scale: 0.994 }] },
  off: { opacity: 0.45 },
});
