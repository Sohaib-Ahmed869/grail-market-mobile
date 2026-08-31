import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import MarkSvg from "../assets/brand/mark.svg";
import LockupDark from "../assets/brand/wordmark-dark.svg";
import LockupLight from "../assets/brand/wordmark.svg";
import { colors, radius, shadow } from "../theme";

/** The G on its own, as vector. */
export function Mark({ size = 40 }: { size?: number }) {
  return <MarkSvg width={size} height={size} />;
}

/** Mark + "GrailMarket". `onDark` picks the variant drawn for a dark ground. */
export function Lockup({ width = 190, onDark = false }: { width?: number; onDark?: boolean }) {
  const Svg = onDark ? LockupDark : LockupLight;
  // the horizontal artboard is 690x180
  return <Svg width={width} height={(width * 180) / 690} />;
}

/** The store icon, rounded the way the platform rounds it. The source is a
 *  full-bleed square — a baked radius would be rejected at submission — so the
 *  corner is applied here. */
export function AppIcon({ size = 116, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        s.icon,
        shadow.lifted,
        { width: size, height: size, borderRadius: size * 0.2237 },
        style,
      ]}
    >
      <Image
        source={require("../assets/brand/app-icon.png")}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const s = StyleSheet.create({
  icon: { overflow: "hidden", backgroundColor: colors.dark },
});
