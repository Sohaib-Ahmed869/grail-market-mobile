import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, shadow } from "../theme";

/** Back, everywhere, drawn once.
 *
 *  Four screens each rolled their own: a 38pt grey circle with a chevron,
 *  slightly different borders, and no press feedback on any of them — so the
 *  most-tapped control in the app was also the only one that never
 *  acknowledged a tap.
 *
 *  White with a real edge and a lift, rather than grey-on-grey. It sits over
 *  scrolling content, and a control the page can slide underneath has to look
 *  like it is above the page.
 */
export function BackButton({
  onPress, onDark = false, style,
}: {
  onPress: () => void;
  /** Over a dark band — the auth hero, the dashboard header. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [
        s.base,
        onDark ? s.dark : s.light,
        // Scale, not opacity. A control this small fading is easy to miss;
        // one that presses in is felt.
        pressed && { transform: [{ scale: 0.92 }] },
        style,
      ]}
    >
      <Feather
        name="chevron-left"
        size={21}
        color={onDark ? colors.onDark : colors.ink}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    // The chevron is optically right-of-centre in its own box, so the button
    // needs a nudge back or it reads as pointing at the edge.
    paddingRight: 2,
  },
  light: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.outline,
    ...shadow.card,
  },
  dark: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
});
