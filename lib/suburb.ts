/** Is this suburb usable, and if not, why.
 *
 *  The rule is the backend's — `suburbProblem` in grail-market-backend
 *  src/listings/nearby.ts — duplicated here because mobile is its own repo and
 *  does not consume the shared package. The server refuses a bad suburb either
 *  way; this exists so the seller is told at the field rather than after a
 *  round trip. If one side changes, change both.
 *
 *  A suburb, never an address. The point the server keeps is the suburb's
 *  CENTRE, no more precise than the name the seller already publishes. A street
 *  address typed here would be geocoded to their door, and every other privacy
 *  decision in the feature would be beside the point.
 *
 *  The test is a leading house or unit number, not street words: "St Kilda",
 *  "St Leonards" and "St Marys" are real suburbs, and "1770" is a town in
 *  Queensland, so neither "st" nor a bare number can be refused.
 */
const HOUSE_NUMBER = /^\s*(?:unit|apt|apartment|flat|shop|lot)?\s*\d+[a-z]?\s*(?:[/-]\s*\d+[a-z]?\s*)?\s+\S/i;

export function suburbProblem(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return "A suburb is required, so buyers can see how far away the card is.";
  if (s.length > 60) return "That looks like a full address. The suburb on its own is enough.";
  if (HOUSE_NUMBER.test(s)) return "Enter the suburb only, not a street address.";
  return null;
}
