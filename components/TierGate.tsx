import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { VerifiedShield } from "./VerifiedBadge";
import { LADDER, type Gate, type Tier } from "../lib/tiers";
import { colors, radius, space } from "../theme";

/** The ladder, drawn.
 *
 *  Four rungs, with the ones already earned marked. People accept friction
 *  they can see the end of — an ID check with no context reads as an
 *  intrusion, and the same check shown as the step between "buying" and
 *  "selling" reads as a door. */
export function TierLadder({ tier }: { tier: Tier | null }) {
  const current = tier?.tier ?? 0;
  return (
    <View style={s.ladder}>
      {LADDER.map((rung, i) => {
        const done = current >= rung.tier;
        const next = current + 1 === rung.tier;
        return (
          <View key={rung.tier} style={[s.rung, i > 0 && s.rungLine]}>
            <View style={[s.pip, done && s.pipDone, next && s.pipNext]}>
              {done
                ? <Icon name="verified" size={13} color={colors.onPrimary} filled />
                : <Txt variant="bodySmall" color={next ? colors.ink : colors.inkFaint}>{rung.tier}</Txt>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rungHead}>
                <Txt variant="h3" color={done ? colors.ink : colors.inkMuted}>{rung.name}</Txt>
                {done && <Txt variant="bodySmall" color={colors.up}>Done</Txt>}
                {next && <Txt variant="bodySmall" color={colors.accent}>Next</Txt>}
              </View>
              <Txt variant="bodySmall" color={colors.inkFaint}>{rung.need}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
                Opens: {rung.opens}
              </Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A refusal that tells you the way out.
 *
 *  Shown BEFORE the action, never after: a gate that fires on the last screen
 *  of the sell flow has already cost someone ten minutes of photography. */
export function GateNotice({
  gate, action, have, onDone,
}: {
  gate: Gate;
  /** what they were trying to do, in their words */
  action: string;
  /** What the member already has, so the button can send them to the thing
   *  they are actually missing. Optional only so older callers still compile;
   *  pass it wherever the tier is in hand. */
  have?: Tier["have"];
  onDone?: () => void;
}) {
  const router = useRouter();
  if (gate.ok) return null;

  // Level 1 needs TWO things — a phone and a payment method — and this used to
  // send everyone to /plans for it. Someone who had already subscribed and was
  // only missing a phone number was told "Confirm your phone number" and then
  // handed the subscription screen they had just paid on, which reads as the
  // app having lost their money. The destination now follows the same fact the
  // sentence above it is derived from.
  const where =
    gate.need === 1
      ? have && have.payment && !have.phone
        ? "/sms"
        : "/plans"
      : "/idcheck";

  return (
    <View style={s.gate}>
      <View style={s.gateHead}>
        <VerifiedShield size={26} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{action} needs level {gate.need}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
            {gate.missing}
          </Txt>
        </View>
      </View>
      <Pressable
        onPress={() => { onDone?.(); router.push(where as never); }}
        style={s.gateBtn}
      >
        <Txt variant="button" color={colors.onPrimary}>
          {gate.need === 1 ? "Choose a plan" : "Start the ID check"}
        </Txt>
        <Icon name="verified" size={16} color={colors.onPrimary} filled />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  ladder: {
    marginTop: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
  },
  rung: { flexDirection: "row", gap: space.md, paddingVertical: space.lg },
  rungLine: { borderTopWidth: 1, borderTopColor: colors.line },
  rungHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pip: {
    width: 26, height: 26, borderRadius: 13, marginTop: 2,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  pipDone: { backgroundColor: colors.up, borderColor: colors.up },
  pipNext: { borderColor: colors.accent, borderWidth: 2 },

  gate: {
    padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentLine,
  },
  gateHead: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  gateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 46, marginTop: space.md, borderRadius: radius.md, backgroundColor: colors.ink,
  },
});
