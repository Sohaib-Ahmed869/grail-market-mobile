import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Note } from "../components/Note";
import { getLastScan } from "../lib/lastscan";
import { colors, radius, space, type } from "../theme";

const money = (n: number | null | undefined, cur = "AUD") =>
  n == null ? "—" : `${cur === "AUD" ? "A$" : "$"}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** What the scan found, and what it is worth.
 *
 *  Every field is editable. The reading is usually right and is sometimes not,
 *  and a member who can see the grade is wrong but cannot say so is left with
 *  a number they know is nonsense. Editing re-prices against what they
 *  corrected rather than arguing with them.
 *
 *  The figure carries its basis and its sample size, because "A$14,594 from
 *  nine sales" and "A$14,594 from one" are different claims and only one of
 *  them should be acted on. */
export default function ScanResult() {
  const router = useRouter();
  const scan = getLastScan();
  const [editing, setEditing] = useState(false);

  const id = scan?.identification ?? null;
  const v = scan?.valuation ?? null;

  const [form, setForm] = useState({
    name: id?.name ?? "",
    setName: id?.setName ?? "",
    number: id?.localId ?? "",
    grader: v?.slabGrader ?? "",
    grade: v?.slabGrade != null ? String(v.slabGrade) : "",
  });

  const price = v?.slabPrice ?? null;
  const ask = v?.liveAsk ?? null;
  const headline = price?.price ?? ask?.median ?? v?.tcgplayer?.market ?? null;

  const ladder = useMemo(() => {
    const g = form.grader || v?.slabGrader;
    if (!g || !v?.pricesByGrader?.[g]) return [];
    return Object.entries(v.pricesByGrader[g])
      .map(([grade, d]) => ({ grade, ...d }))
      .sort((a, b) => Number(a.grade) - Number(b.grade));
  }, [v, form.grader]);

  if (!scan) {
    return (
      <Screen back>
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Nothing to show</Txt>
        <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          Scan a card to see its value.
        </Txt>
      </Screen>
    );
  }

  if (scan.rejection) {
    return (
      <Screen back footer={<Button label="Try again" onPress={() => router.back()} />}>
        <View style={s.middle}>
          <View style={s.badgeBad}>
            <Feather name="camera-off" size={30} color={colors.down} />
          </View>
          <Txt variant="display" center>Couldn&rsquo;t read that</Txt>
          <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
            {scan.rejection.hint ?? scan.rejection.reason ?? "The photo wasn't clear enough."}
          </Txt>
          {/* A rejection is a better answer than a confident wrong price, and
              saying so is what stops it reading as a failure of the app. */}
          <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: space.xl }}>
            We&rsquo;d rather say nothing than guess. Fill the frame, lay it flat,
            and keep glare off the case.
          </Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      footer={
        <>
          <Button label="Add to collection" onPress={() => {}} />
          <Button label="Sell this card" kind="secondary" onPress={() => {}} />
        </>
      }
    >
      <View style={s.idRow}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1">{form.name || "Unidentified"}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted}>
            {[form.setName, form.number && `#${form.number}`, id?.rarity].filter(Boolean).join(" · ")}
          </Txt>
        </View>
        <Pressable onPress={() => setEditing((e) => !e)} hitSlop={10} style={s.edit}>
          <Feather name={editing ? "check" : "edit-2"} size={16} color={colors.ink} />
        </Pressable>
      </View>

      {v?.slabGrader && (
        <View style={s.slab}>
          <Feather name="shield" size={13} color={colors.up} />
          <Txt variant="overline" color={colors.up}>
            {v.slabGrader} {v.slabGrade ?? ""}{v.certNumber ? ` · #${v.certNumber}` : ""}
          </Txt>
        </View>
      )}

      {editing && (
        <Card style={{ marginTop: space.lg }}>
          <Txt variant="overline" color={colors.inkFaint}>Correct the reading</Txt>
          {([
            ["name", "Card name"], ["setName", "Set"], ["number", "Number"],
            ["grader", "Grading company"], ["grade", "Grade"],
          ] as const).map(([k, label]) => (
            <View key={k} style={s.field}>
              <Txt variant="label" color={colors.inkMuted}>{label}</Txt>
              <TextInput
                value={(form as any)[k]}
                onChangeText={(t) => setForm((f) => ({ ...f, [k]: t }))}
                style={s.input}
                placeholderTextColor={colors.inkFaint}
              />
            </View>
          ))}
          <Button label="Re-price with these" kind="secondary" onPress={() => setEditing(false)} style={{ marginTop: space.md }} />
        </Card>
      )}

      <View style={s.priceBlock}>
        <Txt variant="overline" color={colors.inkFaint}>
          {price ? "Estimated value" : ask ? "Current asking price" : "Market price"}
        </Txt>
        <Txt variant="price">{money(headline, v?.currency)}</Txt>
        {price && (
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
            {price.basis === "observed" ? "From completed sales" : price.method ?? price.basis}
            {price.sampleSize ? ` · ${price.sampleSize} sales` : ""} · confidence {price.confidence}
          </Txt>
        )}
        {!price && ask && (
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
            {ask.count} live listings · asking prices, not sales
          </Txt>
        )}
      </View>

      {price?.explain && (
        <View style={{ marginTop: space.md }}>
          <Note icon="info">{price.explain}</Note>
        </View>
      )}

      {ladder.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          <Txt variant="h2">The {form.grader || v?.slabGrader} ladder</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginBottom: space.md }}>
            Each grade priced from its own sales. Never converted between companies.
          </Txt>
          <View style={s.ladder}>
            {ladder.map((row) => {
              const here = String(v?.slabGrade) === row.grade;
              return (
                <View key={row.grade} style={[s.rung, here && s.rungHere]}>
                  <Txt variant="h3" style={{ width: 46 }}>{row.grade}</Txt>
                  <Txt variant="body" style={{ flex: 1 }}>{money(row.price, v?.currency)}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    {row.sampleSize ? `${row.sampleSize} sales` : "—"}
                  </Txt>
                  {here && <Feather name="chevron-left" size={16} color={colors.accent} />}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  badgeBad: {
    width: 70, height: 70, borderRadius: 35, marginBottom: space.xl,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.downWash, borderWidth: 1, borderColor: colors.down,
  },
  idRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  edit: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  slab: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    marginTop: space.sm, paddingHorizontal: space.md, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: colors.upWash,
  },
  field: { gap: 5, marginTop: space.md },
  input: {
    height: 46, paddingHorizontal: space.md, ...type.body, color: colors.ink,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk,
  },
  priceBlock: { marginTop: space.xl },
  ladder: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  rung: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  rungHere: { backgroundColor: colors.accentWash },
});
