import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { colors } from "../theme";

// A face that is alive, and answers when you press it.
//
// The reference for this was a pixel Pokemon sprite bobbing in a header. We
// draw our own characters rather than borrow those: lib/avatars.ts already
// explains why the app does not use emoji — "somebody else's artwork rendered
// by the OS" — and a Game Freak sprite in a commercial marketplace is the same
// objection with a lawyer attached. The motion is the part that made it feel
// alive, and motion is ours to write.
//
// Three things, in the order they matter:
//
//   idle    a slow rise and fall. Two seconds up, two down, forever. It is
//           the difference between a portrait and a creature, and it has to
//           be slow enough that a list of twelve is not a disco.
//   blink   both eyes shut for 120ms at an uneven interval. Regular blinking
//           reads as a machine; the jitter is what sells it.
//   press   squash on the way down, overshoot on the way back, and a heart
//           that leaves. Squash-and-stretch is the oldest trick there is and
//           it still works better than a scale tween.

/** Idle bob, in points. Deliberately tiny — this is breathing, not bouncing. */
const BOB = 2.2;
const BOB_MS = 2000;
const BLINK_SHUT_MS = 120;

export function AnimatedAvatar({
  name,
  id,
  size = 40,
  ring = false,
  /** Called on a press that lands a heart. Absent means the face is decorative
   *  and does not invite a tap — no press handler, no hearts, still breathing. */
  onHeart,
  /** Whether this viewer has already hearted. A filled heart on the badge. */
  hearted = false,
  /** How many hearts this face has, if that is being counted. */
  hearts,
  accessibilityLabel,
}: {
  name: string;
  id?: string | null;
  size?: number;
  ring?: boolean;
  onHeart?: () => void;
  hearted?: boolean;
  hearts?: number | null;
  accessibilityLabel?: string;
}) {
  // Respect the system setting. "Reduce Motion" is not a preference about
  // charm, it is a person telling us that movement makes them ill.
  const still = useReducedMotion();

  const bob = useSharedValue(0);
  const squash = useSharedValue(1);
  const [blinking, setBlinking] = useState(false);

  // Hearts in flight. Each is its own element with its own animation so a
  // second tap does not restart the first heart's journey — rapid taps should
  // stack up, the way they do everywhere else this gesture exists.
  const [flock, setFlock] = useState<number[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (still) { bob.value = 0; return; }
    bob.value = withRepeat(
      withSequence(
        withTiming(-BOB, { duration: BOB_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: BOB_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bob);
  }, [still, bob]);

  useEffect(() => {
    if (still || size < 22) return; // below 22pt Avatar draws initials — nothing to blink
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // 2.5-6.5s apart. An even cadence is the tell that gives away a machine.
      timer = setTimeout(() => {
        if (!alive) return;
        setBlinking(true);
        setTimeout(() => { if (alive) setBlinking(false); }, BLINK_SHUT_MS);
        schedule();
      }, 2500 + Math.random() * 4000);
    };
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, [still, size]);

  const press = useCallback(() => {
    if (!onHeart) return;
    if (!still) {
      squash.value = withSequence(
        withTiming(0.88, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 6, stiffness: 220 }),
      );
    }
    const id = nextId.current++;
    setFlock((f) => [...f, id]);
    // Removed by the heart itself when its flight is over; this is the
    // backstop so a component unmounted mid-flight leaves nothing behind.
    setTimeout(() => setFlock((f) => f.filter((x) => x !== id)), 1000);
    onHeart();
  }, [onHeart, squash, still]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: squash.value }],
  }));

  const face = (
    <Animated.View style={bodyStyle}>
      <Avatar name={name} id={id} size={size} ring={ring} eyes={blinking ? "closed" : undefined} />
    </Animated.View>
  );

  if (!onHeart) {
    return <View style={{ width: size, height: size }}>{face}</View>;
  }

  return (
    <Pressable
      onPress={press}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Heart ${name}`}
      accessibilityState={{ selected: hearted }}
      style={{ width: size, height: size }}
    >
      {face}

      {flock.map((k) => (
        <FlyawayHeart key={k} size={size} still={still} />
      ))}

      {/* The count, only where there is one. A badge reading 0 is an
          invitation phrased as a disappointment. */}
      {hearts != null && hearts > 0 && (
        <View style={[st.badge, { left: size * 0.62, top: size * 0.62 }]}>
          <Icon name="heart" size={9} filled={hearted} color={colors.onPrimary} />
        </View>
      )}
    </Pressable>
  );
}

/** One heart, leaving. Up, out a little, and gone in under a second. */
function FlyawayHeart({ size, still }: { size: number; still: boolean }) {
  const t = useSharedValue(0);
  // Each heart drifts its own way, so a stack of them is a flock rather than
  // a column.
  const drift = useRef((Math.random() - 0.5) * size * 0.7).current;

  useEffect(() => {
    t.value = withTiming(1, {
      duration: still ? 1 : 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [t, still]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateY: -t.value * size * 1.15 },
      { translateX: drift * t.value },
      { scale: 0.7 + t.value * 0.5 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[st.heart, { left: size / 2 - 7 }, style]}>
      <Icon name="heart" size={14} filled color={colors.down} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  heart: { position: "absolute", top: 0 },
  badge: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.down,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
