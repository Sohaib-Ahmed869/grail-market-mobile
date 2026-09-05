import { get, post, apiMessage } from "./api";
import { uploadViaSignedUrl } from "./market";

export type Reason = { code: string; label: string; side: "buyer" | "seller" | "both" };
export type Status = "open" | "answered" | "resolved" | "withdrawn";

export type Dispute = {
  dispute_id: string; listing_id: string; raised_by: string; against_id: string;
  raiser_role: "buyer" | "seller"; reason: string; detail: string | null;
  status: Status; outcome: string | null; outcome_note: string | null;
  created_at: string; updated_at: string;
  card_name?: string; image_url?: string | null; price?: string | null;
};

export type Event = {
  event_id: string; author_id: string; kind: "comment" | "evidence" | "status";
  body: string | null; photos: string[]; created_at: string;
};

/** What a status looks like to somebody reading it, rather than the word the
 *  database uses. "Answered" alone tells nobody what to do next. */
export const STATUS_LABEL: Record<Status, string> = {
  open: "Waiting for a reply",
  answered: "Both sides have spoken",
  resolved: "Settled",
  withdrawn: "Withdrawn",
};

export async function reasons(): Promise<Reason[]> {
  try {
    const r = await get<{ reasons?: Reason[] }>("/disputes/reasons");
    return r.reasons ?? [];
  } catch { return []; }
}

export async function myDisputes(): Promise<Dispute[]> {
  try {
    const r = await get<{ disputes?: Dispute[] }>("/disputes");
    return r.disputes ?? [];
  } catch { return []; }
}

export async function getDispute(
  id: string,
): Promise<{ dispute: Dispute; events: Event[] } | null> {
  try {
    const r = await get<{ dispute?: Dispute; events?: Event[] }>(`/disputes/${id}`);
    return r.dispute ? { dispute: r.dispute, events: r.events ?? [] } : null;
  } catch { return null; }
}

/** Raise it, then attach the evidence.
 *
 *  Two calls because the signed upload URLs are scoped to a dispute that does
 *  not exist until the first one returns. The person raising it sees one
 *  action; the photographs are the slow half and failing to upload one must
 *  not lose the dispute they just wrote. */
export async function raise(a: {
  listingId: string; reason: string; detail: string; photos: string[];
}): Promise<{ ok: true; disputeId: string; photosFailed: number } | { ok: false; message: string }> {
  let disputeId: string;
  try {
    const r = await post<{ disputeId?: string; error?: string; message?: string }>("/disputes", {
      listingId: a.listingId, reason: a.reason, detail: a.detail.trim() || null,
    });
    if (!r.disputeId) return { ok: false, message: r.message ?? "That didn't work." };
    disputeId = r.disputeId;
  } catch (e) {
    return { ok: false, message: apiMessage(e, "opening a dispute") };
  }

  const photosFailed = a.photos.length
    ? await attach(disputeId, a.photos, null).then((n) => a.photos.length - n)
    : 0;
  return { ok: true, disputeId, photosFailed };
}

/** Upload photographs and post them into the thread. Returns how many landed. */
export async function attach(
  disputeId: string, uris: string[], body: string | null,
): Promise<number> {
  let urls: string[] = [];
  if (uris.length) {
    try {
      const r = await post<{ uploads?: { uploadUrl: string; publicUrl: string }[] }>(
        `/disputes/${disputeId}/photo-urls`, { count: uris.length },
      );
      const uploads = r.uploads ?? [];
      const done = await Promise.all(
        uris.map(async (uri, i) => {
          const slot = uploads[i];
          if (!slot) return null;
          // Disputes still presign, because their evidence goes under a
          // different prefix and the web console uploads them too. Left as it
          // was rather than changed blind — see uploadPhoto's note.
          return (await uploadViaSignedUrl(slot.uploadUrl, uri)) ? slot.publicUrl : null;
        }),
      );
      urls = done.filter((u): u is string => u != null);
    } catch {
      urls = [];
    }
  }
  if (!urls.length && !body?.trim()) return 0;
  try {
    await post(`/disputes/${disputeId}/reply`, { body: body?.trim() || null, photos: urls });
    return urls.length;
  } catch { return 0; }
}

export async function reply(
  disputeId: string, body: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await post<{ ok?: boolean; message?: string }>(`/disputes/${disputeId}/reply`, {
      body, photos: [],
    });
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "sending that") };
  }
}

export async function withdraw(disputeId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await post<{ ok?: boolean; message?: string }>(`/disputes/${disputeId}/withdraw`, {});
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "withdrawing it") };
  }
}
