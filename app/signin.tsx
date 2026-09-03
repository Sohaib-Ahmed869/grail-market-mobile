import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useToast } from "../components/Toast";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { SocialAuth } from "../components/SocialAuth";
import { emailError } from "../lib/validate";
import { login } from "../lib/auth";
import { colors, radius, space } from "../theme";

/** Sign in.
 *
 *  The welcome screen offered only "Create an account", which is fine once and
 *  wrong every time after — a returning member met a signup form and no way
 *  past it. This is the other half.
 *
 *  Validation is lighter than signup's on purpose: an existing password has
 *  already met the rules, and re-checking its length here would lock out
 *  anyone who joined before the rules changed. The only thing worth catching
 *  before a round trip is an address that cannot be one. */
export default function SignIn() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<{ email?: boolean }>({});

  const emailBad = useMemo(() => emailError(form.email), [form.email]);
  const ready = !emailBad && form.password.length > 0;

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!ready) { setTouched({ email: true }); return; }
    setBusy(true);
    const r = await login(form.email.trim(), form.password);
    setBusy(false);
    if (r.ok === false) { toast(r.message ?? "Something went wrong.", { tone: "bad" }); return; }
    // The password was right and the account has a second step. Nothing is
    // stored yet — there is no session until the code checks out.
    if (r.ok === "mfa") {
      router.push({ pathname: "/twostep", params: { challenge: r.challenge } });
      return;
    }
    router.replace("/(tabs)/home");
  };

  return (
    <AuthShell
      title="Welcome Back"
      sub="Sign in to pick up where you left off."
      footer={
        <>
          <Button label="Sign in" onPress={submit} loading={busy} />
          <Pressable onPress={() => router.replace("/signup")} hitSlop={8}>
            <Txt variant="bodySmall" color={colors.inkMuted} center>
              New here?{" "}
              <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
                Create an account
              </Txt>
            </Txt>
          </Pressable>
        </>
      }
    >
      <SocialAuth
        onDone={(r) => {
          if (r.ok !== true) return;
          toast(`Welcome${r.created ? "" : " back"}, ${r.session.name.split(" ")[0]}.`, {
            tone: "good",
          });
          router.replace("/(tabs)/home");
        }}
      />

      <View style={s.form}>
        <Field
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          onBlur={() => form.email.trim() && setTouched({ email: true })}
          error={touched.email ? emailBad ?? undefined : undefined}
          icon="mail"
          reserve
          keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          textContentType="emailAddress" placeholder="alex@example.com.au"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          icon="lock" secure
          reserve
          autoComplete="current-password" textContentType="password"
          placeholder="Your password"
          returnKeyType="go" onSubmitEditing={submit}
          // On the label row rather than a fourth line under a three-line
          // stack: down there it right-aligned to nothing and pushed the
          // button away from the fields it belongs to.
          action={
            <Pressable
              onPress={() =>
                router.push({ pathname: "/forgot", params: { email: form.email.trim() } })
              }
              hitSlop={10}
            >
              <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
                Forgot password?
              </Txt>
            </Pressable>
          }
        />
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  // space.md, not lg: every field now carries its own reserved error line, so
  // a 16pt gap on top of that reads as fields drifting apart.
  form: { gap: space.md, marginTop: space.lg },
});
