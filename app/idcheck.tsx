import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../components/Toast";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Note } from "../components/Note";
import { Steps } from "../components/Steps";
import { runVerification } from "../lib/identity";
import { setIdentity, useIdentity } from "../lib/useIdentity";
import { useSession } from "../lib/session";
import { colors, radius, space } from "../theme";

/** Until there is an account system, one device is one person. */


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
  const toast = useToast();
  const session = useSession();
  const userId = session?.userId ?? "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Ask before offering. Someone who verified on another device — the hosted
  // flow in a browser is a supported path — should not be asked again just
  // because this screen never looked.
  const { verified, reviewing } = useIdentity(userId);

  const start = async () => {
    setBusy(true);
    const r = await runVerification(userId);
    setBusy(false);
    if (r.outcome === "finished") router.push("/idreview");
    else if (r.outcome === "failed") toast(r.message ?? "Something went wrong.", { tone: "bad" });
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
