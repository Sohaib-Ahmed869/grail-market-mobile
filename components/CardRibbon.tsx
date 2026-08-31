import { useEffect } from "react";
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { colors, radius } from "../theme";

/** Nine, and this time they all fit.
 *
 *  Nine used to span 612pt — a phone is 390 wide, so the outermost pair sat
 *  entirely off screen doing decode, layout and transform work every frame
 *  that nobody could see. That was a symptom of the old geometry, not of the
 *  count: the band was too loose. Pinched properly it reaches 250pt, so the
 *  outermost card's centre lands at 190 — just inside the 195pt half-screen —
 *  and every card contributes something visible while the band still runs off
 *  both edges the way it should. */
const ART = [
  require("../assets/cards/giratina-tg.jpg"),
  require("../assets/cards/blastoise-base.jpg"),
  require("../assets/cards/rayquaza-gg.jpg"),
  require("../assets/cards/charizard-base.jpg"),
  require("../assets/cards/umbreon-vmax.jpg"),   // centre
  require("../assets/cards/charizard-151.jpg"),
  require("../assets/cards/sylveon-vmax.jpg"),
  require("../assets/cards/venusaur-base.jpg"),
  require("../assets/cards/charizard-pf.jpg"),
];

const W = 116;
const H = Math.round(W * 495 / 360);
const K = (ART.length - 1) / 2;
/* Tighter than it was. Nine cards through a hard pinch need to sit closer
   together or the band sprawls off screen; overlapping is also what gives the
   centre its density rather than a hole with one sliver in it. */
const OVERLAP = 0.74;

/* THE DEPTH LIVES IN THIS PAIR OF CURVES.
 *
 *  They used to run 74deg->22deg and 0.78->1.06. The turn was right; the scale
 *  was the problem. A 1.36x spread between the middle card and the outer one
 *  is not enough foreshortening to read as distance, so the band came out as
 *  two big flat cards with a smear between them instead of a corridor
 *  receding to a vanishing point.
 *
 *  0.44->1.08 is a 2.5x spread. The middle card now projects 16pt wide against
 *  the outermost at 119pt, which is what makes the centre read as far away
 *  rather than merely narrow. */
const turnAt = (d: number) => 72 - d * (72 - 18);
const scaleAt = (d: number) => 0.44 + d * (1.08 - 0.44);

/* How far the camera sits from the card. Closer than the old 620, which
   deepens the foreshortening across the same turn. */
const PERSPECTIVE = 520;

/* What a card is scaled to before the band opens, as a FRACTION of where it
   ends up — not a fixed number. It was a flat 0.6, which was smaller than
   every card's open scale back when the smallest was 0.78. Now the middle
   card opens at 0.44, so a fixed 0.6 would make it shrink into place while
   its neighbours grow. Everything grows. */
const SHUT_SCALE = 0.66;

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
  style, height = Math.round(H * 1.08) + 12,
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
        { perspective: PERSPECTIVE },
        { translateX: t * xOpen },
        { rotateY: `${turnShut + (turnOpen - turnShut) * t}deg` },
        { scale: scaleOpen * SHUT_SCALE + (scaleOpen - scaleOpen * SHUT_SCALE) * t },
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
