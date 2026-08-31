import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme";

/** The app icon, rounded the way the platform rounds it.
 *
 *  The source art is a square with its own navy ground, so the corner radius
 *  is applied here rather than baked in — the same file then serves as the
 *  store icon, where a baked radius would be rejected. */
export function BrandMark({ size = 132, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        s.frame,
        { width: size, height: size, borderRadius: size * 0.235 },
        style,
      ]}
    >
      <Image
        source={require("../assets/brand/app-icon.png")}
        style={{ width: size, height: size }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.background,
    // a slab has weight; the icon should sit on the screen, not in it
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
});
