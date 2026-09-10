import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, AppState, FlatList, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Loader } from "../../components/Loader";
import { Note } from "../../components/Note";
import { Feather } from "@expo/vector-icons";
import { Icon } from "../../components/Icon";
import { Avatar } from "../../components/Avatar";
import { CardArt } from "../../components/CardArt";
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
  // Inverted, so "the bottom" is offset zero and a new message needs no
  // scrolling at all. The previous version nested a ScrollView inside the
  // Screen's own ScrollView, which gave the inner one no bounded height —
  // so it never scrolled itself and scrollToEnd was a no-op. A long
  // conversation simply did not go to the newest message.
  const scroller = useRef<FlatList<Message>>(null);

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
      scroll={false}
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
          {/* An arrow, not a speech bubble. The icon on a send button should
              say where the text is going, not repeat what the screen is. */}
          <Pressable
            onPress={send}
            disabled={busy || !text.trim()}
            accessibilityLabel="Send"
            style={({ pressed }) => [
              s.send,
              (!text.trim() || busy) && s.sendOff,
              pressed && text.trim() && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <Feather name="arrow-up" size={19} color={text.trim() ? colors.onPrimary : colors.inkFaint} />
          </Pressable>
        </View>
      }
    >
      {meta && (
        /* Who, and which card. A thread here is always about one object, so
           the object belongs in the header — the way a DM about a post shows
           the post rather than describing it. */
        <Pressable
          onPress={() => router.push(`/listing/${meta.listing_id}` as any)}
          style={({ pressed }) => [s.header, pressed && { opacity: 0.8 }]}
        >
          <Avatar name={meta.other_name ?? "member"} id={meta.other_avatar} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="h3" numberOfLines={1}>{meta.other_name ?? "Member"}</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
              {meta.card_name}
              {meta.grader ? ` · ${meta.grader} ${meta.grade ?? ""}` : ""}
            </Txt>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Txt variant="label">{aud(Number(meta.price))}</Txt>
            <Txt variant="overline" color={colors.inkFaint}>{meta.my_role === "buyer" ? "buying" : "selling"}</Txt>
          </View>
          {meta.image_url ? (
            <View style={s.headerArt}><CardArt uri={meta.image_url} iconSize={14} /></View>
          ) : null}
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
        <FlatList
          ref={scroller}
          // Newest at offset zero. Reversed here rather than in the request so
          // the day separators and the run-grouping still read forwards.
          inverted
          data={[...msgs].reverse()}
          keyExtractor={(m) => m.message_id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: space.md, paddingBottom: space.md }}
          style={{ marginTop: space.md }}
          renderItem={({ item: m, index }) => {
            // Inverted: "the one before this in time" is the NEXT index.
            const order = [...msgs].reverse();
            const prev = order[index + 1];
            const next = order[index - 1];
            const showDay = !prev || dayOf(m.created_at) !== dayOf(prev.created_at);

            if (m.kind === "event") {
              return (
                <View>
                  <View style={s.event}>
                    <Icon name="offer" size={13} color={colors.accent} />
                    <Txt variant="bodySmall" color={colors.inkMuted}>{m.body}</Txt>
                  </View>
                  {showDay && <Day label={dayOf(m.created_at)} />}
                </View>
              );
            }

            const own = mine(m);
            const endsRun = !next || next.sender_id !== m.sender_id || next.kind === "event";

            return (
              <View>
                <Pressable
                  onPress={() => setPicking(picking === m.message_id ? null : m.message_id)}
                  onLongPress={() => setPicking(m.message_id)}
                  delayLongPress={220}
                  style={[s.row, own && { justifyContent: "flex-end" }]}
                >
                  <View style={{ maxWidth: "78%" }}>
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

                {showDay && <Day label={dayOf(m.created_at)} />}
              </View>
            );
          }}
        />
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
  headerArt: { width: 34, height: 47, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surfaceSunk },
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
  sendOff: { backgroundColor: colors.field },
  send: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.ink,
  },
});
