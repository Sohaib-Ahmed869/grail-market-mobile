import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

type Tone = "info" | "accent" | "good" | "bad";

/** A quiet aside. Used where the app owes the user a reason — why a name has
 *  to match a document, what a level does and does not open. */
export function Note({
  children, tone = "info", icon = "shield",
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const fg = tone === "accent" ? colors.accent
    : tone === "good" ? colors.up
    : tone === "bad" ? colors.down
    : colors.info;
  const bg = tone === "accent" ? colors.accentWash
    : tone === "good" ? colors.upWash
    : tone === "bad" ? colors.downWash
    : colors.infoWash;
  return (
    <View style={[s.wrap, { backgroundColor: bg }]}>
      <Feather name={icon} size={15} color={fg} style={s.icon} />
      <Txt variant="bodySmall" color={colors.inkMuted} style={s.text}>{children}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.md },
  icon: { marginTop: 2 },
  text: { flex: 1 },
});
