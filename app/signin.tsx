import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { useToast } from "../components/Toast";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
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
    if (!r.ok) { toast(r.message ?? "Something went wrong.", { tone: "bad" }); return; }
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
      <View style={s.social}>
        <SocialButton label="Apple" icon={<AntDesign name="apple" size={17} color={colors.ink} />} />
        <SocialButton label="Google" icon={<AntDesign name="google" size={16} color="#DB4437" />} />
      </View>

      <View style={s.divider}>
        <View style={s.rule} />
        <Txt variant="bodySmall" color={colors.inkFaint}>or with your details</Txt>
        <View style={s.rule} />
      </View>

      <View style={s.form}>
        <Field
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          onBlur={() => form.email.trim() && setTouched({ email: true })}
          error={touched.email ? emailBad ?? undefined : undefined}
          icon="mail"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          textContentType="emailAddress" placeholder="alex@example.com.au"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          icon="lock" secure
          autoComplete="current-password" textContentType="password"
          placeholder="Your password"
        />
        <Pressable hitSlop={8} style={{ alignSelf: "flex-end" }}>
          <Txt variant="bodySmall" color={colors.ink}>Forgot password?</Txt>
        </Pressable>
      </View>
    </AuthShell>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [s.social1, pressed && { opacity: 0.7 }]}>
      {icon}
      <Txt variant="button">{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  social: { flexDirection: "row", gap: space.md, marginTop: space.xxl },
  social1: {
    flex: 1, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: space.sm, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.fieldLine, backgroundColor: colors.surface,
  },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.xl },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  form: { gap: space.lg },
});
