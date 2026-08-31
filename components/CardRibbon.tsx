import { useEffect } from "react";
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { colors, radius } from "../theme";

/** Seven, not nine.
 *
 *  Nine spanned 612pt. A phone is 390 wide, so the outermost pair sat entirely
 *  off screen — two cards of decode, layout and transform work per frame that
 *  nobody could see. Seven reaches 243 from the centre, which still runs past
 *  the edge and still reads as a band that keeps going. */
const ART = [
  require("../assets/cards/blastoise-base.jpg"),
  require("../assets/cards/rayquaza-gg.jpg"),
  require("../assets/cards/charizard-base.jpg"),
  require("../assets/cards/umbreon-vmax.jpg"),   // centre
  require("../assets/cards/charizard-151.jpg"),
  require("../assets/cards/sylveon-vmax.jpg"),
  require("../assets/cards/venusaur-base.jpg"),
];

const W = 116;
const H = Math.round(W * 495 / 360);
const K = (ART.length - 1) / 2;
const OVERLAP = 0.88;

const turnAt = (d: number) => 74 - d * (74 - 22);
const scaleAt = (d: number) => 0.78 + d * (1.06 - 0.78);

/** Positions accumulate from each card's PROJECTED width — what it actually
 *  occupies once turned and scaled. Even spacing leaves holes beside the
 *  middle cards, because one turned 74 degrees covers a quarter of the width
 *  of one turned 22. */
const LAYOUT = (() => {
  const proj = (d: number) => W * Math.cos((turnAt(d) * Math.PI) / 180) * scaleAt(d);
  const xs: number[] = [0];
  for (let n = 1; n <= K; n++) {
    xs[n] = xs[n - 1] + ((proj((n - 1) / K) + proj(n / K)) / 2) * OVERLAP;
  }
  return xs;
})();

export function CardRibbon({
  style, height = H + 12,
}: { style?: StyleProp<ViewStyle>; height?: number }) {
  const open = useSharedValue(0);

  useEffect(() => {
    // Shorter and less loitering than before. The old curve spent 1250ms with
    // a very long tail, which reads as sluggish rather than smooth — most of
    // it was spent crawling the last few pixels.
    open.value = withTiming(1, { duration: 780, easing: Easing.bezier(0.2, 0.85, 0.25, 1) });
  }, [open]);

  return (
    <View style={[s.wrap, { height }, style]} pointerEvents="none">
      {ART.map((src, i) => (
        <Slab key={i} src={src} i={i - K} open={open} />
      ))}
    </View>
  );
}

function Slab({ src, i, open }: { src: number; i: number; open: SharedValue<number> }) {
  // Plain numbers, worked out on the JS thread. The callback below is a
  // worklet: a module-scope helper is not one, and calling it from there
  // crashes on mount.
  const d = Math.abs(i) / K;
  const dir = i < 0 ? 1 : -1;
  const turnOpen = turnAt(d) * dir;
  const turnShut = dir * 88;
  const scaleOpen = scaleAt(d);
  const xOpen = Math.sign(i) * LAYOUT[Math.abs(i)];
  // the middle leaves first and the outer cards follow, so the band unfolds
  // instead of every card sliding in lockstep
  const lead = d * 0.26;

  const style = useAnimatedStyle(() => {
    const t = interpolate(open.value, [lead, 1], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 620 },
        { translateX: t * xOpen },
        { rotateY: `${turnShut + (turnOpen - turnShut) * t}deg` },
        { scale: 0.6 + (scaleOpen - 0.6) * t },
      ],
      opacity: interpolate(t, [0, 0.2, 1], [0, 1, 1]),
    };
  });

  return (
    <Animated.View
      style={[
        s.slab,
        // Depth never changes, so it is set once here rather than returned
        // from the worklet. A zIndex coming out of an animated style forces
        // the view hierarchy to be re-ordered on the main thread every frame,
        // which is most of why this stuttered.
        { zIndex: Math.round(10 + d * 10) },
        style,
      ]}
    >
      <View style={s.frame}>
        <Image source={src} style={s.art} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", justifyContent: "center" },
  slab: { position: "absolute", width: W, height: H },
  // No shadow on these. Seven soft shadows, each on a view being rotated and
  // scaled, is an offscreen pass per card per frame on iOS and the single
  // biggest cost in the whole screen. The white sleeve edge already separates
  // one card from the next, which is all the shadow was really doing.
  frame: {
    flex: 1, borderRadius: radius.sm, padding: 3,
    backgroundColor: colors.surface, overflow: "hidden",
    ...Platform.select({ android: { elevation: 0 } }),
  },
  art: { width: "100%", height: "100%", borderRadius: 5 },
});
