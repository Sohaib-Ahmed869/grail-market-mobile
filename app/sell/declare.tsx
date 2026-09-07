import { useState, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { SellSteps } from "../../components/SellSteps";
import { clearDraft, getDraft, patchDraft } from "../../lib/selldraft";
import { useSession } from "../../lib/session";
import { useToast } from "../../components/Toast";
import { createDraft, photoUrls, savePhotos, submitListing, uploadPhoto } from "../../lib/market";
import { colors, radius, space } from "../../theme";

/** The four statements, ticked one at a time.
 *
 *  One box covering all four is a box nobody reads. Separated, each one has to
 *  be considered on its own — and each is a specific claim a person made under
 *  their verified name, which is what makes the last line on this screen true
 *  rather than decorative. */
const STATEMENTS = [
  { id: "own", text: "I own this card and it is in my possession right now." },
  { id: "photos", text: "Every photograph is of this exact card, taken by me." },
  { id: "genuine", text: "To the best of my knowledge the card and, if slabbed, its case and label are genuine and untampered with." },
  { id: "disclosed", text: "I have disclosed every fault I know of — creases, whitening, scratches, a cracked case." },
] as const;

export default function SellDeclare() {
  const router = useRouter();
  const session = useSession();
  const draft = getDraft();
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const toast = useToast();

  /* Arriving here with nothing to show.
   *
   * A mount-time question — "did you reach this screen without a draft?" —
   * and it has to stay one. Written as a live check on the draft, it also
   * fired when the draft was cleared ON PURPOSE: submitting replaces this
   * route with the confirmation, every screen still on the sell stack
   * re-renders as the navigator changes, this one read a draft that had just
   * been cleared by a SUCCESSFUL submit, and sent the seller back to
   * `/sell/card`. The listing was created and in review, and the app looked
   * like it had thrown the form away and reopened it — so the same card
   * could be filled in and submitted over and over.
   *
   * Read once, on the first render, before any of that can happen.
   *
   * It also called router.replace() during RENDER, which updates the
   * navigation container while React is drawing this component. Rendering
   * has to be free of side effects; the redirect belongs in an effect.
   *
   * Still returns null immediately, so the empty screen never flashes. */
  const [arrivedWithDraft] = useState(() => Boolean(getDraft()));
  useEffect(() => {
    if (!arrivedWithDraft) router.replace("/sell/card");
  }, [arrivedWithDraft, router]);
  // Two different conditions, kept apart on purpose. The one above decides
  // whether to NAVIGATE and is answered once, at mount. This one only decides
  // whether there is anything to DRAW, and is answered live — because a
  // successful submit clears the draft while this screen is still on the
  // stack, and reading `.photos` off a null is how that would crash instead.
  if (!draft) return null;

  const all = ticked.length === STATEMENTS.length;
  const toggle = (id: string) =>
    setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const submit = async () => {
    setBusy(true);
    try {
      // 1. The draft. It has to exist before a photograph can belong to it.
      setStep("Creating the listing");
      let listingId = draft.listingId;
      if (!listingId) {
        const r = await createDraft({
          catalogId: draft.catalogId ?? null, cardName: draft.cardName,
          setName: draft.setName ?? null, cardNumber: draft.cardNumber ?? null,
          game: draft.game ?? null,
          // The scan's own photograph can be a data: URI on web — the whole
          // image inline. The listing's pictures are the ten uploaded to S3
          // below; this field only ever holds a catalogue URL.
          imageUrl: /^https?:\/\//.test(draft.imageUrl ?? "") ? draft.imageUrl! : null,
          grader: draft.grader ?? null, grade: draft.grade ?? null,
          certNumber: draft.certNumber ?? null, variant: draft.variant ?? null,
          isRaw: Boolean(draft.isRaw),
          conditionNote: draft.conditionNote ?? null,
          price: draft.price ?? 0, marketValue: draft.marketValue ?? null,
          strategy: draft.strategy ?? null, delivery: draft.delivery ?? [],
          suburb: draft.suburb ?? null,
        });
        if (r.error === "no-plan") {
          setBusy(false);
          router.push("/plans");
          return;
        }
        if (!r.listingId) {
          toast(r.message ?? "The listing could not be created.", { tone: "bad" });
          setBusy(false);
          return;
        }
        listingId = r.listingId;
        patchDraft({ listingId });
      }

      // 2. The photographs, straight to storage. A failure here costs the
      //    Photo Verified mark, not the listing — so it is reported, not
      //    thrown, and the seller can add them again from My listings.
      const shots = draft.photos ?? [];
      if (shots.length) {
        setStep(`Uploading ${shots.length} photo${shots.length === 1 ? "" : "s"}`);
        // Straight to our API, one at a time. No presign round trip, and the
        // failure is now visible: a photograph that does not land is counted
        // and reported rather than silently dropped, which is how a listing
        // reached the review queue with none of them.
        const done: { angle: string; url: string }[] = [];
        for (const [i, local] of shots.entries()) {
          setStep(`Uploading photo ${i + 1} of ${shots.length}`);
          const url = await uploadPhoto(listingId, local.angle, local.url);
          if (url) done.push({ angle: local.angle, url });
        }
        if (done.length) await savePhotos(listingId, done);
        if (done.length < shots.length) {
          toast(
            done.length === 0
              ? "No photographs could be uploaded. The listing was saved as a draft — add them from My listings."
              : `${shots.length - done.length} of ${shots.length} photographs could not be uploaded.`,
            { tone: "bad" },
          );
        }
      }

      // 3. Into the queue. Nothing reaches a buyer without a human looking.
      setStep("Sending for review");
      const sub = await submitListing(listingId);
      if (sub.error) {
        toast(sub.message ?? "The listing was created but could not be submitted.", { tone: "bad" });
        setBusy(false);
        return;
      }
      clearDraft();
      toast("Sent for review. Usually under 24 hours.");
      router.replace({ pathname: "/sell/submitted", params: { id: listingId } });
    } catch {
      toast("Something went wrong. Nothing was lost — try again.", { tone: "bad" });
    } finally {
      setBusy(false);
      setStep("");
    }
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button
            label={busy ? (step || "Submitting") : "Submit for review"}
            onPress={submit}
            disabled={!all}
            loading={busy}
          />
          {!all && (
            <Txt variant="bodySmall" color={colors.inkFaint} center>
              {STATEMENTS.length - ticked.length} left to agree
            </Txt>
          )}
        </>
      }
    >
      <SellSteps step={5} />
      <Txt variant="display" style={{ marginTop: space.lg }}>Before It Goes Up</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Four statements. Read each one — you are agreeing to them under the name on
        your verified ID.
      </Txt>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        {STATEMENTS.map((st) => {
          const on = ticked.includes(st.id);
          return (
            <Pressable key={st.id} onPress={() => toggle(st.id)} style={[s.row, on && s.rowOn]}>
              <View style={[s.box, on && s.boxOn]}>
                {on && <Feather name="check" size={12} color={colors.onPrimary} />}
              </View>
              <Txt variant="bodySmall" color={on ? colors.ink : colors.inkMuted} style={{ flex: 1 }}>
                {st.text}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={s.signature}>
        <Feather name="edit-3" size={14} color={colors.inkFaint} />
        <View style={{ flex: 1 }}>
          <Txt variant="overline" color={colors.inkFaint}>Signed as</Txt>
          <Txt variant="h3" style={{ marginTop: 1 }}>{session?.name ?? "—"}</Txt>
        </View>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note tone="bad" icon="alert-octagon">
          Knowingly selling a counterfeit or misrepresented card is fraud. Accounts are
          identity-verified, so we can and do refer these to NSW Police, and the listing
          record — photos, price, declaration — goes with the referral.
        </Note>
      </View>

    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row", gap: space.md, alignItems: "flex-start",
    padding: space.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.ink, backgroundColor: colors.surfaceSunk },
  box: {
    width: 20, height: 20, borderRadius: 5, marginTop: 1,
    borderWidth: 1.5, borderColor: colors.lineStrong,
    alignItems: "center", justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  signature: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.xl, padding: space.md,
    borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong,
  },
});
