import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radius } from "../theme";

/** A frosted panel.
 *
 *  Real blur on iOS and Android; on web `expo-blur` leans on backdrop-filter,
 *  which is uneven across browsers, so the fallback is a translucent fill and
 *  a bright top edge. The point is a pane of glass catching light, and a tint
 *  plus a rim reads as that even where the blur does not land. */
export function GlassCard({
  size, children, style,
}: { size: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const shape = { width: size, height: size, borderRadius: size * 0.28 };
  return (
    <View style={[s.wrap, shape, style]}>
      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFill, s.webGlass]} />
      ) : (
        <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, s.tint]} />
      <View style={[s.rim, shape]} pointerEvents="none" />
      <View style={s.inner}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 }, elevation: 14,
  },
  webGlass: { backgroundColor: "rgba(255,255,255,0.07)" },
  tint: { backgroundColor: "rgba(255,255,255,0.06)" },
  // a hairline that is brighter at the top edge, the way glass catches light
  rim: {
    position: "absolute", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderTopColor: "rgba(255,255,255,0.30)",
  },
  inner: { alignItems: "center", justifyContent: "center" },
});
