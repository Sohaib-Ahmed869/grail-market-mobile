import { StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { colors, space } from "../theme";

/** Where you are in getting in.
 *
 *  Three bars, not a spinner or a percentage. Someone deciding whether to
 *  start a signup wants to know how much of their evening it costs, and "one
 *  of three, and here is how far along" answers that in a glance. The labels
 *  stay off — a bar that is filled is understood without being told. */
export function Steps({ step, of = 3, label }: { step: number; of?: number; label?: string }) {
  return (
    <View style={s.wrap}>
      <View style={s.bars}>
        {Array.from({ length: of }).map((_, i) => (
          <View key={i} style={[s.bar, i < step && s.on]} />
        ))}
      </View>
      {label && (
        <Txt variant="overline" color={colors.inkFaint}>
          Step {step} of {of} · {label}
        </Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.sm },
  bars: { flexDirection: "row", gap: 5 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line },
  on: { backgroundColor: colors.accent },
});
