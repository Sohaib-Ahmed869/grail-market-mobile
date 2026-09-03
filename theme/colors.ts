// GrailMarket_Brand_Assets_v1/brand_tokens.json is the source of truth. It
// supersedes the earlier brand sheet, which had slightly different values
// (#0F1B2A / #C8A868) and named Poppins — the approved pack is Inter.
export const palette = {
  navy: "#1A2632",
  gold: "#A88D60",
  white: "#FFFFFF",
  lightGray: "#F2F4F7",
} as const;

// The app runs light. Navy is the ink and the action; only the splash and the
// hero band are dark. Gold is an accent — it marks the one thing on a screen
// worth the eye, and stops meaning anything if it marks four.
export const colors = {
  ground: palette.lightGray,       // behind everything
  surface: palette.white,          // cards, sheets, fields
  surfaceSunk: "#F7F9FB",          // wells inside a surface

  ink: palette.navy,               // headings, primary text
  // Measured against the page, not chosen by eye. The previous pair read as
  // "quiet" on a design mock and as "washed out" on a phone in daylight:
  // inkFaint was 2.8:1 against the page, which is under half the 4.5 the
  // guidelines ask for — and it is the colour on every placeholder, hint,
  // timestamp and "not priced yet" in the app.
  //
  // Both are the same hue darkened rather than new colours, so nothing shifts
  // temperature — the greys still belong to the navy.
  inkMuted: "#4D5863",             // body and secondary — 7.0:1
  inkFaint: "#6A737D",             // captions, placeholders — 4.7:1
  line: "#E3E8ED",                 // hairlines WITHIN a surface
  lineStrong: "#D2DAE2",
  // The edge of a white thing sitting on a near-white page — a floating bar,
  // a card in a list. `line` is 1.2:1 against both and `lineStrong` 1.3:1;
  // neither is visible on a phone, and reaching for them for this job is a
  // mistake that has now been made three times. This is the one to use when
  // the border has to be seen rather than felt.
  outline: "#B5BEC7",

  accent: palette.gold,
  accentWash: "#FBF7F0",           // the cream panel behind a gold moment
  accentLine: "#EADFCB",

  // dark surfaces: splash, hero bands, primary buttons
  dark: palette.navy,
  darkRaised: "#22303E",
  onDark: palette.white,
  onDarkMuted: "#9FB0C0",

  // meaning. A falling price is information, not a fault, so it reads closer
  // to brick than to alarm.
  up: "#2C7A5B",
  upWash: "#EAF5F0",
  down: "#AE4A40",
  downWash: "#FBEEED",
  info: "#2F5D8A",
  infoWash: "#EEF4FA",

  onAccent: palette.navy,
  onPrimary: palette.white,

  // Inputs need to look like inputs. A 1.5px #E3E8ED hairline on white is
  // invisible at arm's length in daylight, which is how a form ends up
  // looking like a list of labels with nothing to type into.
  field: "#EDEFF2",
  // 1.8:1 was a border you could only find by looking for it. Still decoration
  // rather than text, so it does not need 4.5 — it needs to be visible.
  fieldLine: "#9DA4AB",
  fieldLineFocus: palette.navy,

  // The page is not flat white, but it is not blue either. The wash is the
  // brand's own light grey resolving to white — #F2F4F7 is in the pack, and
  // the cool blue that was here briefly belonged to some other product.
  washTop: "#E4E8EE",
  washMid: "#EFF1F5",
  washBottom: "#FAFBFC",
} as const;
