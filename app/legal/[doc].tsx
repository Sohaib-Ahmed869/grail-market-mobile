import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Note } from "../../components/Note";
import { LAST_REVIEWED, PRIVACY, TERMS, type Section } from "../../lib/legal";
import { colors, radius, space } from "../../theme";

/** Terms and the privacy policy, from a local file rather than a WebView.
 *
 *  A policy that only exists behind a network call is one a member cannot
 *  check at the moment they doubt something — which is usually on a train. */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const privacy = doc === "privacy";
  const sections: Section[] = privacy ? PRIVACY : TERMS;

  return (
    <Screen back>
      <Txt variant="display">{privacy ? "Privacy" : "Terms Of Use"}</Txt>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 4 }}>
        Last reviewed {LAST_REVIEWED}
      </Txt>

      {privacy && (
        <View style={{ marginTop: space.lg }}>
          <Note tone="info" icon="shield">
            We don&rsquo;t sell your personal information. The two sensitive things we
            hold are your identity check and your photographs, and both have their own
            section below.
          </Note>
        </View>
      )}

      {sections.map((sec, i) => (
        <View key={sec.heading} style={[s.section, i === 0 && { marginTop: space.xl }]}>
          <Txt variant="h2">{sec.heading}</Txt>
          {sec.body.map((p, n) => (
            <Txt key={n} variant="body" color={colors.inkMuted} style={s.para}>
              {p}
            </Txt>
          ))}
        </View>
      ))}

      <View style={s.foot}>
        <Txt variant="bodySmall" color={colors.inkFaint}>
          This is written in plain English on purpose. Where it and Australian law
          disagree, the law wins.
        </Txt>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  section: { marginTop: space.xxl, gap: space.sm },
  para: { lineHeight: 23 },
  foot: {
    marginTop: space.xxl, padding: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.surfaceSunk,
  },
});
