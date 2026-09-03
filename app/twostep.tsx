import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthShell } from "../components/AuthShell";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";
import { loginMfa } from "../lib/auth";
import { colors, radius, space, type } from "../theme";

/** Step two of signing in.
 *
 *  The password has already been checked; the challenge in the params carries
 *  that fact, so this screen never holds the password and cannot leak it. It
 *  expires in five minutes, which is why a stale one sends you back rather
 *  than sitting here failing. */
export default function TwoStep() {
  const { challenge } = useLocalSearchParams<{ challenge?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const input = useRef<TextInput>(null);

  const clean = recovery ? code.toUpperCase() : code.replace(/\D/g, "");
  const ready = recovery ? clean.replace(/-/g, "").length === 10 : clean.length === 6;

  const submit = async (value = clean) => {
    if (!challenge) { router.replace("/signin"); return; }
    setBusy(true);
    const r = await loginMfa(String(challenge), value);
    setBusy(false);
    if (r.ok !== true) {
      const message = r.ok === false ? r.message : "Sign in again.";
      toast(message, { tone: "bad" });
      setCode("");
      if (/took too long|sign in again/i.test(message)) router.replace("/signin");
      return;
    }
    router.replace("/(tabs)/home");
  };

  // Six boxes that are one input underneath. Six real inputs mean six focus
  // handlers, backspace that has to jump fields, and a paste that fills only
  // the first — this way the OS autofills a code in one go, as it expects to.
  const boxes = Array.from({ length: 6 }, (_, i) => clean[i] ?? "");

  return (
    <AuthShell
      title="Two-Step Check"
      sub={
        recovery
          ? "Enter one of the recovery codes you saved."
          : "Enter the 6-digit code from your authenticator app."
      }
      footer={
        <>
          <Button
            label={recovery ? "Use recovery code" : "Continue"}
            onPress={() => submit()}
            loading={busy}
            disabled={!ready}
          />
          <Pressable
            onPress={() => { setRecovery((v) => !v); setCode(""); }}
            hitSlop={8}
          >
            <Txt variant="bodySmall" color={colors.inkMuted} center>
              {recovery ? "Got your phone? " : "Lost your phone? "}
              <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
                {recovery ? "Use a code from the app" : "Use a recovery code"}
              </Txt>
            </Txt>
          </Pressable>
        </>
      }
    >
      {recovery ? (
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="A1B2C-3D4E5"
          placeholderTextColor={colors.inkFaint}
          style={s.recovery}
          returnKeyType="done"
          onSubmitEditing={() => ready && submit()}
        />
      ) : (
        <Pressable onPress={() => input.current?.focus()} style={s.boxes}>
          {boxes.map((ch, i) => (
            <View key={i} style={[s.box, i === clean.length && s.boxOn, ch !== "" && s.boxFull]}>
              <Txt variant="h2">{ch}</Txt>
            </View>
          ))}
          <TextInput
            ref={input}
            value={clean}
            onChangeText={(v) => {
              const digits = v.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              // Submit as soon as it is complete. Asking someone to type six
              // digits and then reach for a button is one step too many for a
              // code that expires in thirty seconds.
              if (digits.length === 6) submit(digits);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            style={s.hidden}
          />
        </Pressable>
      )}

      <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: space.lg }}>
        Codes change every 30 seconds. If yours keeps failing, check your phone&rsquo;s
        clock is set automatically.
      </Txt>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  boxes: { flexDirection: "row", gap: space.sm, marginTop: space.xxl, justifyContent: "center" },
  box: {
    width: 46, height: 58, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.fieldLine, backgroundColor: colors.surface,
  },
  // Focus is colour and shadow only. Changing the border WIDTH moves the box's
  // edge by half a pixel and the whole row shuffles as you type.
  boxOn: { borderColor: colors.ink, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  boxFull: { backgroundColor: colors.accentWash, borderColor: colors.accentLine },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  recovery: {
    marginTop: space.xxl, height: 58, textAlign: "center",
    ...type.h2, letterSpacing: 2, color: colors.ink,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.surface,
  },
});
