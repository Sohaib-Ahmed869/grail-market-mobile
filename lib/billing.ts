import * as WebBrowser from "expo-web-browser";
import { get, post } from "./api";

export type PlanId = "starter" | "collector" | "dealer";

export type Plan = {
  id: PlanId; name: string; blurb: string;
  amountCents: number; listings: number | null;
  perks: string[]; popular?: boolean;
};

/** The plans come from the backend, not a copy in here.
 *
 *  Two lists of prices is one list of prices and one lie. The figures are
 *  charged by Stripe and described by the backend; the app renders whatever it
 *  is given. */
export async function fetchPlans(): Promise<{ configured: boolean; plans: Plan[] }> {
  try {
    return await get<{ configured: boolean; plans: Plan[] }>("/billing/plans");
  } catch {
    return { configured: false, plans: [] };
  }
}

export type CheckoutResult =
  | { outcome: "returned" }        // the browser came back — says nothing about payment
  | { outcome: "dismissed" }
  | { outcome: "failed"; message: string };

/** Open Stripe Checkout and wait for the browser to come back.
 *
 *  openAuthSessionAsync rather than openBrowserAsync: it watches for our own
 *  scheme and closes itself when Stripe redirects there, which is what returns
 *  the member to the app rather than stranding them on a web page.
 *
 *  What it returns is NOT proof of payment. Landing on the success URL only
 *  means a browser reached it. Entitlement is written by the Stripe webhook
 *  and read back from our own backend. */
export async function startCheckout(userId: string, planId: PlanId): Promise<CheckoutResult> {
  let url: string;
  try {
    const r = await post<{ url?: string; message?: string }>(
      "/billing/checkout", { planId, userId }, { "x-user-id": userId },
    );
    if (!r.url) return { outcome: "failed", message: r.message ?? "Could not start checkout." };
    url = r.url;
  } catch {
    return { outcome: "failed", message: "Could not reach the server. Check your connection." };
  }

  try {
    const res = await WebBrowser.openAuthSessionAsync(url, "grailmarket://plans/done");
    return res.type === "success" ? { outcome: "returned" } : { outcome: "dismissed" };
  } catch {
    return { outcome: "failed", message: "Could not open the payment page." };
  }
}

export type Subscription = { plan_id: PlanId | null; status: string };

export async function fetchSubscription(userId: string): Promise<Subscription> {
  try {
    return await get<Subscription>(`/billing/subscription/${encodeURIComponent(userId)}`);
  } catch {
    return { plan_id: null, status: "none" };
  }
}

/** Wait for Stripe's webhook to reach our backend.
 *
 *  Same shape as the identity wait, and for the same reason: the redirect and
 *  the webhook are separate journeys, and the browser usually wins the race. */
export async function awaitSubscription(
  userId: string, { timeoutMs = 30_000, everyMs = 2_000 } = {},
): Promise<Subscription> {
  const until = Date.now() + timeoutMs;
  let last: Subscription = { plan_id: null, status: "none" };
  while (Date.now() < until) {
    last = await fetchSubscription(userId);
    if (last.status === "active" || last.status === "trialing") return last;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return last;
}
