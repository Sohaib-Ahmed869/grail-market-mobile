import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useToast } from "../components/Toast";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { SocialAuth } from "../components/SocialAuth";
import { PhoneField } from "../components/PhoneField";
import { Note } from "../components/Note";
import { Steps } from "../components/Steps";
import { colors, radius, space } from "../theme";
import { isClean, passwordStrength, validateSignUp, type SignUpForm } from "../lib/validate";
import { sendCode } from "../lib/phoneauth";
import { register } from "../lib/auth";
import { DEFAULT_COUNTRY } from "../lib/countries";
import { setPending } from "../lib/signupsession";

/** Create account.
 *
 *  The name field says "as it appears on your ID" and the note under it says
 *  why. A nickname typed here is the single most common cause of a failed
 *  identity check later, and it is far cheaper to say so now than to reject
 *  someone after they have photographed a licence. */
export default function SignUp() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<SignUpForm>({
    name: "", email: "", phone: "", password: "", confirm: "",
    country: DEFAULT_COUNTRY,
  });
  // A field is only marked wrong once the user has left it. Validating while
  // someone is still typing tells them their email is invalid at "a@", which
  // is true and useless, and it trains people to ignore the red.
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  const errors = useMemo(() => validateSignUp(form), [form]);
  const ready = isClean(errors);
  const set = (k: keyof SignUpForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Leaving a field you never typed in is not a mistake, so it does not go
  // red. Tabbing through an empty form used to light every field at once,
  // which is the fastest way to teach someone that the red means nothing.
  // Submit still marks everything — that is the moment it IS a mistake.
  const blur = (k: ErrKey) => () => {
    if (String(form[k]).trim()) setTouched((t) => ({ ...t, [k]: true }));
  };
  type ErrKey = keyof ReturnType<typeof validateSignUp>;
  const err = (k: ErrKey) => (touched[k] ? errors[k] ?? undefined : undefined);

  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!ready) {
      // show everything that is wrong at once rather than one field at a time
      setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
      return;
    }
    setSending(true);

    // The account is created first. Without it the SMS code, the identity
    // check and the subscription all attach to nobody — which is exactly what
    // happened while this was a placeholder id.
    const acct = await register({
      email: form.email.trim(), name: form.name.trim(),
      phone: form.phone.trim(), password: form.password,
    });
    if (!acct.ok) { setSending(false); toast(acct.message ?? "Something went wrong.", { tone: "bad" }); return; }

    // The text goes out from here, not from the code screen. Landing on a
    // screen that says "we sent a code" before anything has been sent is how
    // people end up waiting for a message that was never going to arrive.
    const r = await sendCode(form.phone, form.country);
    setSending(false);
    if (!r.ok) { toast(r.message ?? "Something went wrong.", { tone: "bad" }); return; }
    setPending(form.phone, r.session);
    router.push("/sms");
  };

  return (
    <AuthShell
      title="Create Your Account"
      sub="Two minutes now. You'll verify your ID before you buy or sell."
      footer={
        <>
          <Button label="Continue" onPress={submit} loading={sending} />
          {/* The place consent is actually given is the place the documents
              have to be reachable from — not buried three taps into a profile
              somebody only reaches after agreeing. */}
          <Txt variant="bodySmall" color={colors.inkFaint} center style={{ paddingHorizontal: space.md }}>
            By continuing you agree to the{" "}
            <Txt
              variant="bodySmall"
              color={colors.ink}
              style={{ fontWeight: "600" }}
              onPress={() => router.push("/legal/terms")}
            >
              Terms
            </Txt>
            {" "}and the{" "}
            <Txt
              variant="bodySmall"
              color={colors.ink}
              style={{ fontWeight: "600" }}
              onPress={() => router.push("/legal/privacy")}
            >
              Privacy Policy
            </Txt>
            .
          </Txt>
        </>
      }
    >
      <>
        <View style={{ marginTop: space.lg }}>
          <Steps step={1} label="Your details" />
        </View>

        <SocialAuth
          onDone={(r) => {
            if (r.ok !== true) return;
            toast(`Welcome, ${r.session.name.split(" ")[0]}.`, { tone: "good" });
            router.replace("/(tabs)/home");
          }}
        />

        <View style={s.form}>
          <Field
            label="Full name — as it appears on your ID"
            value={form.name} onChangeText={set("name")} onBlur={blur("name")}
            error={err("name")}
            icon="user"
            reserve
            autoCapitalize="words" autoComplete="name" textContentType="name"
            placeholder="Alex Barakat"
          />
          <Field
            label="Email" value={form.email} onChangeText={set("email")} onBlur={blur("email")}
            error={err("email")}
            icon="mail"
            reserve
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            textContentType="emailAddress" placeholder="alex@example.com.au"
          />
          <PhoneField
            label="Mobile number"
            value={form.phone}
            country={form.country}
            onChangeText={set("phone")}
            onChangeCountry={(c) => setForm((f) => ({ ...f, country: c }))}
            onBlur={blur("phone")}
            error={err("phone")}
          />
          <Field
            label="Password" value={form.password} onChangeText={set("password")} onBlur={blur("password")}
            error={err("password")} hint="Length beats symbols. Three words is plenty."
            icon="lock" strength={passwordStrength(form.password)}
            reserve
            secure autoComplete="new-password" textContentType="newPassword"
            placeholder="At least 10 characters"
          />
          <Field
            label="Confirm password" value={form.confirm} onChangeText={set("confirm")} onBlur={blur("confirm")}
            error={err("confirm")}
            icon="check-circle"
            reserve
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
      </>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  form: { gap: space.md, marginTop: space.lg },
});
