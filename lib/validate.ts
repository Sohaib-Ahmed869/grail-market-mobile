/** Field validation for the signup form.
 *
 *  Kept out of the screen so the rules can be read in one place and tested
 *  without mounting anything. Every function returns an error string or null,
 *  because a message the user can act on is the actual output — a boolean
 *  forces the screen to invent the wording, and it invents it differently in
 *  each place.
 */

/** Australian mobile numbers: 04xx xxx xxx locally, +61 4xx xxx xxx in
 *  international form. Landlines cannot receive the SMS code, so they are
 *  rejected here rather than at the gateway, where it costs a message. */
export function normalisePhone(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, "");
  const m =
    /^\+?61(4\d{8})$/.exec(d) ??      // +61 4xx xxx xxx
    /^0(4\d{8})$/.exec(d) ??          // 04xx xxx xxx
    /^(4\d{8})$/.exec(d);             // 4xx xxx xxx
  return m ? `+61${m[1]}` : null;
}

export function nameError(v: string): string | null {
  const t = v.trim();
  if (!t) return "Enter your full name.";
  // The ID check matches this against a government document, so a single word
  // fails the match far more often than it passes.
  if (!/\s/.test(t)) return "Enter your full name, as it appears on your ID.";
  if (t.length < 3) return "That name looks too short.";
  if (/\d/.test(t)) return "Names do not contain numbers.";
  return null;
}

export function emailError(v: string): string | null {
  const t = v.trim();
  if (!t) return "Enter your email.";
  // Deliberately loose. The only authority on whether an address exists is
  // whether mail to it arrives, and strict patterns reject real addresses —
  // apostrophes, plus-addressing, long new TLDs.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(t)) return "That email does not look right.";
  return null;
}

export function phoneError(v: string): string | null {
  if (!v.trim()) return "Enter your mobile number.";
  if (!normalisePhone(v)) return "Enter an Australian mobile, like 0412 884 019.";
  return null;
}

export function passwordError(v: string): string | null {
  if (!v) return "Choose a password.";
  // Length is the rule that actually matters. Character-class requirements
  // push people toward Passw0rd! — predictable, and no harder to guess.
  if (v.length < 10) return "Use at least 10 characters.";
  if (/^\d+$/.test(v)) return "Digits alone are easy to guess. Add some words.";
  if (COMMON.has(v.toLowerCase())) return "That password is one of the most common. Pick another.";
  return null;
}

export function confirmError(pw: string, confirm: string): string | null {
  if (!confirm) return "Type your password again.";
  if (pw !== confirm) return "These do not match.";
  return null;
}

/** A short list is enough here: it catches the passwords that appear in every
 *  breach corpus without pretending to be a real breach check. */
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyuiop", "letmein123", "iloveyou1", "welcome123", "admin12345",
  "abc12345", "pokemon123", "charizard1", "trustno1234",
]);

export type SignUpForm = {
  name: string; email: string; phone: string; password: string; confirm: string;
};

export function validateSignUp(f: SignUpForm) {
  return {
    name: nameError(f.name),
    email: emailError(f.email),
    phone: phoneError(f.phone),
    password: passwordError(f.password),
    confirm: confirmError(f.password, f.confirm),
  };
}

export const isClean = (e: Record<string, string | null>) =>
  Object.values(e).every((v) => v == null);

/** How solid a password is, in three steps rather than a percentage.
 *
 *  0 nothing usable · 1 too short or guessable · 2 acceptable · 3 comfortable.
 *  Length does nearly all the work, because it is the only property that
 *  reliably costs an attacker anything. */
export function passwordStrength(v: string): number {
  if (!v) return 0;
  if (passwordError(v)) return 1;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length;
  return v.length >= 16 || (v.length >= 12 && variety >= 3) ? 3 : 2;
}
