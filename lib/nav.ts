import { useRouter } from "expo-router";

/** Going back, when there may be nothing to go back to.
 *
 *  `router.back()` on the first screen of a stack does nothing at all, and
 *  every deep link starts on the first screen — open the market from a
 *  notification, or from a route typed into the simulator, and the back
 *  control is inert. That is how a screen becomes a room with no door.
 *
 *  So: pop if there is something to pop, otherwise go home. Home is always a
 *  sane place to end up, signed in or not. */
export function useBack(fallback: string = "/(tabs)/home") {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  };
}
