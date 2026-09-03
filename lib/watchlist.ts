import { get, post, del } from "./api";

// Following a card you do not own.
//
// The alert is a rule about movement rather than a price to hit, because a
// target has to be re-set by hand every time the market re-rates and a
// percentage does not.

export type Watch = {
  watchId: string; catalogId: string | null; cardName: string;
  setName: string | null; cardNumber: string | null; imageUrl: string | null;
  grader: string | null; grade: string | null;
  alertPct: number | null; alertDir: "any" | "up" | "down";
  value: number | null;
  /** movement since the last thing we told them — what the alert measures */
  since: number | null;
  baseline: number | null;
  addedAt: string;
};

export async function watchlist(): Promise<{ watches: Watch[]; priced: number }> {
  try {
    return await get("/watchlist");
  } catch { return { watches: [], priced: 0 }; }
}

export const follow = (w: {
  catalogId?: string | null; cardName: string; setName?: string | null;
  cardNumber?: string | null; imageUrl?: string | null;
  grader?: string | null; grade?: string | null;
  alertPct?: number | null; alertDir?: string;
}) => post<{ watchId?: string; error?: string; message?: string }>("/watchlist", w);

export const setAlert = (watchId: string, alertPct: number | null, alertDir: string) =>
  post<{ alertPct?: number | null; error?: string }>(
    `/watchlist/${encodeURIComponent(watchId)}/alert`, { alertPct, alertDir });

export const unfollow = (watchId: string) =>
  del<{ removed?: boolean }>(`/watchlist/${encodeURIComponent(watchId)}`);

export const registerPush = (token: string, platform: string) =>
  post<{ ok?: boolean }>("/push/register", { token, platform });
