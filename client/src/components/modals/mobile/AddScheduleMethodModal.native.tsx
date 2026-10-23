import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatIcon from "../../../../assets/chat.svg";
import CloseIcon from "../../../../assets/close_line.svg";
import RightArrowIcon from "../../../../assets/right_arrow.svg";
import ManualIcon from "../../../../assets/update.svg";

const SHEET_CONTENT_HEIGHT = 264;

interface AddScheduleMethodModalProps {
  visible: boolean;
  onClose: () => void;
  /** 직접 입력 — AddScheduleModal 연결 */
  onSelectDirectAdd: () => void;
  /** AI 간편 추가 (추후 연동, 현재는 비움) */
  onSelectAiAdd?: () => void;
}

export default function AddScheduleMethodModal({
  visible,
  onClose,
  onSelectDirectAdd,
  onSelectAiAdd,
}: AddScheduleMethodModalProps) {
  const insets = useSafeAreaInsets();

  const handleDirect = () => {
    onSelectDirectAdd();
  };

  const handleAi = () => {
    onSelectAiAdd?.();
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={
        SHEET_CONTENT_HEIGHT +
        Math.max(insets.bottom, spacing["2xl"]) +
        spacing.md
      }
      showDragHandle
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>일정 추가 방법 선택</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <CloseIcon width={24} height={24} color={colors.gray600} />
          </Pressable>
        </View>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={handleDirect}
            accessibilityRole="button"
          >
            <View style={styles.iconBox}>
              <View style={[styles.icon, styles.iconManual]}>
                <ManualIcon width={18} height={18} color={colors.white} />
              </View>
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle}>직접 입력</Text>
              <Text style={styles.cardSubtitle}>
                상세 정보를 직접 입력하세요
              </Text>
            </View>
            <RightArrowIcon
              width={17}
              height={17}
              color={colors.paletteChevron}
              style={styles.chevron}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={handleAi}
            accessibilityRole="button"
          >
            <View style={styles.iconBox}>
              <View style={[styles.icon, styles.iconAi]}>
                <ChatIcon width={18} height={18} color={colors.white} />
              </View>
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle}>대화로 일정 추가</Text>
              <Text style={styles.cardSubtitle}>
                대화하거나 파일을 첨부하면 AI가 등록해요
              </Text>
            </View>
            <RightArrowIcon
              width={17}
              height={17}
              color={colors.paletteChevron}
              style={styles.chevron}
            />
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 0,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.paletteInk,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: "auto",
    marginRight: -spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.paletteFillSoft,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconManual: {
    backgroundColor: colors.paletteInk,
  },
  iconAi: {
    backgroundColor: colors.aiGrad[0],
    experimental_backgroundImage: `linear-gradient(135deg, ${colors.aiGrad[0]} 0%, ${colors.aiGrad[1]} 100%)`,
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  cardSubtitle: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    marginTop: spacing.xs,
    color: colors.paletteFg2,
  },
  chevron: {
    marginTop: spacing.lg,
  },
});
