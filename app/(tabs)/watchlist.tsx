import { useCallback, useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { GraderBadge } from "../../components/GraderChips";
import { SkeletonList, SkeletonRow } from "../../components/Skeleton";
import { setAlert, unfollow, watchlist, type Watch } from "../../lib/watchlist";
import { enablePush, pushPossible } from "../../lib/push";
import { useToast } from "../../components/Toast";
import { conversionNote, money, useFx } from "../../lib/fx";
import { gradeLabel } from "../../lib/grading";
import { colors, radius, space } from "../../theme";

const STEPS = [5, 10, 20, 30];
const DIRS = [
  { id: "any", label: "Either way" },
  { id: "up", label: "Only up" },
  { id: "down", label: "Only down" },
];

/** Cards being followed, and the rule attached to each.
 *
 *  The number beside each card is movement since the last time we told them
 *  something — not since they added it. That is what the alert measures, so
 *  it is what the screen should show; anything else and the list disagrees
 *  with the notification the person just tapped. */
export default function Watchlist() {
  const router = useRouter();
  const fx = useFx();
  const [rows, setRows] = useState<Watch[] | undefined>(undefined);
  const [editing, setEditing] = useState<Watch | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    let alive = true;
    watchlist().then((r) => { if (alive) setRows(r.watches); });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const drop = (w: Watch) =>
    Alert.alert("Stop following?", `${w.cardName} comes off your watchlist.`, [
      { text: "Keep", style: "cancel" },
      { text: "Stop", style: "destructive",
        onPress: async () => {
          await unfollow(w.watchId); load();
          toast(`Stopped following ${w.cardName}.`, { tone: "info" });
        } },
    ]);

  return (
    <Screen>
      <Txt variant="display" style={{ marginTop: space.sm }}>Watchlist</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Cards you don&rsquo;t own but want to know about.
      </Txt>

      {rows === undefined ? (
        <View style={{ marginTop: space.xl }}>
          <SkeletonList count={3}>{() => <SkeletonRow />}</SkeletonList>
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}><Feather name="eye" size={20} color={colors.inkFaint} /></View>
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Followed Yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Open any card and tap Follow. We&rsquo;ll tell you when it moves by more than
            you choose — not every day, only when it matters.
          </Txt>
          <Button label="Browse the market" kind="ghost" onPress={() => router.push("/market")}
            style={{ marginTop: space.lg }} />
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {rows.map((w) => {
            const up = (w.since ?? 0) >= 0;
            return (
              <View key={w.watchId} style={s.card}>
                <Pressable
                  style={s.top}
                  onPress={() => w.catalogId && router.push(`/card/${w.catalogId}` as any)}
                >
                  {w.imageUrl ? (
                    <Image source={{ uri: w.imageUrl }} style={s.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.thumb, s.thumbEmpty]}>
                      <Feather name="image" size={15} color={colors.inkFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <GraderBadge grader={w.grader ?? "RAW"} grade={w.grade} />
                    <Txt variant="h3" numberOfLines={1}>{w.cardName}</Txt>
                    <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                      {[w.setName, w.grader ? gradeLabel(w.grader, w.grade) : null]
                        .filter(Boolean).join(" · ")}
                    </Txt>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Txt variant="h3">{money(w.value, { fx, from: "USD" })}</Txt>
                    {w.since != null && Math.abs(w.since) >= 0.05 && (
                      <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
                        {up ? "+" : ""}{w.since.toFixed(1)}%
                      </Txt>
                    )}
                  </View>
                </Pressable>

                <View style={s.foot}>
                  <Pressable onPress={() => setEditing(w)} style={s.rule}>
                    <Feather name="bell" size={13} color={w.alertPct ? colors.ink : colors.inkFaint} />
                    <Txt variant="bodySmall" color={w.alertPct ? colors.ink : colors.inkFaint}>
                      {w.alertPct
                        ? `${w.alertPct}% ${w.alertDir === "any" ? "either way" : w.alertDir}`
                        : "No alert"}
                    </Txt>
                  </Pressable>
                  <Pressable onPress={() => drop(w)} hitSlop={8}>
                    <Feather name="x" size={15} color={colors.inkFaint} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {rows && rows.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          <Note icon="bell">
            Movement is measured from the last thing we told you, not from the day you
            followed it. A card that drifts 4% a day still reaches your threshold.
          </Note>
        </View>
      )}

      <AlertSheet watch={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </Screen>
  );
}

/** The rule, as two choices. */
function AlertSheet({
  watch, onClose, onSaved,
}: { watch: Watch | null; onClose: () => void; onSaved: () => void }) {
  const [pct, setPct] = useState<number | null>(watch?.alertPct ?? 10);
  const [dir, setDir] = useState(watch?.alertDir ?? "any");
  const [busy, setBusy] = useState(false);

  if (!watch) return null;

  const save = async () => {
    setBusy(true);
    // Permission is asked here, at the moment the answer is obviously yes.
    if (pct != null) await enablePush();
    await setAlert(watch.watchId, pct, dir);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.grab} />
        <Txt variant="h1">Tell Me When It Moves</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
          {watch.cardName}
        </Txt>

        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>By</Txt>
        <View style={s.chips}>
          {STEPS.map((n) => (
            <Pressable key={n} onPress={() => setPct(n)} style={[s.chip, pct === n && s.chipOn]}>
              <Txt variant="bodySmall" color={pct === n ? colors.onPrimary : colors.inkMuted}>{n}%</Txt>
            </Pressable>
          ))}
          <Pressable onPress={() => setPct(null)} style={[s.chip, pct === null && s.chipOn]}>
            <Txt variant="bodySmall" color={pct === null ? colors.onPrimary : colors.inkMuted}>Off</Txt>
          </Pressable>
        </View>

        {pct != null && (
          <>
            <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>Direction</Txt>
            <View style={s.chips}>
              {DIRS.map((d) => (
                <Pressable key={d.id} onPress={() => setDir(d.id as any)}
                  style={[s.chip, dir === d.id && s.chipOn]}>
                  <Txt variant="bodySmall" color={dir === d.id ? colors.onPrimary : colors.inkMuted}>
                    {d.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {pct != null && !pushPossible() && (
          <View style={{ marginTop: space.lg }}>
            <Note tone="accent" icon="bell-off">
              This device can&rsquo;t receive notifications — a simulator has no push
              service. The rule is saved and the movement still shows on this screen.
            </Note>
          </View>
        )}

        <Button label={busy ? "Saving" : "Save"} onPress={save} loading={busy}
          style={{ marginTop: space.xl }} />
        <Button label="Cancel" kind="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  thumb: { width: 48, height: 66, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  foot: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  rule: { flexDirection: "row", alignItems: "center", gap: 6 },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
  scrim: { flex: 1, backgroundColor: "rgba(11,22,34,0.4)" },
  sheet: {
    backgroundColor: colors.surface, padding: space.xl, paddingBottom: space.xxxl,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center", marginBottom: space.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: 9, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
