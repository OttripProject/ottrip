import type { CreatePlanRequest, Plan } from "@/types/api";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CheckIcon from "../../../../assets/check_black.svg";
import DeleteIcon from "../../../../assets/delete_gray.svg";
import UpdateIcon from "../../../../assets/update.svg";

const DRAG_HANDLE_HEIGHT = 32;
const HEADER_HEIGHT = 38;
const LIST_PADDING = spacing.md + spacing.xs;
const ROW_HEIGHT = 68;
const ROW_GAP = spacing.xs;
const EMPTY_HEIGHT = 104;
const FOOTER_HEIGHT = 54;

function formatPlanDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const endFormat = start.isSame(end, "year") ? "M.DD" : "YYYY.M.DD";
  return `${start.format("YYYY.M.DD")} – ${end.format(endFormat)}`;
}

interface PlanSelectModalProps {
  visible: boolean;
  onClose: () => void;
  plans: Plan[];
  selectedPlan: Plan | null;
  onSelectPlan: (plan: Plan) => void;
  addPlan?: (data: CreatePlanRequest) => Promise<Plan>;
  onAddTrip?: () => void;
  onAddTripPress?: () => void;
  onEditPlan?: (plan: Plan) => void;
  onDeletePlan?: (plan: Plan) => void;
}

export default function PlanSelectModal({
  visible,
  onClose,
  plans = [],
  selectedPlan,
  onSelectPlan,
  addPlan,
  onAddTrip,
  onAddTripPress,
  onEditPlan,
  onDeletePlan,
}: PlanSelectModalProps) {
  const handleAddTripPress = () => {
    if (addPlan && onAddTripPress) {
      onAddTripPress();
      return;
    }
    if (onAddTrip) {
      onClose();
      onAddTrip();
      return;
    }
    Alert.alert(
      "새 여행 추가",
      "새로운 여행 만들기 기능이 곧 제공될 예정입니다",
    );
  };

  const handleSelectPlan = (plan: Plan) => {
    onSelectPlan(plan);
    onClose();
  };

  const handleEditPlan = (plan: Plan, e: any) => {
    e?.stopPropagation?.();
    onEditPlan?.(plan);
  };

  const handleDeletePlan = (plan: Plan, e: any) => {
    e?.stopPropagation?.();
    Alert.alert("여행 삭제", `"${plan.title}" 여행을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => onDeletePlan?.(plan),
      },
    ]);
  };

  const insets = useSafeAreaInsets();
  const validPlans = Array.isArray(plans) ? plans : [];
  const todayStr = dayjs().format("YYYY-MM-DD");

  const listHeight =
    validPlans.length === 0
      ? EMPTY_HEIGHT
      : validPlans.length * ROW_HEIGHT + (validPlans.length - 1) * ROW_GAP;
  const contentHeight =
    DRAG_HANDLE_HEIGHT +
    HEADER_HEIGHT +
    LIST_PADDING +
    listHeight +
    FOOTER_HEIGHT +
    spacing.lg +
    Math.max(insets.bottom, spacing.sm);
  const maxHeight =
    Dimensions.get("window").height - insets.top - spacing.lg;
  const sheetHeight = Math.min(contentHeight, maxHeight);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={sheetHeight}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>여행 선택</Text>
        <Text style={styles.headerCount}>{validPlans.length}개</Text>
      </View>

      <GestureDetector gesture={Gesture.Native()}>
        <ScrollView
          style={styles.planList}
          contentContainerStyle={styles.planListContent}
          showsVerticalScrollIndicator={false}
        >
          {validPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>여행 계획이 없습니다</Text>
            </View>
          ) : (
            validPlans.map(plan => {
              const isSelected = selectedPlan?.id === plan.id;
              const isPastTrip = plan.endDate && plan.endDate < todayStr;

              return (
                <Pressable
                  key={plan.id}
                  style={({ pressed }) => [
                    styles.planRow,
                    (isSelected || pressed) && styles.planRowSelected,
                    isPastTrip && !isSelected && styles.pastPlanRow,
                  ]}
                  onPress={() => handleSelectPlan(plan)}
                >
                  <View style={styles.planRowText}>
                    <Text style={styles.planRowTitle} numberOfLines={1}>
                      {plan.title}
                    </Text>
                    <Text style={styles.planRowDate} numberOfLines={1}>
                      {formatPlanDateRange(plan.startDate, plan.endDate)}
                    </Text>
                  </View>
                  <View style={styles.checkSlot}>
                    {isSelected && (
                      <CheckIcon
                        width={18}
                        height={18}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Pressable
                    style={styles.actionButton}
                    onPress={e => handleEditPlan(plan, e)}
                    hitSlop={8}
                  >
                    <UpdateIcon width={18} height={18} color={colors.gray600} />
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={e => handleDeletePlan(plan, e)}
                    hitSlop={8}
                  >
                    <DeleteIcon width={18} height={18} color={colors.gray600} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </GestureDetector>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.addTripButton,
            pressed && styles.addTripButtonPressed,
          ]}
          onPress={handleAddTripPress}
        >
          <Text style={styles.addTripButtonText}>+ 새 여행 만들기</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    marginHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  headerCount: {
    ...textStyles.body5,
    marginLeft: "auto",
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.gray600,
  },
  planList: {
    flex: 1,
  },
  planListContent: {
    gap: ROW_GAP,
    marginHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
  },
  planRowSelected: {
    backgroundColor: colors.gray200,
  },
  pastPlanRow: {
    opacity: 0.4,
  },
  planRowText: {
    flex: 1,
    minWidth: 0,
  },
  planRowTitle: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  planRowDate: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.pretendardMedium,
    fontVariant: ["tabular-nums"],
    color: colors.gray600,
  },
  checkSlot: {
    width: 18,
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    ...textStyles.body2,
    color: colors.gray500,
  },
  footer: {
    marginHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  addTripButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.mdPlus,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray400,
  },
  addTripButtonPressed: {
    backgroundColor: colors.gray100,
  },
  addTripButtonText: {
    ...textStyles.h7,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.gray900,
  },
});
