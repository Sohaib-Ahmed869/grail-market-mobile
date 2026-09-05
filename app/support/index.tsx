import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";
import { myTickets, type TicketSummary } from "../../lib/support";
import { colors, radius, space } from "../../theme";

const when = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/** What each state means to the person waiting, not to the desk. */
const STATE: Record<string, { label: string; tone: string }> = {
  new: { label: "With us", tone: colors.info },
  open: { label: "Being looked at", tone: colors.info },
  waiting: { label: "Waiting on you", tone: colors.accent },
  resolved: { label: "Closed", tone: colors.up },
};

export default function SupportList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myTickets().then((t) => { if (alive) setTickets(t); });
      return () => { alive = false; };
    }, []),
  );

  return (
    <Screen
      back
      footer={<Button label="Get help" onPress={() => router.push("/support/new")} />}
    >
      <Txt variant="display" style={{ marginTop: space.sm }}>Help</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Anything you have asked us, and anything you have reported.
      </Txt>

      {tickets === null ? (
        <Loader fill />
      ) : tickets.length === 0 ? (
        <View style={s.empty}>
          <Feather name="life-buoy" size={22} color={colors.inkFaint} />
          <Txt variant="h3" style={{ marginTop: space.md }}>Nothing open</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            When something goes wrong with a card, a payment or a member, this
            is where it goes and where the answer comes back.
          </Txt>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.ticket_id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: space.sm, marginTop: space.lg }}
          renderItem={({ item }) => {
            const st = STATE[item.status] ?? STATE.open;
            return (
              <Pressable
                onPress={() => router.push(`/support/${item.ticket_id}` as never)}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={s.head}>
                    {item.kind === "report" && (
                      <View style={s.flag}>
                        <Feather name="flag" size={9} color={colors.onPrimary} />
                      </View>
                    )}
                    <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>{item.subject}</Txt>
                  </View>
                  {item.last_body && (
                    <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                      {item.last_author === "agent" ? "Us: " : "You: "}{item.last_body}
                    </Txt>
                  )}
                  <Txt variant="bodySmall" color={st.tone}>
                    {st.label} · {when(item.last_at ?? item.created_at)}
                  </Txt>
                </View>
                <Feather name="chevron-right" size={17} color={colors.inkFaint} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.lg, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flag: {
    width: 16, height: 16, borderRadius: 5,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.down,
  },
  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.xl },
});
