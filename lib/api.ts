/** Where the backend lives.
 *
 *  EXPO_PUBLIC_ variables are inlined into the bundle at build time, which is
 *  fine for a base URL and is exactly why no key may ever travel this way. */
export const API =
  process.env.EXPO_PUBLIC_API_URL ?? "https://grail-market-backend.onrender.com";

export async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function get<T>(path: string) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}
