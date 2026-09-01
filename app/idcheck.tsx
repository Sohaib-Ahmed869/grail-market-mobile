import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Note } from "../components/Note";
import { Steps } from "../components/Steps";
import { fetchStatus, runVerification, type IdentityStatus } from "../lib/identity";
import { colors, radius, space } from "../theme";

/** Until there is an account system, one device is one person. */
const DEV_USER = "dev-user-1";

const NEEDS = [
  { icon: "credit-card" as const, title: "An Australian driver's licence",
    body: "Front and back. No licence? A passport plus one other document works." },
  { icon: "user" as const, title: "A quick liveness check",
    body: "A short selfie, so we know the licence is yours." },
];

/** Verification gate.
 *
 *  The capture screens themselves are Didit's, not ours. That is deliberate:
 *  document capture is a solved problem with edge detection, glare handling
 *  and 14,000 document layouts behind it, and rebuilding it to match our
 *  styling would be a worse experience wearing better colours.
 *
 *  What this screen owes the user is the part Didit cannot say — why we are
 *  asking, what happens to the photographs, and that the draft they were in
 *  the middle of is safe. */
export default function IdCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [known, setKnown] = useState<IdentityStatus | null>(null);

  // Ask before offering. Someone who verified on another device — or on the
  // hosted flow in a browser, which is a supported path — should not be asked
  // to do it again just because this screen never checked. The backend already
  // knows; the screen only had to look.
  useEffect(() => {
    let alive = true;
    fetchStatus(DEV_USER).then((s) => alive && setKnown(s));
    return () => { alive = false; };
  }, []);

  const verified = known === "Approved";
  const reviewing = known === "In Review";

  const start = async () => {
    setFailure(null);
    setBusy(true);
    const r = await runVerification(DEV_USER);
    setBusy(false);
    if (r.outcome === "finished") router.push("/idreview");
    else if (r.outcome === "failed") setFailure(r.message);
    // cancelled: they backed out on purpose, so say nothing and stay put
  };

  return (
    <Screen
      back
      footer={
        verified ? (
          <Button label="Continue" onPress={() => router.replace("/ladder")} />
        ) : (
          <>
            <Button
              label={reviewing ? "Check again" : "Verify my ID — 2 minutes"}
              onPress={reviewing ? () => router.push("/idreview") : start}
              loading={busy}
            />
            <Button label="Not now" kind="ghost" onPress={() => router.back()} />
          </>
        )
      }
    >
      <Steps step={3} label="Prove it's you" />

      {/* Once someone is verified this screen has nothing to ask for, so it
          stops asking. Leaving the requirements up under a green tick reads as
          the app not knowing its own mind. */}
      <Txt variant="display" style={{ marginTop: space.lg }}>
        {verified ? "You\u2019re verified" : "One step before you trade"}
      </Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        {verified
          ? "You can buy, sell and message. The Seller Verified badge shows on every listing you post."
          : "Buying, selling and messaging all need a verified identity. It takes about two minutes, and your draft is saved while you do it."}
      </Txt>

      <View style={s.list}>
        {!verified && NEEDS.map((n) => (
          <Card key={n.title}>
            <View style={s.row}>
              <View style={s.chip}>
                <Feather name={n.icon} size={16} color={colors.ink} />
              </View>
              <View style={s.text}>
                <Txt variant="h3">{n.title}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{n.body}</Txt>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* The reason the ID is collected at all. It belongs on the screen where
          we ask for it, not buried in a terms document nobody opens. */}
      <View style={{ marginTop: space.lg }}>
        <Note tone={verified ? "good" : "accent"} icon="shield">
          If your licence is on file you think twice before you scam someone. Confirmed
          fraud is referred to NSW Police, or your state's equivalent, with the identity
          we hold.
        </Note>
      </View>

      {failure && (
        <View style={{ marginTop: space.md }}>
          <Note tone="bad" icon="alert-circle">{failure}</Note>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.xxl, gap: space.md },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  chip: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  text: { flex: 1, gap: 3 },
});
