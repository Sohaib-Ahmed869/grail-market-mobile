import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { Loader } from "../../components/Loader";
import { Icon } from "../../components/Icon";
import { GraderBadge } from "../../components/GraderChips";
import { useToast } from "../../components/Toast";
import { editListing, getListing, num, type Listing } from "../../lib/market";
import { colors, radius, space, type } from "../../theme";

const DELIVERY = [
  { id: "pickup", label: "Pickup in person" },
  { id: "post", label: "Post — tracked" },
  { id: "insured", label: "Post — tracked and insured" },
];

/** Editing a listing that is already up.
 *
 *  Only the four things a seller can honestly change: price, condition note,
 *  delivery and suburb. The card, the grade and the certificate are what the
 *  listing IS — changing those after people have made offers would be a
 *  different card at the same address.
 *
 *  Market value sits beside the price box throughout, because the reason most
 *  people open this screen is that their card has sat unsold and the offers
 *  page told them why. */
export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [l, setL] = useState<Listing | null | undefined>(undefined);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [delivery, setDelivery] = useState<string[]>([]);
  const [suburb, setSuburb] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getListing(String(id)).then((x) => {
      setL(x);
      if (x) {
        setPrice(String(Math.round(Number(x.price))));
        setNote(x.condition_note ?? "");
        setDelivery(x.delivery ?? []);
        setSuburb(x.suburb ?? "");
      }
    });
  }, [id]);

  if (l === undefined) return <Screen back><Loader fill /></Screen>;
  if (l === null) {
    return (
      <Screen back>
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Listing Not Found</Txt>
      </Screen>
    );
  }

  const market = num(l.market_value);
  const asking = Number(price.replace(/[^\d.]/g, "")) || 0;
  const gap = market && asking ? Math.round(((asking - market) / market) * 100) : null;
  const was = Math.round(Number(l.price));
  const changed = asking !== was || note !== (l.condition_note ?? "")
    || suburb !== (l.suburb ?? "") || delivery.join() !== (l.delivery ?? []).join();

  const save = async () => {
    setBusy(true);
    const r = await editListing(String(id), {
      price: asking, conditionNote: note.trim(), delivery, suburb: suburb.trim(),
    });
    setBusy(false);
    if (r.error) { toast("That change could not be saved.", { tone: "bad" }); return; }
    toast(
      r.priceChanged
        ? `Price updated to A$${asking.toLocaleString()}. Anyone with an open offer has been told.`
        : "Listing updated.",
    );
    router.back();
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button label={busy ? "Saving" : "Save changes"} onPress={save}
            disabled={!changed || asking <= 0} loading={busy} />
          {!changed && (
            <Txt variant="bodySmall" color={colors.inkFaint} center>Nothing changed yet</Txt>
          )}
        </>
      }
    >
      <Txt variant="display" style={{ marginTop: space.sm }}>Edit Listing</Txt>

      <View style={s.card}>
        <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>{l.card_name}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
            {l.set_name ?? ""}{l.card_number ? ` · #${l.card_number}` : ""}
          </Txt>
        </View>
      </View>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Asking price
      </Txt>
      <View style={s.priceBox}>
        <Txt variant="h2" color={colors.inkFaint}>A$</Txt>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          selectTextOnFocus
          style={s.priceInput}
        />
      </View>
      <View style={s.reading}>
        {market != null ? (
          <>
            <Txt variant="bodySmall" color={colors.inkMuted}>
              Market value A${Math.round(market).toLocaleString()}
            </Txt>
            {gap != null && (
              <Txt variant="bodySmall" color={gap > 0 ? colors.down : colors.up}>
                · {gap === 0 ? "at market" : `${Math.abs(gap)}% ${gap > 0 ? "above" : "below"}`}
              </Txt>
            )}
          </>
        ) : (
          <Txt variant="bodySmall" color={colors.inkFaint}>No market value for this card yet</Txt>
        )}
      </View>
      {asking !== was && (
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          Was A${was.toLocaleString()} — everyone with an open offer will be told.
        </Txt>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Condition note
      </Txt>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Anything the photographs don't show"
        placeholderTextColor={colors.inkFaint}
        style={s.note}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        Getting it to the buyer
      </Txt>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {DELIVERY.map((d) => {
          const on = delivery.includes(d.id);
          return (
            <Pressable
              key={d.id}
              onPress={() => setDelivery((cur) =>
                cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id])}
              style={[s.opt, on && s.optOn]}
            >
              <View style={[s.tick, on && s.tickOn]}>
                {on && <Icon name="verified" size={12} color={colors.onPrimary} filled />}
              </View>
              <Txt variant="body" color={on ? colors.ink : colors.inkMuted}>{d.label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>Suburb</Txt>
      <TextInput
        value={suburb}
        onChangeText={setSuburb}
        placeholder="Where a pickup would happen"
        placeholderTextColor={colors.inkFaint}
        style={s.field}
      />

      <View style={{ marginTop: space.lg }}>
        <Note icon="info">
          The card, its grade and its certificate can&rsquo;t be changed — a listing that
          becomes a different card after people have offered on it is not the same
          listing. Withdraw and start again if you photographed the wrong one.
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.lg, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surfaceSunk,
  },
  priceBox: {
    flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 4,
    paddingHorizontal: space.md, height: 62,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  priceInput: {
    flex: 1, ...type.price, fontSize: 28, lineHeight: 34,
    fontVariant: ["tabular-nums" as const], color: colors.ink, paddingVertical: 0,
  },
  reading: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  note: {
    ...type.body, color: colors.ink, minHeight: 88, padding: space.md, marginTop: 4,
    textAlignVertical: "top",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  field: {
    ...type.body, color: colors.ink, height: 52, paddingHorizontal: space.md, marginTop: 4,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  opt: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
  },
  optOn: { borderColor: colors.ink, backgroundColor: colors.surfaceSunk },
  tick: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.lineStrong,
    alignItems: "center", justifyContent: "center",
  },
  tickOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
