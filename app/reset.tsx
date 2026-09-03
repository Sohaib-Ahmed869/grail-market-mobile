import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useToast } from "../components/Toast";
import { passwordStrength } from "../lib/validate";
import { resetPassword } from "../lib/auth";
import { colors, space } from "../theme";

/** Choose a new password, from the link in the email.
 *
 *  Signing in afterwards is not a separate step: the reset call returns a
 *  session, because a person who has just proved they control the address and
 *  set the password has done everything a sign-in would ask for, and sending
 *  them to a login form is asking them to type what they typed a second ago. */
export default function Reset() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = again.length > 0 && again !== password;
  const ready = password.length >= 10 && again === password && Boolean(token);

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const r = await resetPassword(String(token), password);
    setBusy(false);
    if (r.ok !== true) {
      toast(r.ok === false ? r.message : "Sign in to finish.", { tone: "bad" });
      if (r.ok === false) router.replace("/forgot");
      return;
    }
    toast("Password changed. You're signed in.", { tone: "good" });
    router.replace("/(tabs)/home");
  };

  if (!token) {
    return (
      <AuthShell
        title="Link Not Valid"
        sub="That link is missing something. Ask for a new one."
        footer={<Button label="Send a new link" onPress={() => router.replace("/forgot")} />}
      >
        <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.xxl }}>
          Reset links work once and expire after 30 minutes. If you opened this from an
          old email, the newest one is the one that works.
        </Txt>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="New Password"
      sub="Ten characters or more. You'll be signed in straight after."
      footer={<Button label="Save and sign in" onPress={submit} loading={busy} disabled={!ready} />}
    >
      <View style={s.form}>
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          error={tooShort ? "Use at least 10 characters." : undefined}
          icon="lock" secure strength={strength}
          autoComplete="new-password" textContentType="newPassword"
          placeholder="At least 10 characters"
        />
        <Field
          label="Type it again"
          value={again}
          onChangeText={setAgain}
          error={mismatch ? "These don't match." : undefined}
          icon="lock" secure
          autoComplete="new-password" textContentType="newPassword"
          placeholder="The same password"
          returnKeyType="done" onSubmitEditing={submit}
        />
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({ form: { gap: space.lg, marginTop: space.xxl } });
