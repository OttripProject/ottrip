export type BurstEffect =
  | "confetti"
  | "poof"
  | "sparkle"
  | "check"
  | "complete";

export const TOAST_ELEMENT_ID = "ottrip-toast";

export function playBurst(_effect: BurstEffect) {}
