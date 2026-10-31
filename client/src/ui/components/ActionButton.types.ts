import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type ActionButtonTone =
  | "primary"
  | "secondary"
  | "danger"
  | "destructive"
  | "ink"
  | "ai";

export type ActionButtonSize = "L" | "M" | "S";

export interface ActionButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ActionButtonTone;
  size?: ActionButtonSize;
  loading?: boolean;
  disabled?: boolean;
  blocked?: boolean;
  fill?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const SPINNER_DELAY_MS = 300;
