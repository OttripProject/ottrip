import { textStyles } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ErrorTriangleIcon from "../../assets/error_triangle.svg";
import RetryIcon from "../../assets/retry.svg";

interface AiAnalyzeErrorBannerProps {
  onRetry?: () => void;
  message?: string;
  showTitle?: boolean;
  showRetry?: boolean;
}

export default function AiAnalyzeErrorBanner({
  onRetry,
  message,
  showTitle = true,
  showRetry = true,
}: AiAnalyzeErrorBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ErrorTriangleIcon width={16} height={16} style={styles.icon} />
        <View style={styles.textBlock}>
          {showTitle && <Text style={styles.title}>분석 실패</Text>}
          <Text style={[styles.subtitle, !showTitle && styles.subtitleNoTitle]}>
            {message ?? "첨부 파일에서 일정 정보를 읽지 못했어요. 더 선명한 자료로 다시 시도해 주세요."}
          </Text>
        </View>
      </View>
      {showRetry && onRetry && (
        <View style={styles.bottomRow}>
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <RetryIcon width={12} height={12} style={styles.retryIcon} />
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgb(255, 241, 239)",
    borderWidth: 1,
    borderColor: "rgb(251, 217, 211)",
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  icon: {
    flexShrink: 0,
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...textStyles.h8,
    color: "rgb(192, 57, 43)",
  },
  subtitle: {
    ...textStyles.body6,
    color: "rgb(154, 44, 32)",
    marginTop: 2,
  },
  subtitleNoTitle: {
    marginTop: 0,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgb(242, 187, 177)",
    backgroundColor: "rgb(255, 255, 255)",
    gap: 5,
  },
  retryBtnPressed: {
    opacity: 0.7,
  },
  retryIcon: {
    flexShrink: 0,
  },
  retryBtnText: {
    ...textStyles.h9,
    color: "rgb(192, 57, 43)",
  },
});
