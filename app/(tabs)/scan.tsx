import { View, StyleSheet } from "react-native";
import { Txt } from "../../components/Text";
import { colors, space } from "../../theme";

/** Scan — next up.
 *
 *  Placeholder rather than absent, so the tab bar tells the truth. The camera
 *  cannot run in a simulator at all, so this one is built against a physical
 *  device or not at all. */
export default function ScanScreen() {
  return (
    <View style={s.root}>
      <Txt variant="h2" center>Scan</Txt>
      <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
        Next up. Needs a real device — a simulator has no camera.
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ground, padding: space.xl },
});
