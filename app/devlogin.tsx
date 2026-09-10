import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Loader } from "../components/Loader";
import { Txt } from "../components/Text";
import { login } from "../lib/auth";
import { colors, space } from "../theme";

/** Sign in from a link, for driving the app without hands.
 *
 *  There is no tap driver on the machine this is tested from — no idb, no
 *  accessibility permission for AppleScript — so a simulator can be deep-
 *  linked to any screen and can never be typed into. That is fine for looking
 *  at screens and useless for anything behind a sign-in, which is most of the
 *  product.
 *
 *      xcrun simctl openurl <device> \
 *        'grailmarket:///devlogin?email=someone@example.com&password=...'
 *
 *  This is NOT a back door. It calls the same `login()` the form calls, with
 *  credentials that have to be right, against the same endpoint — it removes
 *  the typing, not the password. And the whole screen is behind `__DEV__`, so
 *  it is stripped from a release build: in production the route renders a
 *  refusal and signs nobody in.
 */
export default function DevLogin() {
  const router = useRouter();
  const { email, password, to } = useLocalSearchParams<{
    email?: string; password?: string; to?: string;
  }>();
  const [state, setState] = useState<string>("Signing in…");

  useEffect(() => {
    if (!__DEV__) { setState("Not available in this build."); return; }
    let alive = true;
    (async () => {
      if (!email || !password) { setState("Needs ?email= and &password="); return; }
      const r = await login(String(email), String(password));
      if (!alive) return;
      if (r.ok === false) { setState(r.message ?? "Sign-in failed."); return; }
      if (r.ok === "mfa") { setState("This account has two-step on; cannot be driven from a link."); return; }
      router.replace((to ? String(to) : "/(tabs)/home") as never);
    })();
    return () => { alive = false; };
  }, [email, password, to]);

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: space.xxxl, gap: space.lg }}>
        {__DEV__ && state === "Signing in…" ? <Loader /> : null}
        <Txt variant="h3" center>{state}</Txt>
        {__DEV__ && email ? (
          <Txt variant="bodySmall" color={colors.inkMuted} center>{String(email)}</Txt>
        ) : null}
      </View>
    </Screen>
  );
}
