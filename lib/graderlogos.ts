import type { ImageSourcePropType } from "react-native";
import type { GraderId } from "./grading";

// The real logos, once they are in assets/graders/.
//
// Metro resolves require() at build time, so a missing file is a build error
// rather than a blank chip — which is why each line is added as the file
// lands rather than all seven up front. Anything not listed falls back to the
// drawn wordmark, so the app is never broken by a logo that has not arrived.
//
// Uncomment a line the moment its file exists:

export const GRADER_LOGOS: Partial<Record<GraderId, ImageSourcePropType>> = {
  // PSA: require("../assets/graders/psa.png"),
  // BGS: require("../assets/graders/bgs.png"),
  // CGC: require("../assets/graders/cgc.png"),
  // TAG: require("../assets/graders/tag.png"),
  // SGC: require("../assets/graders/sgc.png"),
  // ACE: require("../assets/graders/ace.png"),
  // AGS: require("../assets/graders/ags.png"),
};

export const logoFor = (id: GraderId): ImageSourcePropType | null =>
  GRADER_LOGOS[id] ?? null;
