import { breakpoints } from "@/ui/tokens/breakpoints";
import { useWindowDimensions } from "react-native";

export type LayoutTier = "compact" | "stacked" | "desktop" | "wide";

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  const tier: LayoutTier =
    width < breakpoints.compact
      ? "compact"
      : width < breakpoints.stacked
        ? "stacked"
        : width < breakpoints.wide
          ? "desktop"
          : "wide";

  return {
    width,
    tier,
    isCompact: width < breakpoints.compact,
    // compact를 포함한다 (좌우 분할을 쓰지 않는 모든 폭)
    isStacked: width < breakpoints.stacked,
  };
}
