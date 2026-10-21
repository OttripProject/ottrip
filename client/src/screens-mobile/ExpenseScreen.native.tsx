import PlanLoadingOverlay from "@/components/PlanLoadingOverlay.native";
import ScopeDateStrip from "@/components/ScopeDateStrip.native";
import TripHeader from "@/components/TripHeader.native";
import AddExpenseModal from "@/components/modals/mobile/AddExpenseModal.native";
import AttachmentListModal, {
  type AttachmentEntry,
} from "@/components/modals/mobile/AttachmentListModal.native";
import AttachmentViewerModal from "@/components/modals/mobile/AttachmentViewerModal.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { type Attachment, type Expense, PLAN_ENTITY_KIND } from "@/types/api";
import {
  ExpenseCategory,
  type ExpenseCurrency,
  currencyLabels,
} from "@/types/expense";
import CalendarModal from "@/ui/components/CalendarModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { toEasing } from "@/ui/effects/pressScale";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import PaperclipIcon from "../../assets/paperclip.svg";

const CATEGORY_BADGES: Record<
  ExpenseCategory,
  { label: string; bg: string; fg: string }
> = {
  [ExpenseCategory.ACCOMMODATION]: {
    label: "숙박",
    bg: colors.accommodationBg,
    fg: colors.accommodationText,
  },
  [ExpenseCategory.FOOD]: {
    label: "식사",
    bg: colors.mealBg,
    fg: colors.categoryMeal,
  },
  [ExpenseCategory.ACTIVITY]: {
    label: "관광",
    bg: colors.performanceBg,
    fg: colors.categoryActivity,
  },
  [ExpenseCategory.TRANSPORT]: {
    label: "이동",
    bg: colors.paletteFill,
    fg: colors.categoryTransport,
  },
  [ExpenseCategory.SHOPPING]: {
    label: "쇼핑",
    bg: colors.suggestionShoppingBg,
    fg: colors.categoryShopping,
  },
  [ExpenseCategory.FLIGHT]: {
    label: "항공",
    bg: colors.flightBg,
    fg: colors.flightText,
  },
  [ExpenseCategory.ETC]: {
    label: "기타",
    bg: colors.paletteFill,
    fg: colors.categoryEtc,
  },
};

type CurrencyTotal = { currency: ExpenseCurrency; amount: number };

const sumByCurrency = (expenses: Expense[]): CurrencyTotal[] => {
  const totals = new Map<ExpenseCurrency, number>();
  for (const e of expenses) {
    totals.set(e.currency, (totals.get(e.currency) ?? 0) + Number(e.amount));
  }
  return [...totals.entries()].map(([currency, amount]) => ({
    currency,
    amount,
  }));
};

const formatMoney = (amount: number, currency: ExpenseCurrency) =>
  `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} ${currencyLabels[currency]}`;

function CategoryChevron({ open }: { open: boolean }) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: motion.duration.base,
      easing: toEasing(motion.easing.ease),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={[styles.categoryChevron, { transform: [{ rotate }] }]}
    >
      <DropdownIcon width={13} height={13} color={colors.gray600} />
    </Animated.View>
  );
}

export default function ExpenseScreen() {
  const queryClient = useQueryClient();
  const { selectedPlan } = useSelectedPlan();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] =
    useState<ExpenseCategory | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [attachmentListVisible, setAttachmentListVisible] = useState(false);
  const [viewerAttachments, setViewerAttachments] = useState<
    Attachment[] | null
  >(null);

  useEffect(() => {
    setSelectedDate(null);
    setExpandedCategory(null);
  }, [selectedPlan?.id]);

  const tripDates = useMemo(() => {
    if (!selectedPlan?.startDate || !selectedPlan?.endDate) return [];
    const start = dayjs(selectedPlan.startDate);
    const days = dayjs(selectedPlan.endDate).diff(start, "day") + 1;
    return Array.from({ length: Math.max(days, 0) }, (_, i) =>
      start.add(i, "day"),
    );
  }, [selectedPlan?.startDate, selectedPlan?.endDate]);

  const expenseDates = useMemo(
    () =>
      new Set(planData.expenses.map(e => dayjs(e.exDate).format("YYYY-MM-DD"))),
    [planData.expenses],
  );

  const scopedExpenses = useMemo(
    () =>
      selectedDate
        ? planData.expenses.filter(
            e => dayjs(e.exDate).format("YYYY-MM-DD") === selectedDate,
          )
        : planData.expenses,
    [planData.expenses, selectedDate],
  );

  const linkedEntities = useMemo(() => {
    const itineraryByExpense = new Map<number, number>();
    for (const it of planData.itineraries) {
      for (const e of it.expenses ?? []) itineraryByExpense.set(e.id, it.id);
    }
    const accommodationByExpense = new Map<number, number>();
    for (const acc of planData.accommodations) {
      if (acc.expense) accommodationByExpense.set(acc.expense.id, acc.id);
    }
    const flightByExpense = new Map<number, number>();
    for (const f of planData.flights) {
      if (f.expense) flightByExpense.set(f.expense.id, f.id);
    }
    return { itineraryByExpense, accommodationByExpense, flightByExpense };
  }, [planData.itineraries, planData.accommodations, planData.flights]);

  const getLink = (e: Expense) => {
    const itineraryId =
      e.itineraryId ?? linkedEntities.itineraryByExpense.get(e.id);
    if (itineraryId) {
      const it = planData.itineraries.find(i => i.id === itineraryId);
      if (it) {
        return {
          kind: PLAN_ENTITY_KIND.ITINERARY,
          id: it.id,
          name: it.title,
        };
      }
    }
    const accommodationId =
      e.accommodationId ?? linkedEntities.accommodationByExpense.get(e.id);
    if (accommodationId) {
      const acc = planData.accommodations.find(a => a.id === accommodationId);
      if (acc) {
        return {
          kind: PLAN_ENTITY_KIND.ACCOMMODATION,
          id: acc.id,
          name: acc.name,
        };
      }
    }
    const flightId = e.flightId ?? linkedEntities.flightByExpense.get(e.id);
    if (flightId) {
      const flight = planData.flights.find(f => f.id === flightId);
      if (flight) {
        const segments = [...(flight.flightSegments ?? [])].sort(
          (a, b) => a.order - b.order,
        );
        const first = segments[0];
        const last = segments[segments.length - 1];
        return {
          kind: PLAN_ENTITY_KIND.FLIGHT,
          id: flight.id,
          name: first
            ? `${first.departureAirport} → ${last.arrivalAirport}`
            : "항공편",
        };
      }
    }
    return null;
  };

  const getAttachments = (e: Expense) => {
    const link = getLink(e);
    return planData.attachments.filter(
      a =>
        (a.entityType === PLAN_ENTITY_KIND.EXPENSE && a.entityId === e.id) ||
        (link && a.entityType === link.kind && a.entityId === link.id),
    );
  };

  const attachmentsByExpense = new Map(
    planData.expenses.map(e => [e.id, getAttachments(e)]),
  );

  const attachmentEntries: AttachmentEntry[] = [];
  const seenAttachmentIds = new Set<number>();
  for (const e of [...planData.expenses].sort((a, b) =>
    a.exDate.localeCompare(b.exDate),
  )) {
    for (const attachment of attachmentsByExpense.get(e.id) ?? []) {
      if (seenAttachmentIds.has(attachment.id)) continue;
      seenAttachmentIds.add(attachment.id);
      attachmentEntries.push({
        attachment,
        expense: e,
        categoryLabel: CATEGORY_BADGES[e.category].label,
        title: getLink(e)?.name || e.description || "",
      });
    }
  }

  const totalAttachmentCount = new Set(
    scopedExpenses.flatMap(e =>
      (attachmentsByExpense.get(e.id) ?? []).map(a => a.id),
    ),
  ).size;

  const totals = sumByCurrency(scopedExpenses);
  const spentDayCount = new Set(
    scopedExpenses.map(e => dayjs(e.exDate).format("YYYY-MM-DD")),
  ).size;

  const primaryCurrency = useMemo(() => {
    const counts = new Map<ExpenseCurrency, number>();
    for (const e of scopedExpenses) {
      counts.set(e.currency, (counts.get(e.currency) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [scopedExpenses]);

  const categoryGroups = useMemo(() => {
    const primaryTotal = scopedExpenses
      .filter(e => e.currency === primaryCurrency)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return Object.values(ExpenseCategory)
      .map(category => {
        const items = scopedExpenses
          .filter(e => e.category === category)
          .sort((a, b) => a.exDate.localeCompare(b.exDate));
        const primaryAmount = items
          .filter(e => e.currency === primaryCurrency)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          category,
          items,
          totals: sumByCurrency(items),
          primaryAmount,
          ratio: primaryTotal > 0 ? primaryAmount / primaryTotal : 0,
        };
      })
      .filter(group => group.items.length > 0)
      .sort((a, b) => b.primaryAmount - a.primaryAmount);
  }, [scopedExpenses, primaryCurrency]);

  const refreshPlanData = async () => {
    if (!selectedPlan) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["plan", selectedPlan.publicId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["expenses", selectedPlan.id],
      }),
    ]);
  };

  const totalLabel = selectedDate
    ? `${dayjs(selectedDate).format("M.D")} 총액`
    : "전체 총액";

  return (
    <View style={styles.container}>
      <TripHeader onCalendarPress={() => setCalendarVisible(true)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ScopeDateStrip
            style={styles.scopeCard}
            dates={tripDates}
            activeDates={expenseDates}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryBlock}>
              <View style={styles.totalHeader}>
                <Text style={styles.totalLabel}>{totalLabel}</Text>
                <Pressable
                  style={styles.attachmentButton}
                  onPress={() => setAttachmentListVisible(true)}
                  accessibilityLabel="첨부파일"
                >
                  <PaperclipIcon
                    width={14}
                    height={14}
                    color={colors.paletteInk}
                  />
                  <Text style={styles.attachmentButtonText}>
                    {totalAttachmentCount}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.totalAmounts}>
                {totals.length > 0 ? (
                  totals.map(t => (
                    <Text key={t.currency} style={styles.totalAmount}>
                      {formatMoney(t.amount, t.currency)}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.totalAmount}>0 원</Text>
                )}
              </View>
              <Text style={styles.totalMeta}>
                {spentDayCount}일 · {scopedExpenses.length}건
              </Text>
            </View>

            <View style={[styles.summaryBlock, styles.summaryBlockDivider]}>
              <Text style={styles.categoryTitle}>카테고리별</Text>
              {categoryGroups.length === 0 ? (
                <Text style={styles.categoryEmpty}>지출 내역이 없어요.</Text>
              ) : (
                <View style={styles.categoryList}>
                  {categoryGroups.map(group => {
                    const badge = CATEGORY_BADGES[group.category];
                    const isExpanded = expandedCategory === group.category;
                    return (
                      <View key={group.category}>
                        <ScalePressable
                          onPress={() =>
                            setExpandedCategory(
                              isExpanded ? null : group.category,
                            )
                          }
                        >
                          <View style={styles.categoryRow}>
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: badge.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.categoryBadgeText,
                                  { color: badge.fg },
                                ]}
                              >
                                {badge.label}
                              </Text>
                            </View>
                            <Text style={styles.categoryCount}>
                              {group.items.length}건
                            </Text>
                            <View style={styles.categoryAmounts}>
                              {group.totals.map(t => (
                                <Text
                                  key={t.currency}
                                  style={styles.categoryAmount}
                                >
                                  {formatMoney(t.amount, t.currency)}
                                </Text>
                              ))}
                            </View>
                            <CategoryChevron open={isExpanded} />
                          </View>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${Math.round(group.ratio * 100)}%`,
                                  backgroundColor: badge.fg,
                                },
                              ]}
                            />
                          </View>
                        </ScalePressable>
                        {isExpanded && (
                          <View style={styles.expenseList}>
                            {group.items.map(e => {
                              const link = getLink(e);
                              const title =
                                link?.name || e.description || badge.label;
                              const subtitle = link ? e.description : null;
                              const expenseAttachments =
                                attachmentsByExpense.get(e.id) ?? [];
                              return (
                                <Pressable
                                  key={e.id}
                                  style={styles.expenseRow}
                                  onPress={() => setEditingExpense(e)}
                                >
                                  <View style={styles.expenseText}>
                                    <Text
                                      style={styles.expenseTitle}
                                      numberOfLines={1}
                                    >
                                      {title}
                                    </Text>
                                    {!!subtitle && (
                                      <Text
                                        style={styles.expenseSubtitle}
                                        numberOfLines={1}
                                      >
                                        {subtitle}
                                      </Text>
                                    )}
                                  </View>
                                  {expenseAttachments.length > 0 && (
                                    <Pressable
                                      style={styles.attachmentChip}
                                      hitSlop={spacing.sm}
                                      onPress={() =>
                                        setViewerAttachments(expenseAttachments)
                                      }
                                      accessibilityLabel="첨부파일 보기"
                                    >
                                      <PaperclipIcon
                                        width={13}
                                        height={13}
                                        color={colors.paletteFg2}
                                      />
                                      <Text style={styles.attachmentChipText}>
                                        {expenseAttachments.length}
                                      </Text>
                                    </Pressable>
                                  )}
                                  <Text style={styles.expenseAmount}>
                                    {formatMoney(Number(e.amount), e.currency)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <PlanLoadingOverlay visible={planData.isLoading} />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate ?? selectedPlan?.startDate ?? ""}
        onDayPress={day => {
          setSelectedDate(day.dateString);
          setCalendarVisible(false);
        }}
        minDate={selectedPlan?.startDate}
        maxDate={selectedPlan?.endDate}
        datesWithItems={expenseDates}
      />

      <AttachmentListModal
        visible={attachmentListVisible}
        onClose={() => setAttachmentListVisible(false)}
        planTitle={selectedPlan?.title}
        dates={tripDates}
        entries={attachmentEntries}
        initialDate={selectedDate}
      />

      <AttachmentViewerModal
        visible={!!viewerAttachments}
        onClose={() => setViewerAttachments(null)}
        attachments={viewerAttachments ?? []}
      />

      {selectedPlan && (
        <AddExpenseModal
          visible={!!editingExpense}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          planId={selectedPlan.id}
          planStartDate={selectedPlan.startDate}
          planEndDate={selectedPlan.endDate}
          onExpenseUpdate={refreshPlanData}
          onExpenseDelete={refreshPlanData}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    marginTop: -spacing.xs,
  },
  content: {
    gap: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: spacing.xl,
  },
  scopeCard: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  summaryCard: {
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  summaryBlock: {
    padding: spacing.lg,
  },
  summaryBlockDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.paletteLine,
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  totalLabel: {
    ...textStyles.h8,
    color: colors.paletteFg3,
  },
  attachmentButton: {
    marginLeft: "auto",
    height: 28,
    paddingLeft: spacing.sm,
    paddingRight: 10,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.paletteFill,
  },
  attachmentButtonText: {
    ...textStyles.h8,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  totalAmounts: {
    gap: spacing.xs,
  },
  totalAmount: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    color: colors.paletteInk,
    letterSpacing: -0.48,
    fontVariant: ["tabular-nums"],
  },
  totalMeta: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  categoryTitle: {
    ...textStyles.h5,
    marginBottom: spacing.md,
    color: colors.paletteInk,
  },
  categoryEmpty: {
    ...textStyles.body5,
    paddingVertical: spacing.sm,
    color: colors.paletteFg3,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    minWidth: 44,
    height: 22,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadgeText: {
    ...textStyles.h8,
  },
  categoryCount: {
    ...textStyles.body5,
    marginLeft: spacing.sm,
    color: colors.paletteFg3,
  },
  categoryAmounts: {
    marginLeft: "auto",
    minWidth: 80,
    alignItems: "flex-end",
  },
  categoryAmount: {
    ...textStyles.h6,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  categoryChevron: {
    marginLeft: spacing.sm,
  },
  barTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  expenseList: {
    marginTop: spacing.sm,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.paletteFill,
  },
  expenseText: {
    flex: 1,
    minWidth: 0,
  },
  expenseTitle: {
    ...textStyles.h8,
    color: colors.paletteInk,
  },
  expenseSubtitle: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
  },
  attachmentChip: {
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.paletteFill2,
  },
  attachmentChipText: {
    ...textStyles.h8,
    lineHeight: 12,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  expenseAmount: {
    ...textStyles.h8,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
});
