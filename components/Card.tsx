import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space } from "../theme";

/** A surface. Separated from the ground by a hairline rather than a shadow —
 *  a screen where every panel floats reads as noise. */
export function Card({
  children, style, tone = "plain", padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "plain" | "accent" | "sunk";
  padded?: boolean;
}) {
  return (
    <View
      style={[
        s.base,
        padded && { padding: space.lg },
        tone === "accent" && s.accent,
        tone === "sunk" && s.sunk,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  accent: { backgroundColor: colors.accentWash, borderColor: colors.accentLine },
  sunk: { backgroundColor: colors.surfaceSunk, borderColor: colors.line },
});
