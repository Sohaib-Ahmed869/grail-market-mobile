import { useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { colors, radius } from "../theme";

const ART = [
  require("../assets/cards/charizard-pf.jpg"),
  require("../assets/cards/blastoise-base.jpg"),
  require("../assets/cards/rayquaza-gg.jpg"),
  require("../assets/cards/charizard-base.jpg"),
  require("../assets/cards/umbreon-vmax.jpg"),   // centre
  require("../assets/cards/charizard-151.jpg"),
  require("../assets/cards/sylveon-vmax.jpg"),
  require("../assets/cards/venusaur-base.jpg"),
  require("../assets/cards/giratina-tg.jpg"),
];

const W = 116;                       // card width at full face
const H = Math.round(W * 495 / 360); // the art's own ratio
const K = (ART.length - 1) / 2;      // index of the middle card
const OVERLAP = 0.88;                // how much neighbours tuck behind each other

const turnAt = (d: number) => 74 - d * (74 - 22);   // degrees, edge-on at the centre
const scaleAt = (d: number) => 0.78 + d * (1.06 - 0.78);

/** Where each card sits once the ribbon is open.
 *
 *  Even spacing looks wrong here. A card turned 74 degrees away covers a
 *  quarter of the width of one turned 22, so a constant pitch leaves holes
 *  beside the middle cards and crushes the outer ones. Positions are therefore
 *  accumulated from each card's PROJECTED width — what it actually occupies
 *  once rotated and scaled — which is what keeps the band continuous. */
const LAYOUT = (() => {
  const proj = (d: number) => W * Math.cos((turnAt(d) * Math.PI) / 180) * scaleAt(d);
  const xs: number[] = [0];
  for (let n = 1; n <= K; n++) {
    const a = proj((n - 1) / K);
    const b = proj(n / K);
    xs[n] = xs[n - 1] + ((a + b) / 2) * OVERLAP;
  }
  return xs; // xs[|i|] is the distance from the centre
})();

/** A ribbon of slabs that opens outward past both edges.
 *
 *  The shape is one row of cards receding to a vanishing point in the middle:
 *  each card is turned on its Y axis by an amount that grows toward the
 *  centre, so the middle ones are nearly edge-on and the outer ones face you.
 *  Under perspective that reads as a strip stretching away from the viewer in
 *  both directions rather than nine rectangles in a line.
 *
 *  Closed, every card is stacked at the centre and fully edge-on — a single
 *  bright seam. Opening rotates them toward the viewer while pushing them
 *  apart, so the seam splits and the cards appear to be pulled out of one
 *  another. The band deliberately runs off both edges: a ribbon that ends on
 *  screen is a row of nine, and the point is that it keeps going. */
export function CardRibbon({
  style, height = H + 12,
}: { style?: StyleProp<ViewStyle>; height?: number }) {
  const open = useSharedValue(0);

  useEffect(() => {
    open.value = withTiming(1, { duration: 1250, easing: Easing.bezier(0.16, 1, 0.3, 1) });
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
  const d = Math.abs(i) / K;                 // 0 at the centre, 1 at the ends
  const style = useAnimatedStyle(() => {
    const t = open.value;
    // cards nearest the middle stay the most turned away, which is what makes
    // the row read as depth instead of a fan
    const turn = turnAt(d) * (i < 0 ? 1 : -1);
    return {
      transform: [
        { perspective: 620 },
        { translateX: interpolate(t, [0, 1], [0, Math.sign(i) * LAYOUT[Math.abs(i)]]) },
        { rotateY: `${interpolate(t, [0, 1], [i < 0 ? 88 : -88, turn])}deg` },
        { scale: interpolate(t, [0, 1], [0.6, scaleAt(d)]) },
      ],
      opacity: interpolate(t, [0, 0.18, 1], [0, 1, 1]),
      zIndex: Math.round(10 + d * 10),       // the outer, nearer cards sit on top
    };
  });

  return (
    <Animated.View style={[s.slab, style]}>
      <View style={s.frame}>
        <Image source={src} style={s.art} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", justifyContent: "center" },
  slab: {
    position: "absolute", width: W, height: H,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  // the white border is the sleeve: it is what separates one card from the
  // next once they overlap, and without it the ribbon reads as one texture
  frame: {
    flex: 1, borderRadius: radius.sm, padding: 3,
    backgroundColor: colors.surface, overflow: "hidden",
  },
  art: { width: "100%", height: "100%", borderRadius: 5 },
});
