import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

// Whether the bottom bar is collapsed, in one place.
//
// A module store rather than a context: the bar is rendered by the navigator,
// outside every screen, so a provider would have to wrap the whole app to pass
// a value down to a sibling. This is two functions and a Set, and it moves the
// bar the same instant whichever screen is scrolling.
//
// It holds a boolean rather than a scroll offset on purpose. The bar has two
// states and the width animation between them is a layout transition, so a
// continuous value would re-render on every frame to drive something that only
// changes twice.

let collapsed = false;
const listeners = new Set<(v: boolean) => void>();

// Whether the bar is gone entirely, which is a different question from
// whether it is narrow. A screen that is one decision — the guest gate — is
// not a place to offer five destinations; the decision is the page.
let hidden = false;
const hideListeners = new Set<(v: boolean) => void>();
const setHidden = (v: boolean) => {
  if (v === hidden) return;
  hidden = v;
  hideListeners.forEach((l) => l(v));
};

const set = (v: boolean) => {
  if (v === collapsed) return;
  collapsed = v;
  listeners.forEach((l) => l(v));
};

export const expandNav = () => set(false);

/** Read by the bar itself. */
export function useNavHidden(): boolean {
  const [v, setV] = useState(hidden);
  useEffect(() => {
    hideListeners.add(setV);
    return () => { hideListeners.delete(setV); };
  }, []);
  return v;
}

/** Called by a screen that wants the bar gone while it is on top.
 *
 *  Tied to focus rather than to mount: a gate stays mounted underneath when
 *  you push sign-up on top of it, and a bar that stayed hidden after you came
 *  back would look like a bar that had crashed.
 *
 *  Any screen using this MUST offer its own way out — see the gate's back
 *  control. Hiding the only navigation and giving nothing back is how a
 *  person ends up force-quitting the app. */
export function useHideNav(): void {
  useFocusEffect(
    useCallback(() => {
      setHidden(true);
      return () => setHidden(false);
    }, []),
  );
}

export function useNavCollapsed(): boolean {
  const [v, setV] = useState(collapsed);
  useEffect(() => {
    listeners.add(setV);
    return () => { listeners.delete(setV); };
  }, []);
  return v;
}

/** How far past the top before scrolling down is allowed to collapse it. */
const SETTLE = 40;
/** How far in one direction before it counts as a direction.
 *
 *  Without this the bar flickers on the small negative deltas iOS produces
 *  while a finger is still down, and on the bounce at the top of a list. */
const INTENT = 8;

/** Scroll props for any list or scroll view that should move the bar.
 *
 *  Spread onto the scrollable: `<ScrollView {...useNavScroll()} />`. Plain JS
 *  handlers rather than a Reanimated scroll handler, because that would mean
 *  converting every ScrollView and FlatList in the app to its Animated
 *  equivalent to drive a boolean that changes twice a screen.
 */
export function useNavScroll() {
  const last = useRef(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - last.current;

    // Near the top the bar is always out. Somebody who has scrolled back to
    // the start of a page is not reading, they are navigating.
    if (y <= SETTLE) set(false);
    else if (dy > INTENT) set(true);
    else if (dy < -INTENT) set(false);

    // Only track past the threshold, so the rubber-band overscroll at the top
    // does not register as a hard scroll up the moment it releases.
    if (Math.abs(dy) > INTENT || y <= SETTLE) last.current = y;
  }, []);

  // Leaving a screen collapsed would leave the bar small on the next one,
  // which reads as the bar being broken rather than as a scroll position.
  useEffect(() => () => { expandNav(); }, []);

  return { onScroll, scrollEventThrottle: 16 as const };
}
