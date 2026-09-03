import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View,
  type ScrollViewProps, type StyleProp, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageWash } from "./PageWash";
import { Feather } from "@expo/vector-icons";
import { BackButton } from "./BackButton";
import { useBack } from "../lib/nav";
import { useTabBarClearance } from "./TabBar";
import { colors, space } from "../theme";

/** The frame every non-splash screen sits in.
 *
 *  KeyboardAvoidingView wraps the scroll view; it must never be inside one.
 *  Nested the other way it applies padding to content that is already being
 *  scrolled, the layout jumps as the keyboard appears, and the input that
 *  triggered it loses focus — which reads as "tapping the field does nothing".
 */
export function Screen({
  children, back, footer, scroll = true, style, onScroll, scrollEventThrottle, tabBar,
}: {
  children: React.ReactNode;
  back?: boolean;
  footer?: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Passed straight to the scroll view. The tab screens spread `useNavScroll()`
   *  in here so the bottom bar narrows as you read; screens without a bar have
   *  no reason to and do not. */
  onScroll?: ScrollViewProps["onScroll"];
  scrollEventThrottle?: number;
  /** This screen sits under the floating tab bar.
   *
   *  The bar is absolutely positioned so it takes no space in any layout —
   *  that is what lets the page scroll under it — which means the bottom of
   *  the content has to be moved out of the way by hand. Off by default,
   *  because most screens using this have no bar over them and the room would
   *  be a gap at the bottom of every one of them. */
  tabBar?: boolean;
}) {
  const goBack = useBack();
  const clearance = useTabBarClearance();
  const bottom = tabBar ? clearance : undefined;
  // No "bottom" safe-area edge when the bar is over us: the bar consumes that
  // inset itself, and taking it twice leaves a home-indicator's worth of dead
  // space above the pill.

  const body = scroll ? (
    <ScrollView
      // flex:1 is what bounds the scroll view's height. Without it a
      // ScrollView in a column takes the height of its CONTENT, so a long form
      // does not scroll — it overflows underneath the footer and the fields at
      // the bottom become unreachable.
      style={s.fill}
      contentContainerStyle={[s.content, bottom != null && { paddingBottom: bottom }]}
      onLayout={(e) =>
        console.log("[screen] viewport h =", Math.round(e.nativeEvent.layout.height))
      }
      onContentSizeChange={(_w, h) => console.log("[screen] content h =", Math.round(h))}
      showsVerticalScrollIndicator={false}
      // "handled" lets a tap reach a button without first dismissing the
      // keyboard, so moving between fields takes one tap rather than two.
      //
      // keyboardDismissMode is deliberately NOT "on-drag". Tapping a field
      // low in a form makes the list scroll it into view, and that scroll
      // counts as a drag — so the keyboard opened and dismissed itself in the
      // same gesture. Fields near the top were fine, because they needed no
      // scroll, which is exactly the shape the bug took.
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      // iOS insets the scroll view for the keyboard itself, and does it
      // better than we can from JS
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, bottom != null && { paddingBottom: bottom }]}>{children}</View>
  );

  return (
    <SafeAreaView style={[s.safe, style]} edges={tabBar ? ["top"] : ["top", "bottom"]}>
      {/* The same ground every other screen stands on — see PageWash. */}
      <PageWash />
      {/* Android resizes the window for the keyboard on its own
        * (softwareKeyboardLayoutMode defaults to "resize"), and a
        * KeyboardAvoidingView on top of that fights it — the layout is
        * adjusted twice and jitters. So the avoiding behaviour is iOS only,
        * and even there the ScrollView's own keyboard insets do the work
        * for scrolling content. */}
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" && !scroll ? "padding" : undefined}
      >
        {back && (
          <View style={s.bar}>
            <BackButton onPress={goBack} />
          </View>
        )}
        {body}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, width: "100%", backgroundColor: colors.washBottom },
  fill: { flex: 1, width: "100%" },
  bar: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xs },
  content: { width: "100%", paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1 },
  footer: {
    paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm,
    gap: space.sm, width: "100%", backgroundColor: colors.surface,
    // The footer holds the primary action, so it sits on its own plane above
    // the scrolling content rather than dissolving into it.
    borderTopWidth: 1, borderTopColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 }, elevation: 8,
  },
});
