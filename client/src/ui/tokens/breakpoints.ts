export const breakpoints = {
  compact: 768,
  stacked: 1024,
  wide: 1440,
} as const;

export type BreakpointName = keyof typeof breakpoints;
