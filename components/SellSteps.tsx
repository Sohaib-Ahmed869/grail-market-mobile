import { StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { colors, space } from "../theme";

const LABELS = ["The card", "Photographs", "Price & delivery", "Preview", "Declaration"];

/** Five bars and a name.
 *
 *  Listing a card is long enough that people abandon it, and the single
 *  cheapest thing that stops them is knowing how much is left. */
export function SellSteps({ step }: { step: number }) {
  return (
    <View style={s.wrap}>
      <View style={s.bars}>
        {LABELS.map((_, i) => (
          <View key={i} style={[s.bar, i < step && s.on]} />
        ))}
      </View>
      <Txt variant="overline" color={colors.inkFaint}>
        Step {step} of 5 · {LABELS[step - 1]}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.sm },
  bars: { flexDirection: "row", gap: 5 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line },
  on: { backgroundColor: colors.accent },
});
