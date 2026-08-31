export { colors, palette } from "./colors";
export { type, fonts } from "./type";

/** 4pt grid. Every gap in the app is one of these. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
