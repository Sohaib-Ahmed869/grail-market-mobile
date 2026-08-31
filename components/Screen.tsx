import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View,
  type StyleProp, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, space } from "../theme";

/** The frame every non-splash screen sits in.
 *
 *  KeyboardAvoidingView wraps the scroll view; it must never be inside one.
 *  Nested the other way it applies padding to content that is already being
 *  scrolled, the layout jumps as the keyboard appears, and the input that
 *  triggered it loses focus — which reads as "tapping the field does nothing".
 */
export function Screen({
  children, back, footer, scroll = true, style,
}: {
  children: React.ReactNode;
  back?: boolean;
  footer?: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      // "handled" lets a tap reach a button without first dismissing the
      // keyboard, so moving between fields takes one tap rather than two
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={s.content}>{children}</View>
  );

  return (
    <SafeAreaView style={[s.safe, style]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {back && (
          <View style={s.bar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Feather name="chevron-left" size={22} color={colors.ink} />
            </Pressable>
          </View>
        )}
        {body}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, width: "100%", backgroundColor: colors.surface },
  fill: { flex: 1, width: "100%" },
  bar: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xs },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  content: { width: "100%", paddingHorizontal: space.xl, paddingBottom: space.xxl, flexGrow: 1 },
  footer: {
    paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm,
    gap: space.sm, width: "100%", backgroundColor: colors.surface,
  },
});
