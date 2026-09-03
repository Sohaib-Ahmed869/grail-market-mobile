import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Note } from "../components/Note";
import { Picker } from "../components/Picker";
import { GraderChips } from "../components/GraderChips";
import { CardMarket } from "../components/CardMarket";
import { conversionNote, money as fxMoney, useFx } from "../lib/fx";
import { gradeLabel, graderById, ladderFor, VARIANTS, type GraderId } from "../lib/grading";
import { getLastScan, getLastShots, setLastScan } from "../lib/lastscan";
import { addToCollection } from "../lib/market";
import { clearDraft, setDraftSeed } from "../lib/selldraft";
import { apiMessage } from "../lib/api";
import { useToast } from "../components/Toast";
import { colors, radius, space, type } from "../theme";

/** What each rejection means, and the thing that actually fixes it.
 *
 *  The backend returns a reason code — "too_much_glare", "card_too_small" —
 *  which is precise and useless to a person holding a phone. Each one is
 *  translated into what went wrong and what to do differently. */
const REASONS: Record<string, { title: string; says: string; fix: string[] }> = {
  too_much_glare: {
    title: "Too much glare",
    says: "Light is bouncing off the case, so the label couldn\u2019t be read.",
    fix: [
      "Turn away from the light, or tilt the card slightly",
      "Avoid shooting directly under a ceiling light",
      "A window with indirect daylight works best",
    ],
  },
  card_too_small: {
    title: "Card too small in frame",
    says: "There wasn\u2019t enough detail to read the number or the label.",
    fix: ["Move closer until the card fills most of the frame", "Keep the whole card in shot"],
  },
  no_card_found: {
    title: "No card found",
    says: "Nothing card-shaped was detected in that photo.",
    fix: ["Lay the card on a plain surface", "Make sure all four edges are visible"],
  },
  blurred: {
    title: "Out of focus",
    says: "The text was too soft to read.",
    fix: ["Tap the screen on the card to focus", "Hold still for a moment before shooting"],
  },
};

// Prices from our sources arrive in US dollars. Converting them in one place,
// and saying so under the figure, is the difference between an Australian
// price and an American one wearing an A$ sign.

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
/** A canned result, for opening this screen without a camera.
 *
 *  Development only, and only when asked for by ?demo=1. It exists because
 *  this screen could previously only be reached by taking a photograph, which
 *  makes every fault on it slow to reproduce and impossible to click through
 *  on a laptop. */
const DEMO = {
  identification: {
    cardId: "base1-4", name: "Charizard", setName: "Base Set", localId: "4",
    rarity: "Holo Rare", game: "pokemon",
    imageUrl: "https://assets.tcgdex.net/en/base/base1/4/high.png",
    matchScore: 0.98, printing: "holo",
  },
  valuation: {
    slabGrader: "PSA", slabGrade: 9, certNumber: "117319181",
    slabPrice: {
      price: 1345, basis: "observed", confidence: "low", sampleSize: 3,
      method: "all_filtered_weighted",
      explain: "Completed sales of this card at PSA 9.",
    },
    liveAsk: null, currency: "USD",
    pricesByGrader: {
      PSA: {
        "8": { price: 780, sampleSize: 9 },
        "9": { price: 1345, sampleSize: 3, low: 1400, high: 1500, median: 1450,
               asOf: "2026-08-26T08:05:31.090Z", confidence: "low" },
        "10": { price: 8600, sampleSize: 4 },
      },
    },
  },
} as const;

export default function ScanResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{ demo?: string }>();
  if (__DEV__ && params.demo && !getLastScan()) setLastScan(DEMO as any);
  const scan = getLastScan();
  const fx = useFx();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // A failure that is not shown is indistinguishable from a button that does
  // nothing. Every one of these actions now ends in a visible state.
  const toast = useToast();

  const id = scan?.identification ?? null;
  const v = scan?.valuation ?? null;
  const money = (n: number | null | undefined, from = v?.currency ?? "USD") =>
    fxMoney(n, { fx, from });

  const [form, setForm] = useState({
    name: id?.name ?? "",
    setName: id?.setName ?? "",
    number: id?.localId ?? "",
    grader: v?.slabGrader ?? "",
    grade: v?.slabGrade != null ? String(v.slabGrade) : "",
  });

  // The slab reading is the default, not the answer. A label that was read
  // wrong is the one case where the member can see the mistake and we cannot,
  // so company, grade and printing are all one tap from being corrected —
  // and correcting the company clears the grade rather than carrying a PSA 10
  // across to a CGC slab that never existed.
  const grader = ((form.grader || "RAW").toUpperCase() as GraderId);
  const brand = graderById(grader);
  const [variant, setVariant] = useState<string>(id?.printing ?? "normal");
  const [qty, setQty] = useState("1");
  const [paid, setPaid] = useState("");

  const pickGrader = (g: GraderId) =>
    setForm((f) => ({
      ...f,
      grader: g === "RAW" ? "" : g,
      grade: g === (v?.slabGrader ?? "").toUpperCase() ? String(v?.slabGrade ?? "") : "",
    }));

  const add = async () => {
    setAdding(true);
    try {
      const r = await addToCollection({
        catalogId: id?.cardId ?? null, cardName: form.name || "Unknown",
        setName: form.setName || null, cardNumber: form.number || null,
        imageUrl: getLastShots()?.front ?? null,
        grader: form.grader || null, grade: form.grade || null,
        variant, quantity: Math.max(1, Number(qty) || 1),
        paid: paid.trim() ? Number(paid.replace(/[^\d.]/g, "")) : null,
      });
      if ((r as any).error) {
        toast((r as any).message ?? "That card could not be saved.", { tone: "bad" });
      } else {
        setAdded(true);
        toast(`${form.name || "Card"} added to your collection.`, {
          action: { label: "Collection", onPress: () => router.push("/(tabs)/portfolio") },
        });
      }
    } catch (e) {
      toast(apiMessage(e, "saving to your collection") ?? "Something went wrong.", { tone: "bad" });
    } finally {
      // Always. Leaving the button spinning is the failure people described
      // as "nothing happens".
      setAdding(false);
    }
  };

  const sell = () => {
    // A draft left over from an abandoned listing would otherwise be picked up
    // by step 1 and quietly override the card just scanned.
    clearDraft();
    // Carry what the scan already worked out into the sell flow, so nobody
    // re-types a card the app has just identified.
    setDraftSeed({
      catalogId: id?.cardId ?? null, cardName: form.name, setName: form.setName || null,
      cardNumber: form.number || null, game: id?.game ?? null,
      imageUrl: getLastShots()?.front ?? null,
      grader: form.grader || null, grade: form.grade || null,
      certNumber: v?.certNumber ?? null, variant,
      marketValue: headline ?? null,
    });
    // The seed also travels as route params, so a browser reload inside the
    // sell flow does not land on "scan the card first" holding a card that
    // was already scanned.
    //
    // Scalars only. On web the picked photograph is a data: URI — the entire
    // image inline, megabytes of it — and putting that in params pushes it
    // into the URL, where the history entry is too large to write and the
    // navigation never happens. That is exactly what a dead button looks
    // like. Only a real, short http(s) URL is worth carrying.
    try {
      router.push({
        pathname: "/sell/card",
        params: {
          cardId: id?.cardId ?? "", name: form.name, setName: form.setName ?? "",
          number: form.number ?? "", game: id?.game ?? "",
          grader: form.grader ?? "", grade: form.grade ?? "",
          cert: v?.certNumber ?? "", variant,
          image: linkable(id?.imageUrl),
          market: headline != null ? String(headline) : "",
        },
      });
    } catch {
      // The seed is already in memory, so the plain route still works. A
      // navigation must never be lost to the thing that was only there to
      // survive a reload.
      router.push("/sell/card");
    }
  };

  const price = v?.slabPrice ?? null;
  const ask = v?.liveAsk ?? null;
  const headline = price?.price ?? ask?.median ?? v?.tcgplayer?.market ?? null;

  // The store's own row for the grade on screen — count, range, and when it
  // was last refreshed. It is what turns a price into a claim with evidence.
  const gradePoint = useMemo(() => {
    const g = form.grader || v?.slabGrader;
    const grade = form.grade || (v?.slabGrade != null ? String(v.slabGrade) : "");
    if (!g || !grade) return null;
    return (v?.pricesByGrader?.[g]?.[grade] ?? null) as
      | { price: number; sampleSize?: number; count?: number; low?: number; high?: number;
          median?: number; asOf?: string; confidence?: string }
      | null;
  }, [v, form.grader, form.grade]);

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
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Nothing To Show</Txt>
        <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          Scan a card to see its value.
        </Txt>
      </Screen>
    );
  }

  if (scan.rejection) {
    const shots = getLastShots();
    const why = REASONS[String(scan.rejection.reason)] ?? {
      title: "Couldn\u2019t read that",
      says: scan.rejection.hint ?? "The photo wasn\u2019t clear enough.",
      fix: ["Fill the frame with the card", "Lay it flat", "Keep glare off the case"],
    };
    return (
      <Screen back footer={<Button label="Take another" onPress={() => router.replace("/(tabs)/scan")} />}>
        <View style={s.rejectHead}>
          <View style={s.badgeBad}>
            <Feather name="camera-off" size={26} color={colors.down} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h1">{why.title}</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted}>{why.says}</Txt>
          </View>
        </View>

        {/* The photograph that was rejected.
          *
          * Told "too much glare" against a blank screen, nobody can tell
          * whether they shot the wrong thing, cropped it badly or caught the
          * light — and one look at their own frame answers it. */}
        {shots?.front && (
          <View style={s.rejectShot}>
            <Image source={{ uri: shots.front }} style={s.rejectImg} resizeMode="contain" />
            <Txt variant="overline" color={colors.inkFaint} center style={{ marginTop: space.sm }}>
              What we received
            </Txt>
          </View>
        )}

        <View style={s.fixes}>
          <Txt variant="h3">What usually fixes it</Txt>
          {why.fix.map((f) => (
            <View key={f} style={s.fixRow}>
              <Feather name="check" size={14} color={colors.up} />
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>{f}</Txt>
            </View>
          ))}
        </View>

        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            We&rsquo;d rather say nothing than guess. A wrong price on a card worth
            thousands costs more than asking you to shoot it again.
          </Note>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      footer={
        <>
          <Button
            label={added ? "In your collection" : "Looks good · add to collection"}
            onPress={add}
            loading={adding}
            disabled={added}
          />
          <Button label="Sell this card" kind="secondary" onPress={sell} />
                  </>
      }
    >
      {/* Your photograph beside the catalogue's render.
        *
        * The app is claiming these are the same card. Putting them side by
        * side lets that claim be checked in one glance, which is the only
        * check that catches a confident wrong match — a number that is
        * plausible for the wrong card looks exactly like a right answer. */}
      <View style={s.compare}>
        <View style={s.compareCell}>
          {getLastShots()?.front ? (
            <Image source={{ uri: getLastShots()!.front! }} style={s.compareImg} resizeMode="cover" />
          ) : (
            <View style={[s.compareImg, s.compareEmpty]}>
              <Feather name="camera-off" size={18} color={colors.inkFaint} />
            </View>
          )}
          <Txt variant="overline" color={colors.inkFaint} center style={{ marginTop: 6 }}>
            Your picture
          </Txt>
        </View>
        <View style={s.compareCell}>
          {id?.imageUrl ? (
            <Image source={{ uri: id.imageUrl }} style={s.compareImg} resizeMode="contain" />
          ) : (
            <View style={[s.compareImg, s.compareEmpty]}>
              <Feather name="image" size={18} color={colors.inkFaint} />
            </View>
          )}
          <Txt variant="overline" color={colors.inkFaint} center style={{ marginTop: 6 }}>
            Your match{id?.matchScore != null ? ` · ${Math.round(id.matchScore * 100)}%` : ""}
          </Txt>
        </View>
      </View>

      <Pressable onPress={() => router.replace("/(tabs)/search")} hitSlop={6} style={{ marginTop: space.sm }}>
        <Txt variant="bodySmall" color={colors.inkFaint} center>
          Not the right card?{" "}
          <Txt variant="bodySmall" color={colors.ink} style={{ textDecorationLine: "underline" }}>
            Search for it
          </Txt>
        </Txt>
      </Pressable>

      <View style={[s.idRow, { marginTop: space.xl }]}>
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

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        Graded By
      </Txt>
      <View style={{ marginTop: space.sm }}>
        <GraderChips value={grader} onChange={pickGrader} />
      </View>

      <View style={s.pair}>
        <View style={{ flex: 1 }}>
          <Picker
            label={grader === "RAW" ? "Condition" : "Grade"}
            value={form.grade || null}
            options={ladderFor(grader)}
            onChange={(g) => setForm((f) => ({ ...f, grade: g }))}
            placeholder={grader === "RAW" ? "How is it?" : "Off the label"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Picker label="Variant" value={variant} options={VARIANTS} onChange={setVariant} />
        </View>
      </View>

      <View style={s.pair}>
        <View style={{ flex: 1 }}>
          <View style={s.miniField}>
            <Txt variant="overline" color={colors.inkFaint} style={s.miniLabel}>Quantity</Txt>
            <TextInput
              value={qty} onChangeText={setQty} keyboardType="number-pad"
              style={s.miniInput} placeholderTextColor={colors.inkFaint}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.miniField}>
            <Txt variant="overline" color={colors.inkFaint} style={s.miniLabel}>
              Price paid · optional
            </Txt>
            <TextInput
              value={paid} onChangeText={setPaid} keyboardType="decimal-pad"
              placeholder="A$" placeholderTextColor={colors.inkFaint} style={s.miniInput}
            />
          </View>
        </View>
      </View>

      {v?.certNumber && (
        <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.sm }}>
          Cert {v.certNumber} · read off the label
        </Txt>
      )}

      {editing && (
        <Card style={{ marginTop: space.lg }}>
          <Txt variant="overline" color={colors.inkFaint}>Correct the reading</Txt>
          {/* Company, grade and printing live in the chips and pickers above;
            * repeating them here as free text is two places to disagree. */}
          {([
            ["name", "Card name"], ["setName", "Set"], ["number", "Number"],
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
          {form.grader ? ` · ${form.grader} ${form.grade ?? ""}` : " · ungraded"}
        </Txt>
        <Txt variant="price">{money(headline)}</Txt>
        {conversionNote(headline, fx, v?.currency ?? "USD") && (
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {conversionNote(headline, fx, v?.currency ?? "USD")}
          </Txt>
        )}

        {/* The evidence, beside the number rather than a tap away. A figure
          * from three sales and a figure from thirty are different claims and
          * only one of them should be acted on without checking. */}
        <View style={s.evidence}>
          {price && (
            <>
              <Evidence
                label="Based on"
                value={price.basis === "observed" ? "Completed sales" : price.method ?? price.basis}
              />
              <Evidence label="Sales counted" value={price.sampleSize ? String(price.sampleSize) : "—"} />
              <Evidence label="Confidence" value={String(price.confidence)} />
            </>
          )}
          {!price && ask && (
            <>
              <Evidence label="Based on" value="Asking prices" />
              <Evidence label="Live listings" value={String(ask.count)} />
              <Evidence label="Confidence" value="asks, not sales" />
            </>
          )}
        </View>

        {gradePoint && (gradePoint.low != null || gradePoint.high != null) && (
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.sm }}>
            Sales ranged {money(gradePoint.low)} to {money(gradePoint.high)}
            {gradePoint.median != null ? ` · median ${money(gradePoint.median)}` : ""}
            {gradePoint.asOf ? ` · updated ${new Date(gradePoint.asOf).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
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
          <Txt variant="h2">The {brand?.mark ?? form.grader} ladder</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginBottom: space.md }}>
            Each grade priced from its own sales. Never converted between companies.
          </Txt>
          <View style={s.ladder}>
            {ladder.map((row) => {
              const here = String(v?.slabGrade) === row.grade;
              return (
                <View key={row.grade} style={[s.rung, here && s.rungHere]}>
                  <Txt variant="h3" style={{ width: 92 }} numberOfLines={1}>
                    {gradeLabel(form.grader || v?.slabGrader, row.grade) || row.grade}
                  </Txt>
                  <Txt variant="body" style={{ flex: 1 }}>{money(row.price)}</Txt>
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

      {/* Sales, asks and what is for sale here. Loaded after this screen
        * paints — none of it should delay the figure above. */}
      <CardMarket
        card={{
          cardId: id?.cardId ?? null, name: form.name, setName: form.setName || null,
          number: form.number || null, game: id?.game ?? null,
          grader: form.grader || null, grade: form.grade || null,
          printing: id?.printing ?? null,
        }}
      />
    </Screen>
  );
}

/** A URL small enough to travel in a route param.
 *
 *  Anything else — a data: URI, a blob:, a file:// path from the phone — is
 *  dropped rather than carried, because it is either enormous or meaningless
 *  in another session. The full-size photograph stays in memory, where it
 *  already is. */
const linkable = (u?: string | null) =>
  u && /^https?:\/\//.test(u) && u.length < 300 ? u : "";

/** One labelled fact under the price. */
function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="overline" color={colors.inkFaint}>{label}</Txt>
      <Txt variant="bodySmall" color={colors.ink} numberOfLines={1}>{value}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  rejectHead: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  rejectShot: {
    marginTop: space.xl, borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
    padding: space.md,
  },
  rejectImg: { width: "100%", height: 300, borderRadius: radius.sm },
  fixes: { marginTop: space.xl, gap: space.sm },
  fixRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  badgeBad: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.downWash, borderWidth: 1, borderColor: colors.down,
  },
  compare: { flexDirection: "row", gap: space.md, marginTop: space.sm },
  compareCell: { flex: 1 },
  compareImg: {
    width: "100%", aspectRatio: 0.72, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  compareEmpty: { alignItems: "center", justifyContent: "center" },
  pair: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  miniField: {
    height: 58, paddingHorizontal: space.md, paddingTop: 15, justifyContent: "center",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  miniLabel: { position: "absolute", top: 8, left: space.md, fontSize: 11.5, letterSpacing: 0.1 },
  miniInput: { ...type.body, color: colors.ink, paddingVertical: 0 },
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
    height: 48, paddingHorizontal: space.md, ...type.body, color: colors.ink,
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  priceBlock: { marginTop: space.xl },
  evidence: {
    flexDirection: "row", gap: space.md, marginTop: space.md, padding: space.md,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  ladder: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  rung: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  rungHere: { backgroundColor: colors.accentWash },
});
