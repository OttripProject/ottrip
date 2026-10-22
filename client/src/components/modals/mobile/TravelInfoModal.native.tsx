import WeeklyChecklistCard from "@/components/cards/WeeklyChecklistCard.native";
import { useMe } from "@/hooks/useMe";
import { plansApi } from "@/services/plans";
import type {
  Accommodation,
  Attachment,
  Expense,
  FlightRead,
  Itinerary,
  Plan,
} from "@/types/api";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { filledFocusStyle } from "@/ui/components/input/Input";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import ItineraryIcon from "../../../../assets/mobile_check_backup.svg";
import MemberIcon from "../../../../assets/mobile_member.svg";
import RightArrowIcon from "../../../../assets/right_arrow.svg";
import ShareIcon from "../../../../assets/share_nodes_outline.svg";
import CloseIcon from "../../../../assets/mobile_x.svg";
import AddExpenseModal from "./AddExpenseModal.native";
import ExpenseDetailModal from "./ExpenseDetailModal.native";
import SharedMembersModal from "./SharedMembersModal.native";

interface TravelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  itineraries: Itinerary[];
  accommodations?: Accommodation[];
  flights?: FlightRead[];
  expenses: Expense[];
  attachments?: Attachment[];
  planPublicId: string | null;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  memberCount?: number;
  onExpenseAdd?: (expense: Expense) => void;
  onRefreshExpenses?: () => Promise<void>;
  onRefreshPlan?: () => Promise<void>;
}

const formatPeriod = (start: string, end: string) => {
  const endFormat = dayjs(start).isSame(end, "year")
    ? "MM. DD"
    : "YYYY. MM. DD";
  return `${dayjs(start).format("YYYY. MM. DD")} – ${dayjs(end).format(endFormat)}`;
};

export default function TravelInfoModal({
  visible,
  onClose,
  plan,
  itineraries,
  accommodations = [],
  flights = [],
  expenses,
  attachments = [],
  planPublicId,
  planId,
  planStartDate,
  planEndDate,
  memberCount = 0,
  onExpenseAdd,
  onRefreshExpenses,
  onRefreshPlan,
}: TravelInfoModalProps) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpenseFromDetail, setShowAddExpenseFromDetail] =
    useState(false);
  const [showSharedMembers, setShowSharedMembers] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [memo, setMemo] = useState(plan?.memo ?? "");
  const [memoFocused, setMemoFocused] = useState(false);

  useEffect(() => {
    if (visible && plan) {
      setMemo(plan.memo ?? "");
    }
  }, [visible, plan?.id, plan?.memo]);

  useEffect(() => {
    if (visible && onRefreshExpenses) {
      onRefreshExpenses();
    }
  }, [visible]);

  const totalExpenses = useMemo(() => {
    let total = 0;
    let totalKrw = 0;
    let totalUsd = 0;
    (expenses || []).forEach((e: Expense) => {
      const amount = Number(e?.amount || 0);
      total += amount;
      if (e?.currency === "USD") {
        totalUsd += amount;
      } else {
        totalKrw += amount;
      }
    });
    return { total, totalKrw, totalUsd };
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const byCategory: Record<string, number> = {};
    (expenses || []).forEach((e: Expense) => {
      const cat = e?.category || "기타";
      byCategory[cat] = (byCategory[cat] || 0) + Number(e?.amount || 0);
    });
    return byCategory;
  }, [expenses]);

  const scheduleCount =
    (itineraries?.length ?? 0) +
    (accommodations?.length ?? 0) +
    (flights?.length ?? 0);

  const handleExpenseAdded = async (expense: Expense) => {
    onExpenseAdd?.(expense);
    setShowExpenseDetail(false);
    await onRefreshExpenses?.();
  };

  const handleMemoBlur = useCallback(async () => {
    if (!plan?.id) return;
    const trimmed = memo.trim();
    if (trimmed === (plan.memo ?? "")) return;
    try {
      await plansApi.setMemo(plan.id, trimmed);
      queryClient.invalidateQueries({
        queryKey: ["plan", planPublicId ?? undefined],
      });
      await onRefreshPlan?.();
    } catch {
      setMemo(plan.memo ?? "");
    }
  }, [plan?.id, plan?.memo, memo, planPublicId, onRefreshPlan, queryClient]);

  const handleClose = useCallback(async () => {
    Keyboard.dismiss();
    await handleMemoBlur();
    onClose();
  }, [handleMemoBlur, onClose]);

  if (!plan) return null;

  return (
    <FullScreenModal
      visible={visible}
      onClose={handleClose}
      containerBackgroundColor={colors.paletteFill}
    >
      {/* Header - Figma: 여행 정보 + 닫기 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>여행 정보</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityLabel="닫기"
        >
          <CloseIcon width={24} height={24} color={colors.paletteFg3} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bottomOffset={40}
      >
        {/* Card 1: 여행제목 + 기간 - 흰색 카드 */}
        <View style={styles.card}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planPeriod}>
            {formatPeriod(plan.startDate, plan.endDate)}
          </Text>
        </View>

        {/* Card 2: 여행 총 경비 - 흰색 카드, 라벨 gray, 금액 black, 검정 버튼 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>여행 총 경비</Text>
          <View style={styles.expenseAmountGroup}>
            {totalExpenses.totalKrw > 0 && (
              <Text style={styles.expenseAmount}>
                {totalExpenses.totalKrw.toLocaleString("ko-KR")}원
              </Text>
            )}
            {totalExpenses.totalUsd > 0 && (
              <Text style={styles.expenseAmount}>
                {totalExpenses.totalUsd.toLocaleString("en-US")}달러
              </Text>
            )}
            {totalExpenses.total === 0 && (
              <Text style={styles.expenseAmount}>0원</Text>
            )}
          </View>
          <ScalePressable
            style={styles.expenseDetailButton}
            onPress={() => setShowExpenseDetail(true)}
          >
            <Text style={styles.expenseDetailButtonText}>
              상세 내역 및 비용 추가
            </Text>
          </ScalePressable>
        </View>

        {/* Card 3: 참여 멤버 / 등록 일정 - 카드 2개, 같은 줄, gap 9 */}
        <View style={styles.twoCardRow}>
          <ScalePressable
            style={styles.smallCard}
            onPress={() => {
              if (me?.isGuest) {
                guestPrompt.show();
                return;
              }
              setShowSharedMembers(true);
            }}
          >
            <View style={styles.smallCardIconRow}>
              <MemberIcon width={20} height={20} color={colors.black} />
              <RightArrowIcon
                width={17}
                height={17}
                color={colors.paletteFg3}
                style={styles.smallCardArrow}
              />
            </View>
            <Text style={styles.twoColValue}>{memberCount}명</Text>
            <Text style={styles.twoColLabel}>참여 멤버</Text>
          </ScalePressable>
          <View style={styles.smallCard}>
            <View style={styles.smallCardIconRow}>
              <ItineraryIcon width={20} height={20} color={colors.black} />
            </View>
            <Text style={styles.twoColValue}>{scheduleCount}개</Text>
            <Text style={styles.twoColLabel}>등록 일정</Text>
          </View>
        </View>

        {/* Card 4: 공유 메모 - 흰색 카드, 연한 파란 박스, 편집 가능, blur 시 저장 */}
        <View style={styles.card}>
          <View style={styles.memoHeader}>
            <Text style={styles.cardLabel}>공유 메모</Text>
            <View style={styles.memoHint}>
              <ShareIcon width={13} height={13} color={colors.paletteFg3} />
              <Text style={styles.memoHintText}>
                참여 멤버 모두에게 공유돼요
              </Text>
            </View>
          </View>
          <View style={[styles.memoBox, memoFocused && filledFocusStyle]}>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              onFocus={() => setMemoFocused(true)}
              onBlur={() => {
                setMemoFocused(false);
                handleMemoBlur();
              }}
              placeholder="함께 보는 메모를 입력하세요."
              placeholderTextColor={colors.memoPlaceholder}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Card 5: 여행 준비 체크리스트 - plan 전체용 */}
        {planPublicId && (
          <View>
            <WeeklyChecklistCard
              planPublicId={planPublicId}
              mode="full"
              planStartDate={planStartDate}
              itineraries={itineraries ?? []}
              titleOverride="여행 준비 체크리스트"
              cardStyle={styles.checklistCard}
            />
          </View>
        )}
      </KeyboardAwareScrollView>

      <ExpenseDetailModal
        visible={showExpenseDetail && !showAddExpenseFromDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={expenses || []}
        attachments={attachments}
        total={totalExpenses.total}
        byCategory={expensesByCategory}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        title="총 여행 비용"
        onExpenseDelete={onRefreshExpenses}
        onExpenseAdd={handleExpenseAdded}
        onAddExpensePress={() => {
          setEditingExpense(null);
          setShowExpenseDetail(false);
          setShowAddExpenseFromDetail(true);
        }}
        onExpensePress={expense => {
          setEditingExpense(expense);
          setShowAddExpenseFromDetail(true);
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseFromDetail}
        expense={editingExpense}
        onClose={opts => {
          setShowAddExpenseFromDetail(false);
          if (opts?.fromSave && !editingExpense) {
            setShowExpenseDetail(false);
          } else {
            setShowExpenseDetail(true);
          }
        }}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        onExpenseAdd={handleExpenseAdded}
        onExpenseUpdate={async () => {
          await onRefreshExpenses?.();
          await onRefreshPlan?.();
        }}
        onExpenseDelete={async () => {
          await onRefreshExpenses?.();
          await onRefreshPlan?.();
        }}
      />

      <SharedMembersModal
        visible={showSharedMembers}
        onClose={() => {
          setShowSharedMembers(false);
          if (planPublicId) {
            queryClient.invalidateQueries({ queryKey: ["plan", planPublicId] });
          }
        }}
        planId={planId}
        myRole={
          plan?.myRole ??
          (plan as { my_role?: "owner" | "editor" | "viewer" })?.my_role
        }
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paletteFill,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.paletteInk,
  },
  closeButton: {
    position: "absolute",
    right: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.paletteFill,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing["2xl"],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    ...shadows.card,
  },
  planTitle: {
    ...textStyles.h2,
    letterSpacing: -0.48,
    color: colors.paletteInk,
  },
  planPeriod: {
    ...textStyles.body3,
    marginTop: spacing.sm,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  cardLabel: {
    ...textStyles.h6,
    color: colors.paletteFg2,
  },
  expenseAmountGroup: {
    marginTop: spacing.sm,
  },
  expenseAmount: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    letterSpacing: -0.48,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  expenseDetailButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseDetailButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  twoCardRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    ...shadows.card,
  },
  smallCardIconRow: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  smallCardArrow: {
    marginLeft: "auto",
  },
  twoColValue: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    letterSpacing: -0.48,
    marginTop: spacing.xl,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  twoColLabel: {
    ...textStyles.h7,
    marginTop: spacing.sm,
    color: colors.paletteFg2,
  },
  memoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  memoHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: "auto",
  },
  memoHintText: {
    ...textStyles.body5,
    color: colors.paletteFg2,
  },
  memoBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.lgPlus,
    borderWidth: 1,
    borderColor: "transparent",
    padding: spacing.lg,
  },
  memoInput: {
    ...textStyles.body3,
    color: colors.paletteInk,
    minHeight: 120 - spacing.lg * 2,
    padding: 0,
  },
  checklistCard: {
    borderRadius: radii["2xl"],
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    ...shadows.card,
  },
});
