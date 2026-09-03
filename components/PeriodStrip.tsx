import { StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { colors, space, type } from "../theme";

export type Periods = {
  day?: number | null;
  week?: number | null;
  month?: number | null;
  quarter?: number | null;
};

const COLS: { key: keyof Periods; label: string }[] = [
  { key: "day", label: "24h" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "quarter", label: "90d" },
];

/** The same card over four windows.
 *
 *  One number tells you a card moved. Four tell you whether it is a spike or
 *  a trend, which is the difference between news and noise — and the feed was
 *  carrying all four while we showed one. A card down 10% on the week and up
 *  29% on the quarter is a completely different thing from one down 10% on
 *  both, and the single figure cannot say which.
 *
 *  A period we do not have prints an em dash rather than a zero. Zero means
 *  "it did not move", which is a claim; absent means we were not looking.
 */
export function PeriodStrip({ periods }: { periods: Periods }) {
  return (
    <View style={s.row}>
      {COLS.map(({ key, label }) => {
        const v = periods[key];
        const known = v != null && Number.isFinite(v);
        const up = (v ?? 0) >= 0;
        return (
          <View key={key} style={s.col}>
            <Txt variant="bodySmall" color={colors.inkFaint} style={s.label}>{label}</Txt>
            <Txt
              style={[
                s.value,
                { color: !known ? colors.inkFaint : up ? colors.up : colors.down },
              ]}
              numberOfLines={1}
            >
              {!known ? "—" : `${up ? "+" : "−"}${Math.abs(v!).toFixed(1)}%`}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  col: { flex: 1, alignItems: "center", gap: 2 },
  label: { fontSize: 11.5 },
  // Tabular, or four columns of percentages do not line up under their labels.
  value: { ...type.button, fontSize: 14, fontVariant: ["tabular-nums"] },
});
