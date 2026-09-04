import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { Picker } from "../../components/Picker";
import { GraderChips } from "../../components/GraderChips";
import { SellSteps } from "../../components/SellSteps";
import { getDraftSeed, patchDraft, getDraft } from "../../lib/selldraft";
import { gradeLabel, graderById, ladderFor, VARIANTS, type GraderId } from "../../lib/grading";
import { GateNotice } from "../../components/TierGate";
import { useTier } from "../../lib/tiers";
import { colors, radius, space, type } from "../../theme";

/** Step 1 — what exactly is being sold.
 *
 *  Company, then that company's own ladder, then the printing. In that order
 *  because each one narrows the next: the ladder shown is Beckett's only after
 *  Beckett is chosen, and changing company clears the grade rather than
 *  carrying a PSA 10 across to a CGC slab that never existed.
 *
 *  Ungraded is a company here, not a separate mode. It has its own ladder —
 *  Near Mint down to Damaged — because a raw card still has a condition, and
 *  making it the first chip is how a seller with a binder card finds it. */
export default function SellCard() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const existing = getDraft();

  // The scan hands the card over in memory, and again in the URL. The second
  // one is what survives a reload — without it, refreshing anywhere in the
  // sell flow drops you back to "scan the card first" holding a card you have
  // already scanned.
  const str = (k: string) => {
    const v = params[k];
    const one = Array.isArray(v) ? v[0] : v;
    return one && one.length > 0 ? String(one) : null;
  };
  const fromParams = str("name")
    ? {
        catalogId: str("cardId"), cardName: str("name")!, setName: str("setName"),
        cardNumber: str("number"), game: str("game"), imageUrl: str("image"),
        grader: str("grader"), grade: str("grade"), certNumber: str("cert"),
        variant: str("variant"),
        marketValue: str("market") ? Number(str("market")) : null,
      }
    : null;
  const seed = getDraftSeed() ?? fromParams;

  const [grader, setGrader] = useState<GraderId>(
    ((existing?.grader ?? seed?.grader ?? "RAW").toUpperCase() as GraderId),
  );
  const [grade, setGrade] = useState<string | null>(existing?.grade ?? seed?.grade ?? null);
  const [variant, setVariant] = useState<string>(existing?.variant ?? "normal");
  const [cert, setCert] = useState(existing?.certNumber ?? seed?.certNumber ?? "");
  const [note, setNote] = useState(existing?.conditionNote ?? "");
  const { tier } = useTier();

  useEffect(() => {
    if (seed && !existing) patchDraft({ ...seed });
  }, []);

  if (!seed) {
    return (
      <Screen back footer={<Button label="Scan a card" onPress={() => router.replace("/(tabs)/scan")} />}>
        <View style={{ marginTop: space.xxxl, alignItems: "center" }}>
          <Txt variant="h2" center>Scan the card first</Txt>
          <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
            Listing starts from a scan, so the card, its set and its grade are already right.
          </Txt>
        </View>
      </Screen>
    );
  }

  const raw = grader === "RAW";
  const ladder = ladderFor(grader);
  const brand = graderById(grader);
  const ready = Boolean(grade);

  // Changing company invalidates the grade. Carrying it across would silently
  // relabel a PSA 9 as a BGS 9, which are not the same card or the same price.
  const pickGrader = (g: GraderId) => {
    setGrader(g);
    setGrade(g === (seed.grader ?? "").toUpperCase() ? seed.grade ?? null : null);
  };

  const next = () => {
    patchDraft({
      grader: raw ? null : grader,
      grade,
      variant,
      certNumber: raw ? null : cert.trim() || null,
      isRaw: raw,
      conditionNote: note.trim() || null,
    });
    router.push("/sell/photos");
  };

  return (
    <Screen back footer={
      <>
        <Button
          label="Next · Photographs"
          onPress={next}
          disabled={!ready || (tier != null && !tier.gates.sell.ok)}
        />
        {!ready && (
          <Txt variant="bodySmall" color={colors.inkFaint} center>
            Pick the {raw ? "condition" : "grade on the label"} to continue
          </Txt>
        )}
      </>
    }>
      <SellSteps step={1} />

      {/* Checked on step one, not step five. A gate that fires after ten
        * minutes of photography has already cost someone the ten minutes. */}
      {tier && !tier.gates.sell.ok && (
        <View style={{ marginTop: space.lg }}>
          <GateNotice gate={tier.gates.sell} action="Listing a card" have={tier.have} />
        </View>
      )}

      <View style={s.card}>
        {seed.imageUrl ? (
          <Image source={{ uri: seed.imageUrl }} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}><Feather name="image" size={18} color={colors.inkFaint} /></View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h2" numberOfLines={2}>{seed.cardName}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted}>
            {[seed.setName, seed.cardNumber && `#${seed.cardNumber}`].filter(Boolean).join(" · ")}
          </Txt>
          <Pressable onPress={() => router.replace("/(tabs)/scan")} hitSlop={6}>
            <Txt variant="bodySmall" color={colors.ink} style={{ textDecorationLine: "underline" }}>
              Wrong card? Rescan
            </Txt>
          </Pressable>
        </View>
      </View>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Graded By
      </Txt>
      <View style={{ marginTop: space.sm }}>
        <GraderChips value={grader} onChange={pickGrader} />
      </View>
      {brand && !raw && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 6 }}>
          {brand.full}
        </Txt>
      )}

      <View style={s.pair}>
        <View style={{ flex: 1 }}>
          <Picker
            label={raw ? "Condition" : "Grade on the label"}
            value={grade}
            options={ladder}
            onChange={setGrade}
            placeholder={raw ? "How is it?" : "Read it off the slab"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Picker label="Variant" value={variant} options={VARIANTS} onChange={setVariant} />
        </View>
      </View>

      {!raw && (
        <View style={s.certBox}>
          <Txt variant="overline" color={colors.inkFaint} style={s.certLabel}>
            Certification number
          </Txt>
          <TextInput
            value={cert}
            onChangeText={setCert}
            placeholder="Printed on the label"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.certInput}
          />
        </View>
      )}

      {grade && (
        <View style={[s.summary, !raw && brand ? { borderColor: brand.tint } : null]}>
          <Feather name={raw ? "layers" : "award"} size={15} color={raw ? colors.inkMuted : brand?.tint} />
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>
            Listing as{" "}
            <Txt variant="bodySmall" color={colors.ink}>
              {raw ? `Raw · ${gradeLabel("RAW", grade)}` : `${brand?.mark} ${gradeLabel(grader, grade)}`}
            </Txt>
            {variant !== "normal" ? ` · ${VARIANTS.find((v) => v.value === variant)?.label}` : ""}
            {!raw && cert.trim() ? ` · cert ${cert.trim()}` : ""}
          </Txt>
        </View>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        {raw ? "Describe the condition" : "Anything to add"}
      </Txt>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        placeholder={raw
          ? "Sharp corners, tiny print line on the back edge…"
          : "Case is clean, no scratches on the front (optional)"}
        placeholderTextColor={colors.inkFaint}
        style={s.note}
      />

      <View style={{ marginTop: space.md }}>
        {raw ? (
          <Note icon="info">
            Buyers judge a raw card from your photographs. Saying what they show is what
            keeps a sale from turning into a dispute.
          </Note>
        ) : (
          <Note tone="good" icon="shield">
            We price this against {brand?.mark} {grade ?? ""} sales only — never a grade
            converted from another company.
          </Note>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row", gap: space.md, marginTop: space.lg, padding: space.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk,
  },
  thumb: { width: 58, height: 80, borderRadius: 6, backgroundColor: colors.line },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  pair: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  certBox: {
    height: 58, marginTop: space.sm, paddingHorizontal: space.md, paddingTop: 15,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field, justifyContent: "center",
  },
  certLabel: { position: "absolute", top: 8, left: space.md, fontSize: 11.5, letterSpacing: 0.1 },
  certInput: { ...type.body, color: colors.ink, paddingVertical: 0, letterSpacing: 0.1 },
  summary: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    marginTop: space.md, padding: space.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk,
  },
  note: {
    minHeight: 84, padding: space.md, marginTop: space.sm, textAlignVertical: "top",
    ...type.body, color: colors.ink,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
});
