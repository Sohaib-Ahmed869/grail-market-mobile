import { API, get } from "./api";
import { authHeader } from "./session";

// Getting help, and reporting somebody.
//
// Two errands through one desk, because to the person typing they are the
// same act — something is wrong and they want a human. The difference is
// where it lands: a question starts at tier 1, a report skips tier 1 entirely
// and goes to trust and safety, who can actually look up the people involved.
//
// Everything posts multipart. The photographs are usually the point — a
// screenshot of the message, the card that turned up, the packaging — and the
// presigned-URL path this app used before could not send a local file at all.

export type TicketKind = "support" | "report";

export type TicketSummary = {
  ticket_id: string;
  kind: TicketKind;
  subject: string;
  category: string;
  status: "new" | "open" | "waiting" | "resolved";
  created_at: string;
  updated_at: string;
  listing_id: string | null;
  last_body: string | null;
  last_author: "member" | "agent" | "system" | null;
  last_at: string | null;
};

export type TicketMessage = {
  message_id: string;
  author: "member" | "agent" | "system";
  author_name: string | null;
  body: string;
  photos: string[] | null;
  created_at: string;
};

export type TicketDetail = {
  ticket: TicketSummary & { tier: string; priority: string; about_user_id: string | null };
  messages: TicketMessage[];
};

/** What the server will accept, asked rather than assumed — an app offering a
 *  category this build rejects is a form that fails on submit. */
export async function supportOptions(): Promise<{ kinds: TicketKind[]; categories: string[] }> {
  try {
    return await get("/support/options");
  } catch {
    return { kinds: ["support", "report"], categories: ["Something else"] };
  }
}

export async function myTickets(): Promise<TicketSummary[]> {
  try {
    const r = await get<{ tickets?: TicketSummary[] }>("/support");
    return r.tickets ?? [];
  } catch {
    return [];
  }
}

export async function ticket(id: string): Promise<TicketDetail | null> {
  try {
    return await get<TicketDetail>(`/support/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

/** Attach local photographs to a form the way React Native can actually send
 *  them: `{ uri, name, type }`, never a Blob. */
function attach(form: FormData, photos: string[]) {
  photos.forEach((uri, i) => {
    form.append("photos", {
      uri, name: `evidence-${i}.jpg`, type: "image/jpeg",
    } as unknown as Blob);
  });
}

export async function fileTicket(t: {
  kind: TicketKind;
  subject: string;
  category: string;
  body: string;
  listingId?: string | null;
  aboutUserId?: string | null;
  photos?: string[];
}): Promise<{ ticketId?: string; message?: string; error?: string }> {
  try {
    const form = new FormData();
    form.append("kind", t.kind);
    form.append("subject", t.subject);
    form.append("category", t.category);
    form.append("body", t.body);
    if (t.listingId) form.append("listingId", t.listingId);
    if (t.aboutUserId) form.append("aboutUserId", t.aboutUserId);
    attach(form, t.photos ?? []);
    // No Content-Type: fetch sets the multipart boundary itself.
    const r = await fetch(`${API}/support`, {
      method: "POST", headers: { ...authHeader() }, body: form,
    });
    return await r.json();
  } catch {
    return { error: "network", message: "That could not be sent. Check your connection." };
  }
}

export async function replyToTicket(
  id: string, body: string, photos: string[] = [],
): Promise<boolean> {
  try {
    const form = new FormData();
    form.append("body", body);
    attach(form, photos);
    const r = await fetch(`${API}/support/${encodeURIComponent(id)}/reply`, {
      method: "POST", headers: { ...authHeader() }, body: form,
    });
    const j = await r.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}
