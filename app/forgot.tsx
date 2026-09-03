import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Icon } from "../components/Icon";
import { emailError } from "../lib/validate";
import { forgotPassword } from "../lib/auth";
import { colors, radius, space } from "../theme";

/** Ask for a reset link.
 *
 *  The screen never says whether the address is registered, because the server
 *  does not tell it — an answer that varies turns this form into a way to test
 *  which addresses hold accounts. So the confirmation is deliberately worded
 *  as a conditional, and it is the same screen either way. */
export default function Forgot() {
  const router = useRouter();
  // Carried over from the sign-in form, so nobody retypes an address they just
  // typed one screen ago.
  const { email: prefill } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefill ?? "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const bad = useMemo(() => emailError(email), [email]);

  const submit = async () => {
    if (bad) { setTouched(true); return; }
    setBusy(true);
    const message = await forgotPassword(email.trim());
    setBusy(false);
    setSent(message);
  };

  if (sent) {
    return (
      <AuthShell
        title="Check Your Inbox"
        sub="The link works once, and stops working in 30 minutes."
        footer={
          <>
            <Button label="Back to sign in" onPress={() => router.replace("/signin")} />
            <Pressable onPress={() => setSent(null)} hitSlop={8}>
              <Txt variant="bodySmall" color={colors.inkMuted} center>
                Wrong address?{" "}
                <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
                  Try another
                </Txt>
              </Txt>
            </Pressable>
          </>
        }
      >
        <View style={s.sentCard}>
          <View style={s.sentIcon}>
            <Icon name="messages" size={22} color={colors.onAccent} />
          </View>
          <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.md }}>
            {sent}
          </Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: space.sm }}>
            Nothing after a few minutes? Look in spam, and check the address is the one
            you signed up with.
          </Txt>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot Password"
      sub="We'll email you a link to choose a new one."
      footer={
        <>
          <Button label="Send the link" onPress={submit} loading={busy} />
          <Pressable onPress={() => router.replace("/signin")} hitSlop={8}>
            <Txt variant="bodySmall" color={colors.inkMuted} center>
              Remembered it?{" "}
              <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
                Sign in
              </Txt>
            </Txt>
          </Pressable>
        </>
      }
    >
      <View style={s.form}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => email.trim() && setTouched(true)}
          error={touched ? bad ?? undefined : undefined}
          icon="mail"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          textContentType="emailAddress" placeholder="alex@example.com.au"
          returnKeyType="send" onSubmitEditing={submit}
        />
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  form: { gap: space.lg, marginTop: space.xxl },
  sentCard: {
    marginTop: space.xxl, padding: space.xl, alignItems: "center",
    borderRadius: radius.lg, backgroundColor: colors.accentWash,
    borderWidth: 1, borderColor: colors.accentLine,
  },
  sentIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accent,
  },
});
