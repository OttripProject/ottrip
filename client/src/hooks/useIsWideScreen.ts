import { useWindowDimensions } from "react-native";

/**
 * Returns true if the screen width is considered "wide" (tablet / web split view).
 * Default breakpoint: 768px
 */
export function useIsWideScreen(breakpoint = 768): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}
