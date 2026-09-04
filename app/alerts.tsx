import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, Switch, View } from "react-native";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Note } from "../components/Note";
import { Bone } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import {
  notificationPrefs, setNotificationPref,
} from "../lib/notifications";
import { disablePush, enablePush, pushStatus, type PushStatus } from "../lib/push";
import { colors, radius, space } from "../theme";

/** What each kind is, in the words of the person receiving it.
 *
 *  Keyed by the server's own kind strings. A kind that arrives without an
 *  entry here still gets a row — the server decides what can push, and a
 *  switch missing because the app has not been updated is a notification
 *  nobody can turn off. */
const SAY: Record<string, { title: string; body: string }> = {
  offer: {
    title: "Offers on your cards",
    body: "Somebody offers on something you have for sale.",
  },
  "offer-settled": {
    title: "Answers to your offers",
    body: "A seller accepts, counters or declines what you offered.",
  },
  message: {
    title: "Messages",
    body: "A reply in a conversation about a card.",
  },
  listing: {
    title: "Your listings",
    body: "One goes live, or comes back to you for a change.",
  },
  price: {
    title: "Price alerts",
    body: "A card you follow crosses the rule you set on it.",
  },
};

const titleCase = (k: string) =>
  k.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Notifications.
 *
 *  Two separate things, and keeping them separate is most of the screen. The
 *  OS permission decides whether this phone can be interrupted at all; the
 *  switches decide what is worth interrupting for. Somebody who has never been
 *  asked, somebody who said no a year ago, and somebody who is set up but does
 *  not want to hear about messages are three different states with three
 *  different answers, and a single "Notifications: on/off" toggle tells all
 *  three of them the same wrong thing.
 *
 *  Turning a kind off silences the buzz, never the record — the bell in the
 *  header still lists it. That is the whole reason it is safe to turn one off.
 */
export default function Alerts() {
  const toast = useToast();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [prefs, setPrefs] = useState<{ kinds: string[]; muted: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  // Which row is mid-flight, so its switch can be held rather than the whole
  // list going dead while one save is in the air.
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([pushStatus(), notificationPrefs()]);
    setStatus(s);
    setPrefs(p);
  }, []);
  useEffect(() => { load(); }, [load]);

  const turnOn = async () => {
    setBusy(true);
    const ok = await enablePush();
    setBusy(false);
    if (!ok) {
      // enablePush answers false both for "they said no" and "this build
      // cannot", so ask the OS again rather than guessing which it was.
      setStatus(await pushStatus());
      toast("Notifications weren't turned on.", { tone: "bad" });
      return;
    }
    setStatus("granted");
    toast("Notifications are on for this device.");
  };

  const turnOff = async () => {
    setBusy(true);
    const ok = await disablePush();
    setBusy(false);
    if (!ok) return toast("Could not turn those off.", { tone: "bad" });
    // The OS permission is untouched and still says granted, so the screen
    // tracks our own registration separately from it.
    setStatus("undetermined");
    toast("This device won't be sent notifications.", { tone: "info" });
  };

  const toggle = async (kind: string, on: boolean) => {
    if (!prefs) return;
    setSaving(kind);
    // Moved straight away. A switch that waits for a round trip before it
    // moves reads as broken, and this is undone by the same tap if it fails.
    const before = prefs.muted;
    const next = on ? before.filter((k) => k !== kind) : [...before, kind];
    setPrefs({ ...prefs, muted: next });

    const r = await setNotificationPref(kind, on);
    setSaving(null);
    if (r.muted) setPrefs({ ...prefs, muted: r.muted });
    else {
      setPrefs({ ...prefs, muted: before });
      toast(r.message ?? "Could not save that.", { tone: "bad" });
    }
  };

  const on = status === "granted";

  return (
    <Screen back>
      <Txt variant="display">Notifications</Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        What is worth a buzz, and what can wait until you open the app.
      </Txt>

      {/* ---- the permission, which everything else depends on -------------- */}
      <View style={s.card}>
        {status === null ? (
          <Bone h={64} r={radius.md} />
        ) : status === "unavailable" ? (
          <>
            <Head icon="notify" title="Not available here" />
            <Txt variant="body" color={colors.inkMuted}>
              This build can&rsquo;t receive notifications — a simulator, or a
              development build made before they were added. Everything below
              still saves, and takes effect on a device that can.
            </Txt>
          </>
        ) : status === "denied" ? (
          <>
            <Head icon="notify" title="Turned off in Settings" />
            <Txt variant="body" color={colors.inkMuted}>
              iOS only asks once, so this has to be changed where you changed it.
            </Txt>
            <Button label="Open Settings" kind="secondary"
              onPress={() => Linking.openSettings()} />
          </>
        ) : on ? (
          <>
            <View style={s.onRow}>
              <View style={s.dot} />
              <Txt variant="body" style={{ flex: 1 }}>On for this device.</Txt>
            </View>
            <Button label="Stop sending to this device" kind="ghost"
              onPress={turnOff} loading={busy} />
          </>
        ) : (
          <>
            <Head icon="notify" title="Off" />
            <Txt variant="body" color={colors.inkMuted}>
              Turn these on and we&rsquo;ll tell you when an offer lands or a card
              you follow moves. Nothing else.
            </Txt>
            <Button label="Turn on notifications" kind="secondary"
              onPress={turnOn} loading={busy} />
          </>
        )}
      </View>

      {/* ---- what to be told about ---------------------------------------- */}
      <Txt variant="h2" style={{ marginTop: space.xxl }}>Tell me about</Txt>

      <View style={[s.card, { marginTop: space.md, gap: 0 }]}>
        {prefs === null ? (
          <Bone h={180} r={radius.md} />
        ) : (
          prefs.kinds.map((kind, i) => {
            const words = SAY[kind] ?? { title: titleCase(kind), body: "" };
            const allowed = !prefs.muted.includes(kind);
            return (
              <View key={kind} style={[s.row, i > 0 && s.divided]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">{words.title}</Txt>
                  {words.body !== "" && (
                    <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
                      {words.body}
                    </Txt>
                  )}
                </View>
                <Switch
                  value={allowed}
                  disabled={saving === kind}
                  onValueChange={(v) => toggle(kind, v)}
                  trackColor={{ false: colors.fieldLine, true: colors.ink }}
                  thumbColor={colors.surface}
                  ios_backgroundColor={colors.fieldLine}
                />
              </View>
            );
          })
        )}
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note>
          Turning one off stops the buzz, not the record — it still shows up
          under the bell when you open the app.
        </Note>
      </View>
    </Screen>
  );
}

function Head({ icon, title }: { icon: "notify"; title: string }) {
  return (
    <View style={s.head}>
      <Icon name={icon} size={17} color={colors.inkMuted} />
      <Txt variant="h3">{title}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: space.xl, padding: space.lg, gap: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  onRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.up },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
});
