import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle,
  useSharedValue, type SharedValue,
} from "react-native-reanimated";
import { space } from "../theme";

/** A horizontal rail where the one in the middle is the one you are looking at.
 *
 *  An ordinary rail gives every item the same weight and leaves the edges half
 *  cut off, so there is nothing to look at and nothing to aim for. Here the
 *  centred item is full size and its neighbours are smaller and dimmer, and
 *  the list snaps — so scrolling is choosing rather than panning.
 *
 *  The scale is driven off the scroll offset on the UI thread. Doing it from
 *  React state would mean a re-render of every tile on every frame of a
 *  gesture, which is the version of this that drops frames on the first
 *  device without a fast CPU.
 */
export function FocusRail<T>({
  data, itemWidth, gap = space.md, keyOf, render, onFocus, centreFirst = true,
}: {
  data: T[];
  itemWidth: number;
  gap?: number;
  /** Whether the first item can sit in the middle of the screen.
   *
   *  True for big tiles, where the rail shows one at a time and centring the
   *  first is the only way it can ever be the chosen one. False for small
   *  ones: the padding that centres a 96pt tile is 147pt, so the row would
   *  open with half the screen empty before the first card. Then the rail
   *  starts at the page margin and the item nearest the middle is the focused
   *  one, which for a short row is the second. */
  centreFirst?: boolean;
  keyOf: (item: T, i: number) => string;
  render: (item: T, i: number) => React.ReactNode;
  /** The index now in the middle. Fires on settle, not per frame. */
  onFocus?: (i: number) => void;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const [, setFocused] = useState(0);

  const step = itemWidth + gap;
  // Side padding puts the first and last items in the CENTRE when the list is
  // scrolled to either end. Without it the first card can never be the
  // focused one, which is the card most people look at.
  const pad = centreFirst ? Math.max(space.xl, (width - itemWidth) / 2) : space.xl;
  // The scroll offset at which item i sits in the middle of the screen. With
  // centring padding this is just i * step; without it every item is shifted
  // by however much narrower the leading gutter is. Deriving it rather than
  // assuming it is what lets the same component do both.
  const centreAt = pad + itemWidth / 2 - width / 2;

  // Where the list is allowed to stop. Clamped at zero and de-duplicated,
  // because when the leading gutter is only a page margin the first item or
  // two cannot reach the middle of the screen at all — their stop would be a
  // negative offset, which is not a place a scroll view can rest.
  const stops = Array.from(
    new Set(data.map((_, i) => Math.max(0, Math.round(centreAt + i * step)))),
  ).sort((a, b) => a - b);

  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { x.value = e.contentOffset.x; } });

  const settle = useCallback(
    (offset: number) => {
      const i = Math.max(0, Math.round((offset - centreAt) / step));
      setFocused(i);
      onFocus?.(i);
    },
    [step, centreAt, onFocus],
  );

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      // Snapping is what turns a pan into a choice. `fast` deceleration stops
      // it drifting past the one you were aiming at. Offset by centreAt so the
      // stops land on items rather than on multiples of the step.
      snapToOffsets={stops}
      decelerationRate="fast"
      disableIntervalMomentum
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
      onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
      contentContainerStyle={{ paddingHorizontal: pad, gap }}
    >
      {data.map((item, i) => (
        <Focusable
          key={keyOf(item, i)}
          x={x} index={i} step={step} width={itemWidth} centreAt={centreAt}
        >
          {render(item, i)}
        </Focusable>
      ))}
    </Animated.ScrollView>
  );
}

function Focusable({
  x, index, step, width, centreAt, children,
}: {
  x: SharedValue<number>;
  index: number; step: number; width: number; centreAt: number;
  children: React.ReactNode;
}) {
  // Worked out here, on the JS thread. The worklet below runs on the UI thread
  // and a value it closes over is copied there once; arithmetic left inside it
  // is arithmetic done sixty times a second.
  const mid = centreAt + index * step;

  const style = useAnimatedStyle(() => {
    // Distance from centre, in items. The neighbours either side are the only
    // ones that need to move; anything further is off screen anyway.
    const range = [mid - step, mid, mid + step];
    return {
      transform: [
        { scale: interpolate(x.value, range, [0.86, 1, 0.86], Extrapolation.CLAMP) },
        // A little lift on the focused one. Scale alone reads as "further
        // away"; scale plus a rise reads as "picked up".
        { translateY: interpolate(x.value, range, [10, 0, 10], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(x.value, range, [0.55, 1, 0.55], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[{ width }, style]}>{children}</Animated.View>;
}

export const railStyles = StyleSheet.create({
  // Room for the lift and the shadow, or the scaled tile is clipped by the
  // scroll view's own bounds.
  rail: { paddingVertical: space.md, overflow: "visible" },
});
