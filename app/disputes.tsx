import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Icon } from "../components/Icon";
import { Bone } from "../components/Skeleton";
import { myDisputes, STATUS_LABEL, type Dispute } from "../lib/disputes";
import { useSession } from "../lib/session";
import { colors, radius, space } from "../theme";

/** Every dispute you are on either side of.
 *
 *  Live ones sort first — a dispute settled in March is never the thing you
 *  opened this screen to find. */
export default function Disputes() {
  const router = useRouter();
  const session = useSession();
  const [rows, setRows] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRows(await myDisputes());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen back>
      <Txt variant="display">Disputes</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Sales where something went wrong, and where they got to.
      </Txt>

      {loading ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Bone h={96} r={radius.lg} />
          <Bone h={96} r={radius.lg} />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <Icon name="verified" size={26} color={colors.up} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Has Gone Wrong</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            If a sale doesn&rsquo;t go the way it should, open a dispute from the sale
            itself and it will appear here.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {rows.map((d) => {
            const live = d.status === "open" || d.status === "answered";
            const mine = d.raised_by === session?.userId;
            return (
              <Pressable
                key={d.dispute_id}
                onPress={() => router.push({ pathname: "/dispute/[id]", params: { id: d.dispute_id } })}
                style={s.row}
              >
                {d.image_url ? (
                  <Image source={{ uri: d.image_url }} style={s.art} />
                ) : (
                  <View style={[s.art, s.artEmpty]}>
                    <Icon name="card" size={16} color={colors.inkFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3" numberOfLines={1}>{d.card_name ?? "A sale"}</Txt>
                  <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                    {mine ? "You opened this" : "Opened against you"}
                  </Txt>
                  <View style={[s.pill, live ? s.pillLive : s.pillDone]}>
                    <Txt variant="bodySmall" color={live ? colors.onPrimary : colors.inkMuted}>
                      {STATUS_LABEL[d.status]}
                    </Txt>
                  </View>
                </View>
                <Icon name="offer" size={16} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  art: { width: 46, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  artEmpty: { alignItems: "center", justifyContent: "center" },
  pill: {
    alignSelf: "flex-start", marginTop: 4,
    paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  pillLive: { backgroundColor: colors.ink },
  pillDone: { backgroundColor: colors.surfaceSunk },
  empty: {
    marginTop: space.xxl, padding: space.xl, alignItems: "center",
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
});
