import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, space } from "../theme";

/** The frame every non-splash screen sits in: safe area, the ground colour,
 *  an optional back affordance, and a scroll view that keeps a comfortable
 *  gutter. Screens then only describe their own content. */
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
  const Body: any = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: s.content, showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" as const }
    : { style: s.content };

  return (
    <SafeAreaView style={[s.safe, style]} edges={["top", "bottom"]}>
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
      <Body {...bodyProps}>{children}</Body>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, width: "100%", backgroundColor: colors.surface },
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
