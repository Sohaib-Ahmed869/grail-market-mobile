import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Bloom } from "./Bloom";
import { Lockup, MarkWatermark } from "./Brand";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { useBack } from "../lib/nav";
import { colors, radius, space } from "../theme";
import { StatusBar } from "expo-status-bar";

/** The frame both auth screens sit in.
 *
 *  They were a title and a stack of inputs on white — the shape of a form
 *  rather than the front door of a product. This is the other convention, and
 *  it is a convention because it works: the brand owns the top of the screen,
 *  and the form arrives on a sheet that overlaps it, so the page has a
 *  foreground and a background instead of one flat plane.
 *
 *  Both screens share it so they cannot drift apart, which is what happened
 *  the last time each owned its own layout. */
export function AuthShell({
  title, sub, children, footer, back = true,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Off at the end of a flow. "You're in" is not somewhere you go back
   *  from — the account exists, and an arrow pointing at the welcome screen
   *  is an invitation to undo something that cannot be undone. */
  back?: boolean;
}) {
  const goBack = useBack("/welcome");

  return (
    <View style={s.root}>
      {/* The navy band runs under the status bar, so the clock needs to be
          white here even though every other screen is dark-on-light. */}
      <StatusBar style="light" />
      <LinearGradient
        colors={["#25374A", colors.dark, "#0A1219"]}
        locations={[0, 0.5, 1]}
        style={s.hero}
      >
        {/* Texture, in two layers. The bloom warms the band; the letter gives
            it something to warm. Both sit behind everything and neither is
            meant to be looked at directly. */}
        <View style={s.bloom} pointerEvents="none">
          <Bloom size={460} color={colors.accent} opacity={0.26} />
        </View>
        <MarkWatermark size={340} opacity={0.055} style={s.watermark} />
        <SafeAreaView edges={["top"]}>
          {back ? (
            <Pressable onPress={goBack} hitSlop={12} style={s.back}>
              <Icon name="home" size={17} color={colors.onDark} />
            </Pressable>
          ) : (
            // Reserves the same space, draws nothing. Reusing s.back left a
            // grey empty circle sitting in the corner of the one screen that
            // has no back control.
            <View style={s.backSpacer} />
          )}
          <View style={s.brand}>
            <Animated.View entering={FadeInDown.duration(560).delay(120)}>
              <Lockup width={182} onDark />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(520).delay(340)}>
              <Txt variant="bodySmall" color={colors.onDarkMuted} center style={{ marginTop: space.sm }}>
                Australia&rsquo;s marketplace for slabs &amp; sealed
              </Txt>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? -24 : 0}
      >
        <View style={s.sheet}>
          <ScrollView
            style={s.fill}
            contentContainerStyle={s.sheetBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <Animated.View entering={FadeInDown.duration(460).delay(240)}>
              <Txt variant="display">{title}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
                {sub}
              </Txt>
            </Animated.View>
            {children}
          </ScrollView>
          <View style={s.footer}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark },
  fill: { flex: 1 },
  hero: { paddingBottom: space.xxxl, overflow: "hidden" },
  bloom: { position: "absolute", top: -160, alignSelf: "center", width: 460, height: 460 },
  // Off the right edge and cropped by the band. A watermark centred and whole
  // is just a faint logo; one running off an edge reads as a surface the
  // content is laid on.
  watermark: { position: "absolute", right: -130, top: -40 },
  back: {
    marginLeft: space.xl, marginTop: space.sm,
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.16)",
  },
  backSpacer: { marginLeft: space.xl, marginTop: space.sm, width: 38, height: 38 },
  brand: { alignItems: "center", marginTop: space.lg },
  // the sheet overlaps the band, which is what gives the screen its depth
  sheet: {
    flex: 1, marginTop: -space.xxl,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: colors.washBottom,
    overflow: "hidden",
  },
  // Top-aligned, deliberately. Centring a short form was tried and it moves
  // the empty third from below the fields to above the title — and a heading
  // that starts a third of the way down the sheet reads as a page that has
  // not finished loading. Empty space under a form is just room.
  sheetBody: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  footer: {
    paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl,
    gap: space.sm, borderTopWidth: 1, borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});

/** Apple and Google, as one row. Kept here so both screens show the same
 *  thing in the same place. */
export function SocialRow() {
  return (
    <View style={s2.row}>
      <Pressable style={s2.btn} accessibilityRole="button">
        <Txt variant="button"> Apple</Txt>
      </Pressable>
      <Pressable style={s2.btn} accessibilityRole="button">
        <Txt variant="button" color="#DB4437">G</Txt>
        <Txt variant="button">oogle</Txt>
      </Pressable>
    </View>
  );
}

const s2 = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, marginTop: space.xl },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 50, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.fieldLine, backgroundColor: colors.surface,
  },
});
