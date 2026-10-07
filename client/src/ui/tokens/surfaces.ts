import { Platform, type ViewStyle } from "react-native";
import { colors } from "./colors";
import { shadows } from "./shadows";

const linearGradient = ([from, to]: readonly [string, string]) =>
  Platform.OS === "web"
    ? ({
        backgroundImage: `linear-gradient(${from} 0%, ${to} 100%)`,
      } as ViewStyle)
    : {};

export const surfaces = {
  outline: {
    backgroundColor: colors.white,
    ...shadows.xs,
  } as ViewStyle,
  dark: {
    backgroundColor: colors.gray900,
    ...linearGradient(colors.gradientDark),
    ...shadows.dark,
  } as ViewStyle,
  primary: {
    backgroundColor: colors.primary,
    ...linearGradient(colors.gradientPrimary),
    ...shadows.primary,
  } as ViewStyle,
};

export type SurfaceName = keyof typeof surfaces;
