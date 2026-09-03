// Graders, their scales, and the printing variants a card can be.
//
// Two rules from the backend hold here as well, and this file is where the app
// would break them if it were careless:
//
//  1. A grade belongs to (card + grading company). Nothing in here maps one
//     company's number onto another's — the ladders sit side by side and never
//     convert. Switching company clears the grade rather than carrying it.
//  2. The label wording is the company's own. PSA prints GEM-MT 10, BGS prints
//     PRISTINE 10 for a black label, CGC has both a Pristine 10 and a Gem Mint
//     10 and they are different cards at auction. Showing our own words for
//     their grade is how a listing ends up describing a slab it isn't.

export type GraderId = "RAW" | "PSA" | "BGS" | "CGC" | "TAG" | "SGC" | "ACE" | "AGS";

export type Grader = {
  id: GraderId;
  /** How the company writes its own name on the slab. */
  mark: string;
  full: string;
  /** The company's colour. Used on the chip whether or not it is selected —
   *  a row of identical grey chips is a dropdown wearing a costume, and the
   *  thing a seller is picking between is precisely the brands. */
  tint: string;
  onTint: string;
  /** A pale version of the tint, for the unselected state. */
  wash: string;
  /** Letter-spacing and weight differ per wordmark: PSA sets theirs tight
   *  and heavy, Beckett wide. Close enough to be recognised, drawn by us
   *  rather than copied. */
  tracking: number;
};

export const GRADERS: Grader[] = [
  { id: "RAW", mark: "Ungraded", full: "Raw · no slab", tint: "#5A6875", onTint: "#FFFFFF", wash: "#EEF1F4", tracking: 0.2 },
  { id: "PSA", mark: "PSA", full: "Professional Sports Authenticator", tint: "#C8102E", onTint: "#FFFFFF", wash: "#FCECEE", tracking: 1.6 },
  { id: "BGS", mark: "BECKETT", full: "Beckett Grading Services", tint: "#0B3D2E", onTint: "#FFFFFF", wash: "#EAF2EF", tracking: 1.2 },
  { id: "CGC", mark: "CGC", full: "Certified Guaranty Company", tint: "#1B4F9C", onTint: "#FFFFFF", wash: "#EBF1FA", tracking: 1.4 },
  { id: "TAG", mark: "TAG", full: "Technical Authentication & Grading", tint: "#111827", onTint: "#FFFFFF", wash: "#EDEEF1", tracking: 2.0 },
  { id: "SGC", mark: "SGC", full: "Sportscard Guaranty", tint: "#2B2B2B", onTint: "#FFFFFF", wash: "#EEEEEE", tracking: 1.4 },
  { id: "ACE", mark: "ACE", full: "ACE Grading", tint: "#7A5AA8", onTint: "#FFFFFF", wash: "#F3EFF9", tracking: 1.6 },
  { id: "AGS", mark: "AGS", full: "Automated Grading Systems", tint: "#0E7490", onTint: "#FFFFFF", wash: "#E9F4F7", tracking: 1.4 },
];

export const graderById = (id?: string | null) =>
  GRADERS.find((g) => g.id === (id ?? "").toUpperCase()) ?? null;

/** Each company's ladder, top first, written the way the company writes it. */
const LADDERS: Record<GraderId, { value: string; label: string }[]> = {
  RAW: [
    { value: "NM", label: "Near Mint" },
    { value: "LP", label: "Lightly Played" },
    { value: "MP", label: "Moderately Played" },
    { value: "HP", label: "Heavily Played" },
    { value: "DMG", label: "Damaged" },
  ],
  PSA: [
    { value: "10", label: "GEM-MT 10" },
    { value: "9", label: "MINT 9" },
    { value: "8", label: "NM-MT 8" },
    { value: "7", label: "NM 7" },
    { value: "6", label: "EX-MT 6" },
    { value: "5", label: "EX 5" },
    { value: "4", label: "VG-EX 4" },
    { value: "3", label: "VG 3" },
    { value: "2", label: "GOOD 2" },
    { value: "1.5", label: "FR 1.5" },
    { value: "1", label: "PR 1" },
  ],
  // Beckett's 10 is only a Black Label when all four subgrades are 10, which
  // is a different price entirely — so it is a separate rung, not a note.
  BGS: [
    { value: "10-BL", label: "PRISTINE 10 · Black Label" },
    { value: "10", label: "PRISTINE 10" },
    { value: "9.5", label: "GEM MINT 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8.5", label: "NM-MT+ 8.5" },
    { value: "8", label: "NM-MT 8" },
    { value: "7.5", label: "NM+ 7.5" },
    { value: "7", label: "NM 7" },
    { value: "6", label: "EX-MT 6" },
    { value: "5", label: "EX 5" },
  ],
  CGC: [
    { value: "10-P", label: "PRISTINE 10" },
    { value: "10", label: "GEM MINT 10" },
    { value: "9.5", label: "MINT+ 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8.5", label: "NM/MINT+ 8.5" },
    { value: "8", label: "NM/MINT 8" },
    { value: "7", label: "NEAR MINT 7" },
    { value: "6", label: "EX/NM 6" },
    { value: "5", label: "EXCELLENT 5" },
  ],
  TAG: [
    { value: "10", label: "PRISTINE 10" },
    { value: "9.5", label: "GEM MINT 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8.5", label: "NM-MT+ 8.5" },
    { value: "8", label: "NM-MT 8" },
    { value: "7", label: "NM 7" },
    { value: "6", label: "EX-MT 6" },
  ],
  SGC: [
    { value: "10-G", label: "GOLD 10" },
    { value: "10", label: "GEM MINT 10" },
    { value: "9.5", label: "MINT+ 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8.5", label: "NM-MT+ 8.5" },
    { value: "8", label: "NM-MT 8" },
    { value: "7", label: "NM 7" },
  ],
  ACE: [
    { value: "10", label: "PERFECT 10" },
    { value: "9.5", label: "GEM MINT 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8", label: "NM-MT 8" },
    { value: "7", label: "NM 7" },
  ],
  AGS: [
    { value: "10", label: "PRISTINE 10" },
    { value: "9.5", label: "GEM MINT 9.5" },
    { value: "9", label: "MINT 9" },
    { value: "8.5", label: "NM-MT+ 8.5" },
    { value: "8", label: "NM-MT 8" },
  ],
};

export const ladderFor = (grader: GraderId) => LADDERS[grader] ?? LADDERS.RAW;

/** The company's own wording for a grade, or the bare number if we don't know
 *  their word for it — never a word borrowed from another company. */
export function gradeLabel(grader?: string | null, grade?: string | null): string {
  if (!grade) return "";
  const g = graderById(grader);
  if (!g) return String(grade);
  const hit = ladderFor(g.id).find((x) => x.value === String(grade));
  return hit ? hit.label : String(grade);
}

export const VARIANTS = [
  { value: "normal", label: "Normal" },
  { value: "holo", label: "Holofoil" },
  { value: "reverse", label: "Reverse Holo" },
  { value: "1st", label: "1st Edition" },
  { value: "shadowless", label: "Shadowless" },
  { value: "alt", label: "Alternate Art" },
  { value: "full", label: "Full Art" },
  { value: "promo", label: "Promo" },
];

export const variantLabel = (v?: string | null) =>
  VARIANTS.find((x) => x.value === v)?.label ?? "Normal";
