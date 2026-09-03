import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import Animated, {
  FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "./Icon";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Txt } from "./Text";
import { useNavCollapsed, useNavHidden } from "../lib/navbar";
import { colors, radius, space } from "../theme";

// Route name to icon. Watchlist joins the bar; profile moves to the avatar
// in the home header, which is where people already look for themselves.
const ICONS: Record<string, IconName> = {
  home: "home",
  community: "community",
  scan: "scan",
  watchlist: "watchlist",
  portfolio: "collection",
};

/** How much room the floating bar occupies at the bottom of a tab screen.
 *
 *  The bar is absolutely positioned — that is what makes the page scroll
 *  *under* it — which means it takes no space in any layout and nothing below
 *  it moves out of the way on its own. Anything pinned to the bottom of a tab
 *  screen has to subtract this by hand, or it ends up underneath the bar.
 *
 *  6 padding + 46 item + 6 padding = 58 for the pill, and the raised Scan
 *  button breaks 18 above that — so the tallest thing to clear is 76, not 58.
 *  Clearing only the pill leaves the last row of a list tucked behind the one
 *  control that sticks out.
 */
export const TAB_BAR_HEIGHT = 58;
export const RAISED_OVERHANG = 18;
export const TAB_BAR_GAP = space.md;

/** Bottom padding that clears the floating bar, safe area included.
 *
 *  `useSafeAreaInsets` rather than a SafeAreaView edge, because the bar
 *  already consumes the inset itself — a screen that also insets would leave
 *  a home-indicator's worth of gap twice over. */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + RAISED_OVERHANG + Math.max(insets.bottom, space.md) + TAB_BAR_GAP;
}

/** The one that is not a peer of the others.
 *
 *  Scanning is what the product is for; everything else is what you do with
 *  what a scan told you. So it is not a tab among tabs — it is raised, round
 *  and in the middle, which is the shape every app uses for its one verb. */
const RAISED = "scan";

/** The navigation, floating.
 *
 *  A bar welded to the bottom edge is the platform default and it makes the
 *  screen end at a wall. Lifting it off the edge and rounding it turns the
 *  content into something the page scrolls *under*, which is why every app
 *  that looks considered right now does this.
 *
 *  The active tab is a filled pill rather than a colour change: at a glance
 *  the eye finds a shape faster than it finds a tint, and the label can then
 *  stay the same weight everywhere instead of bolding and shifting the layout
 *  by a pixel each time you switch.
 *
 *  The pill moves rather than jumping. Each item animates its own width via a
 *  layout transition and the label fades in behind it, so switching tabs is
 *  one continuous movement that matches the 320ms cross-fade of the screens
 *  underneath. A bar that snaps while the screen dissolves reads as two
 *  unrelated things happening at once.
 *
 *  It also narrows as you read. Scrolling down drops the label and tightens
 *  every item, so the bar shrinks to a compact pill and gives the page back
 *  the width; scrolling up, or reaching the top, opens it again. The width
 *  change rides the same layout transition the active pill already uses, so
 *  it is one mechanism doing two jobs rather than a second animation fighting
 *  the first.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const collapsed = useNavCollapsed();
  const hidden = useNavHidden();

  // After the hooks, never before one — an early return above them is a
  // different hook order on the render that hides the bar.
  if (hidden) return null;

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]} pointerEvents="box-none">
      <Animated.View
        layout={LinearTransition.duration(320)}
        style={[s.bar, collapsed && s.barTight]}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];

          // Only the five destinations get a button. Relying on the
          // framework's href:null did not work here — it never reached these
          // options — and an allowlist cannot drift: a screen that is not in
          // ICONS is not in the bar, which is also why the fallback icon
          // showed up as an anonymous empty circle.
          if (!(route.name in ICONS)) return null;

          const label = (options.title ?? route.name) as string;
          const icon = ICONS[route.name] ?? "circle";

          const onPress = () => {
            const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };

          if (route.name === RAISED) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [
                  s.raised,
                  collapsed && s.raisedTight,
                  focused && s.raisedOn,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <Icon
                  name="scan"
                  size={collapsed ? 22 : 26}
                  color={focused ? colors.dark : colors.onPrimary}
                  filled
                />
              </Pressable>
            );
          }

          return (
            <Animated.View key={route.key} layout={LinearTransition.duration(320)}>
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  s.item,
                  collapsed && s.itemTight,
                  focused && s.itemOn,
                  focused && collapsed && s.itemOnTight,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <TabIcon icon={icon} focused={focused} />
                {/* The label is what the width is made of, so dropping it is
                    what makes the bar narrow. Unmounted rather than hidden:
                    a zero-opacity label still occupies its width. */}
                {focused && !collapsed && (
                  <Animated.View entering={FadeIn.duration(260).delay(60)} exiting={FadeOut.duration(140)}>
                    <Txt variant="bodySmall" color={colors.onPrimary} style={s.label} numberOfLines={1}>
                      {label}
                    </Txt>
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/** The icon, crossing from muted to white as its pill fills.
 *
 *  Feather takes a colour prop rather than a style, so the tint cannot be
 *  animated directly — two copies, one fading over the other, is the cheap
 *  and correct way to do it. */
function TabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
  const t = useSharedValue(focused ? 1 : 0);
  // In an effect, not in the render body. Writing to a shared value while
  // React is rendering is a documented Reanimated error — the write can land
  // in a render that is then thrown away, so the animation either never
  // starts or starts twice. It also filled the log with warnings, which put
  // a LogBox toast over the bottom of every screen.
  useEffect(() => {
    t.value = withTiming(focused ? 1 : 0, { duration: 300 });
  }, [focused, t]);

  const on = useAnimatedStyle(() => ({ opacity: t.value }));
  const off = useAnimatedStyle(() => ({ opacity: 1 - t.value }));

  return (
    <View style={s.icon}>
      {/* outline when idle, filled when selected — the shape changes, not
          just the tint, which reads at a glance and survives colour blindness */}
      <Animated.View style={[StyleSheet.absoluteFill, s.iconLayer, off]}>
        <Icon name={icon} size={21} color={colors.inkMuted} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, s.iconLayer, on]}>
        <Icon name={icon} size={21} color={colors.onPrimary} filled />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    alignItems: "center", paddingHorizontal: space.lg,
  },
  bar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2,
    padding: 6, borderRadius: radius.pill,
    backgroundColor: colors.surface,
    // A defined edge, not a hairline. The bar floats over pages that are
    // white or near-white, and a #E3E8ED border on a #FAFBFC ground is 1.2:1
    // — the pill and the page ran into each other and it stopped reading as
    // a separate thing sitting on top.
    borderWidth: 1, borderColor: colors.lineStrong,
    // the lift is what makes it read as floating rather than as a strip of
    // white someone forgot to colour
    shadowColor: "#0B1622", shadowOpacity: 0.22, shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 }, elevation: 18,
    ...Platform.select({ web: { boxShadow: "0 12px 26px rgba(11,22,34,0.22)" } }),
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: 6,
    height: 46, paddingHorizontal: 12, borderRadius: radius.pill,
  },
  // Collapsed. Everything tightens together — a bar that only dropped its
  // label would keep the same generous padding around a smaller thing and
  // read as a gap rather than as a smaller bar.
  barTight: { padding: 4 },
  itemTight: { height: 40, paddingHorizontal: 8 },
  itemOnTight: { paddingHorizontal: 10 },
  raisedTight: { width: 48, height: 48, borderRadius: 24, marginTop: -12, borderWidth: 3 },
  raised: {
    width: 58, height: 58, borderRadius: 29, marginTop: -18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.ink,
    borderWidth: 4, borderColor: colors.surface,
    shadowColor: "#0B1622", shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  // On the scan screen itself the navy button sat on a navy screen and
  // disappeared. Gold when it is the current tab: it is the one action the
  // whole product is for, and it should be the brightest thing in the bar.
  raisedOn: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOpacity: 0.55, shadowRadius: 18,
  },
  itemOn: { backgroundColor: colors.ink, paddingHorizontal: space.md },
  label: { fontSize: 12.5 },
  icon: { width: 21, height: 21 },
  iconLayer: { alignItems: "center", justifyContent: "center" },
});
