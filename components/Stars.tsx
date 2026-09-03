import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, space } from "../theme";

/** A rating, shown or given.
 *
 *  When there is nothing to show it says so in words rather than drawing five
 *  empty stars. Five greyed stars reads as "rated zero", which is a much
 *  worse claim than "not rated yet" and is the opposite of true. */
export function Stars({
  value, count, size = 15, onPick,
}: {
  value: number | null;
  /** how many ratings the average is drawn from */
  count?: number;
  size?: number;
  /** present = interactive */
  onPick?: (n: number) => void;
}) {
  if (value == null && !onPick) {
    return (
      <Txt variant="bodySmall" color={colors.inkFaint}>
        No ratings yet
      </Txt>
    );
  }

  const shown = value ?? 0;
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = shown >= n - 0.25;
        const star = (
          <Feather
            name="star"
            size={size}
            color={filled ? colors.accent : colors.line}
            style={filled ? s.filled : undefined}
          />
        );
        return onPick ? (
          <Pressable key={n} onPress={() => onPick(n)} hitSlop={6}>{star}</Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
      {value != null && !onPick && (
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginLeft: 4 }}>
          {value.toFixed(1)}{count != null ? ` · ${count}` : ""}
        </Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  // Feather's star is an outline; filling it needs the glyph doubled up, so
  // a shadow of the same colour does the job at these sizes.
  filled: {
    textShadowColor: colors.accent,
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
});
