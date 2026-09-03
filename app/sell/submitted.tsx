import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { colors, radius, space } from "../../theme";

/** What happens after Submit.
 *
 *  A listing does not go live by itself, and a seller who expects it to will
 *  read the delay as the app being broken. So the wait is named, given a
 *  length, and the reason for it is stated — it is the same check that lets a
 *  buyer trust anything on the market. */
const STAGES = [
  { icon: "check", title: "Submitted", body: "Photos and declaration received.", done: true },
  { icon: "eye", title: "A person checks it", body: "Photos against the card, price against the market, label against the cert.", done: false },
  { icon: "shopping-bag", title: "Live on the market", body: "Buyers can see it and make offers.", done: false },
] as const;

export default function Submitted() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <Screen
      footer={
        <>
          <Button label="See my listings" onPress={() => router.replace("/mylistings")} />
          <Button label="List another card" kind="ghost" onPress={() => router.replace("/(tabs)/scan")} />
        </>
      }
    >
      <View style={s.tick}>
        <Feather name="check" size={26} color={colors.onPrimary} />
      </View>
      <Txt variant="display" center style={{ marginTop: space.lg }}>In Review</Txt>
      <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
        Usually under 24 hours. We'll notify you either way.
      </Txt>

      <View style={s.steps}>
        {STAGES.map((st, i) => (
          <View key={st.title} style={s.step}>
            <View style={s.rail}>
              <View style={[s.node, st.done && s.nodeOn]}>
                <Feather name={st.icon} size={12} color={st.done ? colors.onPrimary : colors.inkFaint} />
              </View>
              {i < STAGES.length - 1 && <View style={s.line} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.lg }}>
              <Txt variant="h3" color={st.done ? colors.ink : colors.inkMuted}>{st.title}</Txt>
              <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>{st.body}</Txt>
            </View>
          </View>
        ))}
      </View>

      <Note icon="info">
        If something needs changing we'll say what, and the listing comes back to you as a
        draft rather than disappearing.
      </Note>

      {id && (
        <Txt variant="overline" color={colors.inkFaint} center style={{ marginTop: space.lg }}>
          Reference {String(id).slice(0, 8)}
        </Txt>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  tick: {
    width: 56, height: 56, borderRadius: 28, alignSelf: "center", marginTop: space.xxxl,
    backgroundColor: colors.up, alignItems: "center", justifyContent: "center",
  },
  steps: { marginTop: space.xxl, marginBottom: space.xl },
  step: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 26 },
  node: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center",
  },
  nodeOn: { backgroundColor: colors.up, borderColor: colors.up },
  line: { flex: 1, width: 1.5, backgroundColor: colors.line, marginVertical: 2 },
});
