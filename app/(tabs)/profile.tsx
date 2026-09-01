import { View, StyleSheet } from "react-native";
import { Txt } from "../../components/Text";
import { colors, space } from "../../theme";

/** Placeholder. Named and routed so the tab bar is honest about what exists,
 *  rather than hiding two tabs that are coming. */
export default function ProfileScreen() {
  return (
    <View style={s.root}>
      <Txt variant="h2" center>Profile</Txt>
      <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
        Not built yet.
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ground },
});
