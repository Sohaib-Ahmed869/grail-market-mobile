import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Note } from "../components/Note";
import { awaitDecision, type IdentityStatus } from "../lib/identity";
import { colors, radius, space } from "../theme";

const DEV_USER = "dev-user-1";

/** Checking, then the verdict.
 *
 *  The wait is real and worth showing honestly. Didit's decision reaches us by
 *  webhook — a separate hop that usually lands in seconds but is not
 *  instantaneous — so this screen asks our own backend what it has been told,
 *  rather than trusting what the SDK handed back on the way out. The SDK says
 *  a person finished; only the signed webhook says they passed. */
export default function IdReview() {
  const router = useRouter();
  const [status, setStatus] = useState<IdentityStatus>("In Progress");
  const [slow, setSlow] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    let alive = true;
    const slowTimer = setTimeout(() => alive && setSlow(true), 12_000);
    awaitDecision(DEV_USER).then((s) => {
      if (alive) setStatus(s);
    });
    return () => { alive = false; clearTimeout(slowTimer); };
  }, []);

  const done = status === "Approved" || status === "Declined";
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Screen
      footer={
        done ? (
          <Button
            label={status === "Approved" ? "Continue" : "Try again"}
            onPress={() => (status === "Approved" ? router.replace("/ladder") : router.back())}
          />
        ) : undefined
      }
    >
      <View style={s.middle}>
        {status === "Approved" ? (
          <>
            <View style={[s.badge, s.ok]}>
              <Feather name="check" size={34} color={colors.up} />
            </View>
            <Txt variant="display" center style={s.head}>You&rsquo;re verified</Txt>
            <Txt variant="body" color={colors.inkMuted} center>
              You can buy, sell and message. The Seller Verified badge shows on every
              listing you post.
            </Txt>
          </>
        ) : status === "Declined" ? (
          <>
            <View style={[s.badge, s.bad]}>
              <Feather name="x" size={34} color={colors.down} />
            </View>
            <Txt variant="display" center style={s.head}>We couldn&rsquo;t verify that</Txt>
            <Txt variant="body" color={colors.inkMuted} center>
              The most common reason is a name that doesn&rsquo;t match the document. Check
              your details and try once more.
            </Txt>
          </>
        ) : status === "In Review" ? (
          <>
            <View style={[s.badge, s.wait]}>
              <Feather name="clock" size={30} color={colors.accent} />
            </View>
            <Txt variant="display" center style={s.head}>A person is checking</Txt>
            <Txt variant="body" color={colors.inkMuted} center>
              Something needed a human look. We&rsquo;ll let you know — usually within a few
              hours, and you don&rsquo;t need to stay here.
            </Txt>
          </>
        ) : (
          <>
            <Animated.View style={[s.badge, s.wait, { transform: [{ rotate }] }]}>
              <Feather name="loader" size={30} color={colors.accent} />
            </Animated.View>
            <Txt variant="display" center style={s.head}>Checking</Txt>
            <Txt variant="body" color={colors.inkMuted} center>
              Usually under a minute. Your documents are checked, then deleted — we keep
              the result, not the ID.
            </Txt>
            {slow && (
              <View style={{ marginTop: space.xl, alignSelf: "stretch" }}>
                <Note icon="info">
                  Taking longer than usual. You can close this — we&rsquo;ll have the answer
                  waiting when you come back.
                </Note>
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  badge: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center", marginBottom: space.xl,
    borderWidth: 1,
  },
  ok: { backgroundColor: colors.upWash, borderColor: colors.up },
  bad: { backgroundColor: colors.downWash, borderColor: colors.down },
  wait: { backgroundColor: colors.accentWash, borderColor: colors.accentLine },
  head: { marginBottom: space.sm },
});
