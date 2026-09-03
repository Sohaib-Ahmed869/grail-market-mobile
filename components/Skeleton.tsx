import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withRepeat, withTiming,
} from "react-native-reanimated";
import { colors, radius, space } from "../theme";

// The shape of what is coming.
//
// A spinner says "wait"; a skeleton says "wait, and here is what for". On a
// list that difference is the whole perceived speed of the screen — the
// layout is already correct when the data lands, so nothing jumps.
//
// One shared pulse rather than one per block: twelve independently breathing
// rectangles look like a fault, and twelve animations cost twelve times as
// much on the UI thread.

function usePulse() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [t]);
  return t;
}

export function Bone({
  w = "100%", h = 12, r = 6, style,
}: {
  w?: DimensionValue; h?: number; r?: number; style?: StyleProp<ViewStyle>;
}) {
  const t = usePulse();
  const anim = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [0.45, 1]) }));
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: colors.line }, anim, style]}
    />
  );
}

/** A market tile: art, then two lines, then a price. */
export function SkeletonCard({ width = 152, grid = false }: { width?: number; grid?: boolean }) {
  return (
    <View style={grid ? { flexBasis: "47%", flexGrow: 1 } : { width }}>
      <Bone w="100%" h={200} r={radius.md} />
      <Bone w="80%" h={13} style={{ marginTop: space.sm }} />
      <Bone w="55%" h={11} style={{ marginTop: 6 }} />
      <Bone w="45%" h={15} style={{ marginTop: 8 }} />
    </View>
  );
}

/** A pulse card: name, set, price, and the space the chart will take. */
export function SkeletonPulse({ width = 172 }: { width?: number }) {
  return (
    <View style={[s.panel, { width }]}>
      <Bone w="70%" h={13} />
      <Bone w="50%" h={11} style={{ marginTop: 6 }} />
      <View style={s.pulseFoot}>
        <View style={{ flex: 1 }}>
          <Bone w="70%" h={14} />
          <Bone w="45%" h={10} style={{ marginTop: 5 }} />
        </View>
        <Bone w={62} h={26} r={4} />
      </View>
    </View>
  );
}

/** A list row: thumbnail on the left, two lines, a figure on the right. */
export function SkeletonRow() {
  return (
    <View style={s.row}>
      <Bone w={48} h={66} r={5} />
      <View style={{ flex: 1, gap: 7 }}>
        <Bone w="38%" h={10} r={4} />
        <Bone w="75%" h={14} />
        <Bone w="50%" h={11} />
      </View>
      <Bone w={58} h={16} />
    </View>
  );
}

/** A forum post: the vote column, then the post. */
export function SkeletonPost() {
  return (
    <View style={s.post}>
      <View style={{ alignItems: "center", gap: 6, width: 34 }}>
        <Bone w={14} h={14} r={7} />
        <Bone w={18} h={12} />
        <Bone w={14} h={14} r={7} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Bone w="55%" h={10} r={4} />
        <Bone w="92%" h={15} />
        <Bone w="70%" h={15} />
        <Bone w="40%" h={11} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}

/** Several of anything, laid out the way the real thing will be. */
export function SkeletonList({
  count = 4, gap = space.md, children,
}: { count?: number; gap?: number; children: () => React.ReactNode }) {
  return <View style={{ gap }}>{Array.from({ length: count }, (_, i) => (
    <View key={i}>{children()}</View>
  ))}</View>;
}

const s = StyleSheet.create({
  panel: {
    padding: space.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  pulseFoot: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.md },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  post: {
    flexDirection: "row", gap: space.md, padding: space.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
