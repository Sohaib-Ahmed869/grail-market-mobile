import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bloom } from "./Bloom";

/** The wash, from the reference mockups the user supplied on 2026-09-15.
 *
 *  Sampled, then lifted: the first pass matched the mockup's lightness within a
 *  few percent and still read as dull on the phone, because its hues were off
 *  where the eye looks — the teal sat low instead of high on the right, the
 *  top right stayed blue instead of sea-green, and the blush came out lilac
 *  rather than warm. These are the mockup's hues, placed where the mockup puts
 *  them, a step brighter. Exported so the tab bar's glass uses the same
 *  colours. */
export const WASH = {
  blue: "#ADBFD8",   // top left
  mist: "#C9D3DA",   // through the middle
  sea: "#C1D5D1",    // bottom right
  teal: "#A3D2CB",   // glow, upper right
  blush: "#E0CACB",  // glow, lower left
} as const;

/** The ground every screen stands on.
 *
 *  A diagonal from blue to sea glass, a teal glow high on the right and a
 *  warm blush low on the left. The glows sit mostly off screen so only their
 *  falloff shows — a visible hotspot reads as a smudge.
 *
 *  One component, used by `Screen` and by the tab screens that build their
 *  own frame, so there is a single definition of what the app's paper looks
 *  like rather than one per screen. */
export function PageWash() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: WASH.mist }]} pointerEvents="none">
      <LinearGradient
        colors={[WASH.blue, WASH.mist, WASH.sea]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.teal}>
        <Bloom size={600} color={WASH.teal} opacity={0.95} />
      </View>
      <View style={s.blush}>
        <Bloom size={660} color={WASH.blush} opacity={0.95} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  teal: { position: "absolute", right: -250, top: -40, width: 600, height: 600 },
  blush: { position: "absolute", left: -300, bottom: 20, width: 660, height: 660 },
});
