import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Note } from "../../components/Note";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { Bone } from "../../components/Skeleton";
import {
  attach, getDispute, reply, withdraw, STATUS_LABEL,
  type Dispute, type Event,
} from "../../lib/disputes";
import { useSession } from "../../lib/session";
import { colors, radius, space, type } from "../../theme";

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
};

export default function DisputeThread() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [data, setData] = useState<{ dispute: Dispute; events: Event[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const r = await getDispute(String(id));
    setData(r);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Screen back>
        <Bone h={28} w="60%" />
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Bone h={92} r={radius.lg} />
          <Bone h={120} r={radius.lg} />
          <Bone h={120} r={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen back>
        <Txt variant="display">Not Found</Txt>
        <Note tone="info" icon="shield">
          This dispute doesn&rsquo;t exist, or it isn&rsquo;t one of yours.
        </Note>
      </Screen>
    );
  }

  const { dispute: d, events } = data;
  const me = session?.userId;
  const iRaised = me === d.raised_by;
  const live = d.status === "open" || d.status === "answered";

  const send = async () => {
    if (!draft.trim() || !id) return;
    setBusy(true);
    const r = await reply(String(id), draft.trim());
    setBusy(false);
    if (!r.ok) { toast(r.message ?? "That didn't send.", { tone: "bad" }); return; }
    setDraft("");
    load();
  };

  const addPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast("Photo access is off. Turn it on in Settings to add evidence.", { tone: "bad" });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.9, allowsMultipleSelection: true, selectionLimit: 6,
    });
    if (r.canceled) return;
    setBusy(true);
    const n = await attach(String(id), r.assets.map((a) => a.uri), draft.trim() || null);
    setBusy(false);
    if (!n) { toast("Those photos didn't upload. Try again.", { tone: "bad" }); return; }
    setDraft("");
    toast(`${n} photo${n === 1 ? "" : "s"} added.`, { tone: "good" });
    load();
  };

  const drop = async () => {
    setBusy(true);
    const r = await withdraw(String(id));
    setBusy(false);
    if (!r.ok) { toast(r.message ?? "That didn't work.", { tone: "bad" }); return; }
    toast("Dispute withdrawn.", { tone: "good" });
    load();
  };

  return (
    <Screen
      back
      footer={
        live ? (
          <View style={s.compose}>
            <Pressable onPress={addPhotos} hitSlop={8} style={s.attach}>
              <Icon name="photo" size={19} color={colors.inkMuted} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add to the record…"
              placeholderTextColor={colors.inkFaint}
              multiline
              style={s.input}
              onSubmitEditing={send}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || busy}
              style={[s.send, (!draft.trim() || busy) && { opacity: 0.4 }]}
            >
              <Icon name="offer" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        ) : undefined
      }
    >
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Txt variant="display" numberOfLines={2}>{d.card_name ?? "This Sale"}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
            You opened this {iRaised ? "" : "against you "}
            {when(d.created_at).toLowerCase()}
          </Txt>
        </View>
        {d.image_url && <Image source={{ uri: d.image_url }} style={s.art} />}
      </View>

      <StatusBar status={d.status} />

      {d.status === "resolved" && (
        <Note tone={d.outcome?.includes("refund") ? "good" : "info"} icon="shield">
          {d.outcome_note ??
            `Settled — ${(d.outcome ?? "").replace(/-/g, " ")}.`}
        </Note>
      )}
      {d.status === "withdrawn" && (
        <Note tone="info" icon="shield">
          This was withdrawn. If it&rsquo;s still unresolved you can open a new one.
        </Note>
      )}

      <View style={s.thread}>
        {events.length === 0 ? (
          <Txt variant="bodySmall" color={colors.inkFaint}>
            Nothing added yet.
          </Txt>
        ) : (
          events.map((e) => <EventRow key={e.event_id} e={e} mine={e.author_id === me} />)
        )}
      </View>

      {live && iRaised && (
        <Pressable onPress={drop} style={s.withdraw} disabled={busy}>
          <Txt variant="button" color={colors.inkMuted}>Withdraw this dispute</Txt>
        </Pressable>
      )}
      {live && !iRaised && (
        <Note tone="accent" icon="shield">
          Answer with what you know and any photographs you have. A dispute with no
          reply is decided on what the other side said.
        </Note>
      )}
    </Screen>
  );
}

/** Where it is, as three steps rather than a word.
 *
 *  "Answered" told nobody what happens next. This says which of the three
 *  things has happened and leaves the rest visibly ahead. */
function StatusBar({ status }: { status: Dispute["status"] }) {
  if (status === "withdrawn") {
    return (
      <View style={s.statusFlat}>
        <Txt variant="button" color={colors.inkMuted}>{STATUS_LABEL.withdrawn}</Txt>
      </View>
    );
  }
  const at = status === "open" ? 0 : status === "answered" ? 1 : 2;
  const steps = ["Opened", "Both sides heard", "Settled"];
  return (
    <View style={s.steps}>
      {steps.map((label, i) => (
        <View key={label} style={{ flex: 1, gap: 6 }}>
          <View style={[s.track, i <= at && s.trackOn]} />
          <Txt variant="bodySmall" color={i <= at ? colors.ink : colors.inkFaint}>
            {label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function EventRow({ e, mine }: { e: Event; mine: boolean }) {
  if (e.kind === "status") {
    return (
      <View style={s.systemRow}>
        <Icon name="verified" size={14} color={colors.inkFaint} />
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>{e.body}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint}>{when(e.created_at)}</Txt>
      </View>
    );
  }
  return (
    <View style={[s.event, mine && s.eventMine]}>
      <View style={s.eventHead}>
        <Avatar name={mine ? "You" : "Them"} size={22} />
        <Txt variant="button">{mine ? "You" : "The other side"}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginLeft: "auto" }}>
          {when(e.created_at)}
        </Txt>
      </View>
      {e.body ? <Txt variant="body" color={colors.ink}>{e.body}</Txt> : null}
      {e.photos?.length ? (
        <View style={s.evidence}>
          {e.photos.map((u) => (
            <Image key={u} source={{ uri: u }} style={s.evidenceImg} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  art: { width: 52, height: 73, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  steps: { flexDirection: "row", gap: space.sm, marginTop: space.lg, marginBottom: space.md },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  trackOn: { backgroundColor: colors.ink },
  statusFlat: {
    marginTop: space.lg, marginBottom: space.md, paddingVertical: space.sm,
    alignItems: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSunk,
  },
  thread: { gap: space.md, marginTop: space.lg },
  event: {
    padding: space.md, gap: space.sm,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  eventMine: { backgroundColor: colors.accentWash, borderColor: colors.accentLine },
  eventHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  systemRow: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingVertical: space.sm, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  evidence: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  evidenceImg: {
    width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  withdraw: {
    marginTop: space.xl, height: 48, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
  },
  compose: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  attach: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: space.md, paddingTop: 12,
    ...type.body, color: colors.ink,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.surface,
  },
  send: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, backgroundColor: colors.ink,
  },
});
