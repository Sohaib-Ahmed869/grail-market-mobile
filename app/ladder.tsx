import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { colors, radius, space } from "../theme";
import { useIdentity } from "../lib/useIdentity";

type Level = {
  name: string; requires: string; here?: boolean;
  can: string[]; cannot: string[];
};

/** Three levels, not four. The old ladder had a fourth tier for a payout
 *  account; there is no payout, no escrow and no wallet, so there was never
 *  anything to verify a bank account for. */
const LEVELS: Level[] = [
  {
    name: "Browsing", requires: "No account",
    can: ["Search and browse every listing", "Scan a card and price check it", "See sales history and trends"],
    cannot: ["Save a collection", "Message a seller"],
  },
  {
    name: "Signed in", requires: "Mobile number confirmed", here: true,
    can: ["Everything above", "Save a collection and watchlist", "Set price alerts"],
    cannot: ["Buy or sell", "Message a seller", "Create a listing"],
  },
  {
    name: "Verified member", requires: "Driver's licence, or two forms of ID",
    can: ["Buy, sell and message", "Create listings", "Earn the Seller Verified badge"],
    cannot: [],
  },
];

const DEV_USER = "dev-user-1";

export default function AccessLevels() {
  const router = useRouter();
  // The same answer the gate uses. This screen offered to verify a member who
  // already was, one tap from a screen saying so.
  const { verified } = useIdentity(DEV_USER);

  return (
    <Screen
      back
      footer={
        verified ? (
          <Button label="Take me in" onPress={() => router.push("/plans")} />
        ) : (
          <>
            <Button label="Verify my ID — 2 minutes" onPress={() => router.push("/idcheck")} />
            <Button label="Later, take me in" kind="ghost" onPress={() => router.push("/plans")} />
          </>
        )
      }
    >
      <Txt variant="display">Three levels, one ladder</Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        {verified
          ? "You\u2019re at level 3. Everything the marketplace does is open to you."
          : "You\u2019re at level 2. Level three is where the marketplace opens \u2014 and it\u2019s required, not optional."}
      </Txt>

      <View style={s.list}>
        {LEVELS.map((l, i) => {
          // the tier you are actually on, rather than the one hard-coded
          const here = verified ? l.name === "Verified member" : Boolean(l.here);
          return (
          <Card key={l.name} tone={here ? "accent" : "plain"}>
            <View style={s.head}>
              <View style={[s.num, here && s.numHere]}>
                <Txt variant="overline" color={here ? colors.onPrimary : colors.inkMuted} style={s.numTxt}>
                  {i + 1}
                </Txt>
              </View>
              <Txt variant="h2" style={s.title}>{l.name}</Txt>
              {here && (
                <Txt variant="overline" color={colors.accent}>You are here</Txt>
              )}
            </View>
            <Txt variant="bodySmall" color={colors.inkFaint} style={s.requires}>{l.requires}</Txt>

            <View style={s.rows}>
              {l.can.map((c) => <Row key={c} label={c} yes />)}
              {l.cannot.map((c) => <Row key={c} label={c} />)}
            </View>
          </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Row({ label, yes }: { label: string; yes?: boolean }) {
  return (
    <View style={s.row}>
      <Feather
        name={yes ? "check" : "x"}
        size={14}
        color={yes ? colors.up : colors.inkFaint}
      />
      <Txt variant="bodySmall" color={yes ? colors.inkMuted : colors.inkFaint}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.xxl, gap: space.md },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  num: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  numHere: { backgroundColor: colors.ink, borderColor: colors.ink },
  numTxt: { fontSize: 10, letterSpacing: 0 },
  title: { flex: 1 },
  requires: { marginTop: 2, marginLeft: 30 },
  rows: { marginTop: space.md, gap: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
