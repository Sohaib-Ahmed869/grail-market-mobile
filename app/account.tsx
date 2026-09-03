import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Icon } from "../components/Icon";
import { Note } from "../components/Note";
import { useToast } from "../components/Toast";
import { Bone } from "../components/Skeleton";
import {
  changePassword, confirmMfa, disableMfa, startMfa, updateProfile,
} from "../lib/auth";
import { get } from "../lib/api";
import { useSession } from "../lib/session";
import { colors, radius, space, type } from "../theme";

type Me = { name: string; email: string; phone: string | null; mfa_enabled?: boolean };

/** Everything about the account that is not the collection.
 *
 *  Three sections, each of which commits on its own. A single "Save" over the
 *  whole page means changing a phone number and a password in one press, and
 *  one failure then leaves you guessing which half landed. */
export default function Account() {
  const session = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await get<{ user?: Me }>("/auth/me");
      setMe(r.user ?? null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!session) {
    return (
      <Screen back>
        <Txt variant="display">Your Account</Txt>
        <Note tone="info" icon="lock">Sign in to manage your account.</Note>
        <Button label="Sign in" onPress={() => router.replace("/signin")} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  return (
    <Screen back>
      <Txt variant="display">Your Account</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        {session.email}
      </Txt>

      {loading ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Bone h={150} r={radius.lg} />
          <Bone h={190} r={radius.lg} />
          <Bone h={130} r={radius.lg} />
        </View>
      ) : (
        <>
          <Details me={me} onSaved={load} />
          <Password />
          <TwoStep on={Boolean(me?.mfa_enabled)} onChanged={load} />
        </>
      )}
    </Screen>
  );
}

// ---- your details ----------------------------------------------------------

function Details({ me, onSaved }: { me: Me | null; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== (me?.name ?? "") || phone.trim() !== (me?.phone ?? "");

  const save = async () => {
    setBusy(true);
    const r = await updateProfile({ name: name.trim(), phone: phone.trim() || null });
    setBusy(false);
    if (!r.ok) { toast(r.message ?? "Check your details.", { tone: "bad" }); return; }
    toast("Details saved.", { tone: "good" });
    onSaved();
  };

  return (
    <Section title="Your Details" icon="profile">
      <Field label="Name" value={name} onChangeText={setName} icon="user" placeholder="Alex Nguyen" />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        icon="phone"
        keyboardType="phone-pad"
        placeholder="04XX XXX XXX"
        hint="Used for delivery and for the buyer to reach you on a sale."
      />
      {/* Email is not editable. Changing the address on an account is how an
          account gets taken over, and doing it safely means confirming the new
          address before it takes effect — which does not exist yet. */}
      <Txt variant="bodySmall" color={colors.inkFaint}>
        To change your email address, get in touch — we confirm the new one before it
        takes effect.
      </Txt>
      <Button label="Save details" onPress={save} loading={busy} disabled={!dirty} kind="secondary" />
    </Section>
  );
}

// ---- password --------------------------------------------------------------

function Password() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = current.length > 0 && next.length >= 10;

  const save = async () => {
    setBusy(true);
    const r = await changePassword(current, next);
    setBusy(false);
    if (!r.ok) { toast(r.message ?? "That didn't work.", { tone: "bad" }); return; }
    setCurrent(""); setNext(""); setOpen(false);
    toast("Password changed. We've emailed you about it.", { tone: "good" });
  };

  return (
    <Section title="Password" icon="lock">
      {!open ? (
        <Button label="Change password" kind="secondary" onPress={() => setOpen(true)} />
      ) : (
        <>
          <Field
            label="Current password" value={current} onChangeText={setCurrent}
            icon="lock" secure autoComplete="current-password" placeholder="Your password now"
          />
          <Field
            label="New password" value={next} onChangeText={setNext}
            icon="lock" secure autoComplete="new-password"
            error={next.length > 0 && next.length < 10 ? "Use at least 10 characters." : undefined}
            placeholder="At least 10 characters"
          />
          <View style={s.row}>
            <Button label="Cancel" kind="ghost" onPress={() => setOpen(false)} full={false} style={{ flex: 1 }} />
            <Button label="Save" onPress={save} loading={busy} disabled={!ready} full={false} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </Section>
  );
}

// ---- two-step --------------------------------------------------------------

function TwoStep({ on, onChanged }: { on: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [stage, setStage] = useState<"idle" | "enrolling" | "codes" | "off">("idle");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setBusy(true);
    const r = await startMfa();
    setBusy(false);
    if (!r.ok) { toast(r.message, { tone: "bad" }); return; }
    setSecret(r.secret);
    setStage("enrolling");
  };

  const confirm = async () => {
    setBusy(true);
    const r = await confirmMfa(code);
    setBusy(false);
    if (!r.ok) { toast(r.message, { tone: "bad" }); setCode(""); return; }
    setCodes(r.recoveryCodes);
    setStage("codes");
    onChanged();
  };

  const turnOff = async () => {
    setBusy(true);
    const r = await disableMfa(password);
    setBusy(false);
    if (!r.ok) { toast(r.message ?? "That didn't work.", { tone: "bad" }); return; }
    setPassword(""); setStage("idle");
    toast("Two-step verification is off.", { tone: "good" });
    onChanged();
  };

  return (
    <Section title="Two-Step Verification" icon="verified">
      {stage === "codes" ? (
        <>
          <Note tone="accent" icon="shield">
            Save these somewhere safe. Each works once, and this is the only time
            they&rsquo;re shown — we store them scrambled and can&rsquo;t show them again.
          </Note>
          <View style={s.codes}>
            {codes.map((c) => (
              <Txt key={c} selectable style={s.code}>{c}</Txt>
            ))}
          </View>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            Press and hold to select and copy them.
          </Txt>
          <Button label="I've saved them" onPress={() => setStage("idle")} />
        </>
      ) : stage === "enrolling" ? (
        <>
          <Txt variant="body" color={colors.inkMuted}>
            Add this key to an authenticator app — Google Authenticator, 1Password, or
            whichever you use — then enter the code it shows.
          </Txt>
          <View style={s.secret}>
            <Txt selectable style={s.secretText}>
              {secret.replace(/(.{4})/g, "$1 ").trim()}
            </Txt>
            <Icon name="key" size={16} color={colors.inkMuted} />
          </View>
          <Field
            label="Code from the app" value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            icon="hash" keyboardType="number-pad" placeholder="123456"
          />
          <View style={s.row}>
            <Button label="Cancel" kind="ghost" full={false} style={{ flex: 1 }}
              onPress={() => { setStage("idle"); setCode(""); }} />
            <Button label="Turn on" onPress={confirm} loading={busy} full={false}
              disabled={code.length !== 6} style={{ flex: 1 }} />
          </View>
        </>
      ) : stage === "off" ? (
        <>
          <Field
            label="Your password" value={password} onChangeText={setPassword}
            icon="lock" secure placeholder="Confirm it's you"
          />
          <View style={s.row}>
            <Button label="Keep it on" kind="ghost" full={false} style={{ flex: 1 }}
              onPress={() => { setStage("idle"); setPassword(""); }} />
            <Button label="Turn off" onPress={turnOff} loading={busy} full={false}
              disabled={!password} style={{ flex: 1 }} />
          </View>
        </>
      ) : on ? (
        <>
          <View style={s.onRow}>
            <View style={s.onDot} />
            <Txt variant="body" color={colors.ink} style={{ flex: 1 }}>
              On. You&rsquo;ll be asked for a code when you sign in.
            </Txt>
          </View>
          <Button label="Turn off" kind="ghost" onPress={() => setStage("off")} />
        </>
      ) : (
        <>
          <Txt variant="body" color={colors.inkMuted}>
            Ask for a code from your phone as well as your password. Worth turning on
            once your collection is worth something to somebody else.
          </Txt>
          <Button label="Set up two-step" kind="secondary" onPress={begin} loading={busy} />
        </>
      )}
    </Section>
  );
}

// ---- shared ----------------------------------------------------------------

function Section({
  title, icon, children,
}: { title: string; icon: React.ComponentProps<typeof Icon>["name"]; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Icon name={icon} size={16} color={colors.inkMuted} />
        <Txt variant="h3">{title}</Txt>
      </View>
      <View style={{ gap: space.md }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    marginTop: space.xl, padding: space.lg, gap: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  onRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  onDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.up },
  secret: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  secretText: { ...type.body, letterSpacing: 1.5, color: colors.ink },
  codes: {
    flexDirection: "row", flexWrap: "wrap", gap: space.sm,
    padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  code: { ...type.bodySmall, letterSpacing: 1, color: colors.ink, width: "47%" },
});
