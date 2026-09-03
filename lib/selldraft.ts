/** What the scan already knows, carried into the sell flow.
 *
 *  Nobody should re-type a card the app has just identified — and the grader,
 *  grade and cert it read off the label are exactly the fields a seller is
 *  most likely to get wrong from memory. */
export type DraftSeed = {
  catalogId?: string | null; cardName: string; setName?: string | null;
  cardNumber?: string | null; game?: string | null; imageUrl?: string | null;
  grader?: string | null; grade?: string | null; certNumber?: string | null;
  variant?: string | null;
  marketValue?: number | null;
};

let seed: DraftSeed | null = null;
export const setDraftSeed = (s: DraftSeed) => { seed = s; };
export const getDraftSeed = () => seed;
export const clearDraftSeed = () => { seed = null; };

/** The draft as it is being built across the five steps. */
export type Draft = DraftSeed & {
  listingId?: string;
  isRaw?: boolean;
  conditionNote?: string | null;
  price?: number;
  strategy?: string | null;
  delivery?: string[];
  suburb?: string | null;
  photos?: { angle: string; url: string }[];
};

let draft: Draft | null = null;
export const setDraft = (d: Draft) => { draft = d; };
export const patchDraft = (d: Partial<Draft>) => { draft = { ...(draft ?? {} as Draft), ...d }; };
export const getDraft = () => draft;
export const clearDraft = () => { draft = null; };
