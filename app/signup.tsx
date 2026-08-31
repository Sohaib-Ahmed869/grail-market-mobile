import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Note } from "../components/Note";
import { colors, radius, space } from "../theme";
import { isClean, validateSignUp, type SignUpForm } from "../lib/validate";

/** Create account.
 *
 *  The name field says "as it appears on your ID" and the note under it says
 *  why. A nickname typed here is the single most common cause of a failed
 *  identity check later, and it is far cheaper to say so now than to reject
 *  someone after they have photographed a licence. */
export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState<SignUpForm>({
    name: "", email: "", phone: "", password: "", confirm: "",
  });
  // A field is only marked wrong once the user has left it. Validating while
  // someone is still typing tells them their email is invalid at "a@", which
  // is true and useless, and it trains people to ignore the red.
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  const errors = useMemo(() => validateSignUp(form), [form]);
  const ready = isClean(errors);
  const set = (k: keyof SignUpForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: keyof SignUpForm) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof SignUpForm) => (touched[k] ? errors[k] ?? undefined : undefined);

  const submit = () => {
    if (!ready) {
      // show everything that is wrong at once rather than one field at a time
      setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
      return;
    }
    router.push("/sms");
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button label="Continue" onPress={submit} />
          <Txt variant="bodySmall" color={colors.inkFaint} center style={{ paddingHorizontal: space.md }}>
            By continuing you agree to the Terms and the Marketplace Conduct Rules.
          </Txt>
        </>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Txt variant="display">Create your account</Txt>
        <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
          Two minutes now. You&rsquo;ll verify your ID before you buy or sell.
        </Txt>

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
            label="Full name — as it appears on your ID"
            value={form.name} onChangeText={set("name")} onBlur={blur("name")}
            error={err("name")}
            autoCapitalize="words" autoComplete="name" textContentType="name"
            placeholder="Alex Barakat"
          />
          <Field
            label="Email" value={form.email} onChangeText={set("email")} onBlur={blur("email")}
            error={err("email")}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            textContentType="emailAddress" placeholder="alex@example.com.au"
          />
          <Field
            label="Mobile number" value={form.phone} onChangeText={set("phone")} onBlur={blur("phone")}
            error={err("phone")}
            keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
            placeholder="0412 884 019"
          />
          <Field
            label="Password" value={form.password} onChangeText={set("password")} onBlur={blur("password")}
            error={err("password")} hint="At least 10 characters."
            secure autoComplete="new-password" textContentType="newPassword"
            placeholder="At least 10 characters"
          />
          <Field
            label="Confirm password" value={form.confirm} onChangeText={set("confirm")} onBlur={blur("confirm")}
            error={err("confirm")}
            secure autoComplete="new-password" textContentType="newPassword"
            placeholder="Type it again"
          />
        </View>

        <View style={{ marginTop: space.lg }}>
          <Note>
            Your name has to match your ID later. Mismatches are the most common reason a
            check fails.
          </Note>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SocialButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [s.social1, pressed && { opacity: 0.7 }]}
    >
      {icon}
      <Txt variant="button">{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  social: { flexDirection: "row", gap: space.md, marginTop: space.xxl },
  social1: {
    flex: 1, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: space.sm, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.lineStrong, backgroundColor: colors.surface,
  },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.xl },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  form: { gap: space.lg },
});
