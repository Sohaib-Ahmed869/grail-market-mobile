/** Where the backend lives.
 *
 *  EXPO_PUBLIC_ variables are inlined into the bundle at build time, which is
 *  fine for a base URL and is exactly why no key may ever travel this way. */
import { authHeader } from "./session";

/** The AWS box, not Render.
 *
 *  Render runs the API but not the vision service, so a scan there answers
 *  "vision service unreachable" — the detection and OCR pipeline needs
 *  hardware Render's plan does not provide. Everything else works on either,
 *  but the scan is the product, so the app points at the box that can do it. */
export const API =
  process.env.EXPO_PUBLIC_API_URL ?? "https://grailmarket.duckdns.org";

export async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(), ...headers },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function get<T>(path: string) {
  const res = await fetch(`${API}${path}`, { headers: { ...authHeader() } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}
