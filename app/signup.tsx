import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Note } from "../components/Note";
import { colors, radius, space } from "../theme";

/** Create account.
 *
 *  The name field says "as it appears on your ID" and the note under it says
 *  why. A nickname typed here is the single most common cause of a failed
 *  identity check later, and it is far cheaper to say so now than to reject
 *  someone after they have photographed a licence. */
export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const ready = form.name.trim().length > 1 && form.email.includes("@") && form.phone.length >= 8 && form.password.length >= 8;

  return (
    <Screen
      back
      footer={
        <>
          <Button label="Continue" disabled={!ready} onPress={() => router.push("/sms")} />
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
            value={form.name} onChangeText={set("name")}
            autoCapitalize="words" autoComplete="name" textContentType="name"
            placeholder="Alex Barakat"
          />
          <Field
            label="Email" value={form.email} onChangeText={set("email")}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            placeholder="alex@example.com.au"
          />
          <Field
            label="Mobile number" value={form.phone} onChangeText={set("phone")}
            keyboardType="phone-pad" autoComplete="tel" placeholder="0412 884 019"
          />
          <Field
            label="Password" value={form.password} onChangeText={set("password")}
            secure autoComplete="new-password" placeholder="At least 8 characters"
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
