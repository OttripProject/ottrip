import { loadPublicEnv } from "@/core/env/schema";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CloseIcon from "../../assets/close_sm.svg";

const APP_STORE_URL = "https://apps.apple.com/kr/app/id6762745828";
const STORE_FALLBACK_DELAY_MS = 1500;

const APP_SCHEME_BY_CHANNEL = {
  prod: "ottrip",
  dev: "ottrip-alpha",
  local: "ottrip-local",
} as const;

const isIosMobileBrowser = () =>
  Platform.OS === "web" &&
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent);

type Props = {
  path: string;
};

export default function AppOpenBanner({ path }: Props) {
  const [visible, setVisible] = useState(isIosMobileBrowser);

  if (!visible) return null;

  const handleOpen = () => {
    const scheme = APP_SCHEME_BY_CHANNEL[loadPublicEnv().EXPO_PUBLIC_CHANNEL];
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.location.href = APP_STORE_URL;
      }
    }, STORE_FALLBACK_DELAY_MS);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") window.clearTimeout(timer);
      },
      { once: true },
    );
    window.location.href = `${scheme}://${path}`;
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setVisible(false)}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="배너 닫기"
      >
        <CloseIcon width={12} height={12} color={colors.gray600} />
      </Pressable>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.icon}
        resizeMode="cover"
      />
      <View style={styles.textArea}>
        <Text style={styles.title}>오티트립</Text>
        <Text style={styles.description}>
          앱에서 일정을 더 편하게 확인하세요
        </Text>
      </View>
      <Pressable
        onPress={handleOpen}
        style={styles.openButton}
        accessibilityRole="button"
        accessibilityLabel="앱에서 열기"
      >
        <Text style={styles.openButtonText}>열기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
    paddingLeft: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  closeButton: {
    padding: spacing.xs,
  },
  icon: {
    width: spacing["2xl"] + spacing.sm,
    height: spacing["2xl"] + spacing.sm,
    borderRadius: radii.base,
  },
  textArea: {
    flex: 1,
  },
  title: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  description: {
    ...textStyles.body6,
    color: colors.gray700,
  },
  openButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  openButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
});
