import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, AppState, Pressable, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Loader } from "../../components/Loader";
import { Note } from "../../components/Note";
import { Icon } from "../../components/Icon";
import { Avatar } from "../../components/Avatar";
import { Reactions } from "../../components/Reactions";
import {
  messagesIn, reactTo, REACTIONS, sendMessage, threads,
  type Message, type Thread,
} from "../../lib/messages";
import { useSession } from "../../lib/session";
import { useToast } from "../../components/Toast";
import { colors, radius, space, type } from "../../theme";
import { aud } from "../../lib/fx";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });

const dayOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long" });
};

/** One conversation, about one card.
 *
 *  It polls while it is on screen and stops the moment it is not. A card
 *  marketplace does not need a socket held open for a conversation that gets
 *  four messages a day — but it does need the reply to arrive without
 *  pulling to refresh, which is what "not real time" actually meant. */
export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const toast = useToast();
  const scroller = useRef<ScrollView>(null);

  const [msgs, setMsgs] = useState<Message[] | undefined>(undefined);
  const [meta, setMeta] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);

  const pull = useCallback(async () => {
    const m = await messagesIn(String(id));
    // Only replace the list when something changed, so the scroll position
    // and any open reaction picker survive a poll that found nothing new.
    setMsgs((cur) => {
      if (cur && cur.length === m.length &&
          cur[cur.length - 1]?.message_id === m[m.length - 1]?.message_id &&
          JSON.stringify(cur.map((x) => x.reactions)) === JSON.stringify(m.map((x) => x.reactions))) {
        return cur;
      }
      return m;
    });
  }, [id]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    pull();
    threads().then((r) => {
      if (alive) setMeta(r.threads.find((t) => t.thread_id === String(id)) ?? null);
    });

    // Every three seconds while the screen is in front and the app is awake.
    // Polling a backgrounded app is battery spent on a screen nobody is
    // looking at.
    const timer = setInterval(() => {
      if (AppState.currentState === "active") pull();
    }, 3000);

    return () => { alive = false; clearInterval(timer); };
  }, [id, pull]));

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const r = await sendMessage(String(id), body);
    setBusy(false);
    if (r.error) { toast("That message didn't send.", { tone: "bad" }); return; }
    setText("");
    pull();
    if (r.masked && r.notice) Alert.alert("Removed from your message", r.notice);
  };

  const react = async (messageId: string, emoji: string) => {
    setPicking(null);
    const r = await reactTo(messageId, emoji);
    if (!r.error) pull();
  };

  const mine = (m: Message) => m.sender_id === session?.userId;

  return (
    <Screen
      back
      footer={
        <View style={s.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.inkFaint}
            multiline
            // Enter sends. submitBehavior keeps the keyboard up so a reply
            // and a follow-up are two taps, not two taps and a re-focus.
            submitBehavior="submit"
            onSubmitEditing={send}
            returnKeyType="send"
            style={s.input}
          />
          <Pressable
            onPress={send}
            disabled={busy || !text.trim()}
            style={[s.send, (!text.trim() || busy) && { opacity: 0.35 }]}
          >
            <Icon name="messages" size={18} color={colors.onPrimary} filled />
          </Pressable>
        </View>
      }
    >
      {meta && (
        <Pressable onPress={() => router.push(`/listing/${meta.listing_id}` as any)} style={s.header}>
          <Avatar name={meta.other_name ?? "member"} id={meta.other_avatar} size={38} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={1}>{meta.other_name ?? "Member"}</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
              {meta.card_name}
              {meta.grader ? ` · ${meta.grader} ${meta.grade ?? ""}` : ""}
              {" · "}{aud(Number(meta.price))}
            </Txt>
          </View>
          <Icon name="card" size={18} color={colors.inkFaint} />
        </Pressable>
      )}

      {msgs === undefined ? (
        <Loader fill />
      ) : msgs.length === 0 ? (
        <View style={{ marginTop: space.xl }}>
          <Note icon="message-circle">
            Nothing said yet. Ask about condition, postage or a pickup time — and keep it
            here: the record is what a dispute is decided on.
          </Note>
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          style={{ marginTop: space.md }}
          contentContainerStyle={{ gap: 6, paddingBottom: space.md }}
        >
          {msgs.map((m, i) => {
            const showDay = i === 0 || dayOf(m.created_at) !== dayOf(msgs[i - 1].created_at);

            if (m.kind === "event") {
              return (
                <View key={m.message_id}>
                  {showDay && <Day label={dayOf(m.created_at)} />}
                  <View style={s.event}>
                    <Icon name="offer" size={13} color={colors.accent} />
                    <Txt variant="bodySmall" color={colors.inkMuted}>{m.body}</Txt>
                  </View>
                </View>
              );
            }

            const own = mine(m);
            // A run of messages from the same person is one block: the tail
            // and the timestamp go on the last of them only.
            const next = msgs[i + 1];
            const endsRun = !next || next.sender_id !== m.sender_id || next.kind === "event";

            return (
              <View key={m.message_id}>
                {showDay && <Day label={dayOf(m.created_at)} />}
                <Pressable
                  onPress={() => setPicking(picking === m.message_id ? null : m.message_id)}
                  onLongPress={() => setPicking(m.message_id)}
                  delayLongPress={220}
                  style={[s.row, own && { justifyContent: "flex-end" }]}
                >
                  <View style={{ maxWidth: "80%" }}>
                    <View style={[
                      s.bubble,
                      own ? s.mine : s.theirs,
                      endsRun && (own ? s.mineTail : s.theirsTail),
                    ]}>
                      <Txt variant="body" color={own ? colors.onDark : colors.ink}>{m.body}</Txt>
                    </View>

                    <View style={[s.reactions, own && { alignSelf: "flex-end" }]}>
                      <Reactions
                        reactions={m.reactions ?? []}
                        mine={session?.userId}
                        onPick={(e) => react(m.message_id, e)}
                        compact
                      />
                    </View>

                    {endsRun && (
                      <Txt
                        variant="overline"
                        color={colors.inkFaint}
                        style={[s.stamp, own && { textAlign: "right" }]}
                      >
                        {clock(m.created_at)}{own && m.read_at ? " · read" : ""}
                      </Txt>
                    )}
                  </View>
                </Pressable>

                {picking === m.message_id && (
                  <Animated.View
                    entering={FadeIn.duration(140)}
                    style={[s.picker, own && { alignSelf: "flex-end" }]}
                  >
                    {REACTIONS.map((e) => (
                      <Pressable key={e} onPress={() => react(m.message_id, e)} hitSlop={4}>
                        <Txt variant="h2">{e}</Txt>
                      </Pressable>
                    ))}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function Day({ label }: { label: string }) {
  return (
    <View style={s.day}>
      <View style={s.dayRule} />
      <Txt variant="overline" color={colors.inkFaint}>{label}</Txt>
      <View style={s.dayRule} />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, marginTop: space.sm,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  day: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.md },
  dayRule: { flex: 1, height: 1, backgroundColor: colors.line },
  row: { flexDirection: "row" },
  bubble: { paddingHorizontal: space.md, paddingVertical: 9, borderRadius: 18 },
  mine: { backgroundColor: colors.ink },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  mineTail: { borderBottomRightRadius: 5 },
  theirsTail: { borderBottomLeftRadius: 5 },
  stamp: { fontSize: 11, marginTop: 3, marginHorizontal: 4 },
  reactions: { flexDirection: "row", gap: 4, marginTop: -6, marginLeft: 6 },
  reaction: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  picker: {
    flexDirection: "row", gap: space.md, alignSelf: "flex-start",
    paddingHorizontal: space.md, paddingVertical: space.sm, marginTop: 4,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.12, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  event: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center",
    paddingHorizontal: space.md, paddingVertical: 6, marginVertical: 2,
    borderRadius: radius.pill, backgroundColor: colors.accentWash,
  },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: space.md, paddingTop: 12,
    ...type.body, color: colors.ink, textAlignVertical: "top",
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  send: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.ink,
  },
});
