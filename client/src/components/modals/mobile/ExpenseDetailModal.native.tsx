import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import { expensesApi } from "@/services/expenses";
import { type Attachment, type Expense, ExpenseCategory } from "@/types/api";
import { categoryLabels, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import dayjs from "dayjs";
import { toEasing } from "@/ui/effects/pressScale";
import { motion } from "@/ui/tokens/motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import AttachmentClipIcon from "../../../../assets/attachment_clip.svg";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import AttachmentDocumentIcon from "../../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../../assets/mobile_attachment_image.svg";
import PlusIcon from "../../../../assets/mobile_plus.svg";
import CloseIcon from "../../../../assets/mobile_x.svg";
import RightArrowIcon from "../../../../assets/right_arrow.svg";

interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  attachments?: Attachment[];
  onExpenseDelete?: () => void;
  readOnly?: boolean;
  total?: number;
  byCategory?: Record<string, number>;
  planId?: number;
  planStartDate?: string;
  planEndDate?: string;
  exDate?: string;
  title?: string;
  onExpenseAdd?: (expense: Expense) => void;
  onAddExpensePress?: () => void;
  onExpensePress?: (expense: Expense) => void;
}

const CATEGORY_ORDER: ExpenseCategory[] = [
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACTIVITY,
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];

function CategoryChevron({ expanded }: { expanded: boolean }) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: motion.duration.base,
      easing: toEasing(motion.easing.ease),
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <DownArrowIcon width={15} height={15} color={colors.paletteFg3} />
    </Animated.View>
  );
}

export default function ExpenseDetailModal({
  visible,
  onClose,
  expenses,
  attachments = [],
  onExpenseDelete,
  readOnly = false,
  planId = 0,
  exDate,
  title = "오늘의 여행 비용",
  onAddExpensePress,
  onExpensePress,
}: ExpenseDetailModalProps) {
  const [tab, setTab] = useState<"expenses" | "attachments">("expenses");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<ExpenseCategory>
  >(new Set());
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());
  const activeSwipeId = useRef<number | null>(null);

  const totalKrw = useMemo(
    () =>
      expenses
        .filter(e => e.currency !== "USD")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );
  const totalUsd = useMemo(
    () =>
      expenses
        .filter(e => e.currency === "USD")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, { KRW: number; USD: number }> = {
      [ExpenseCategory.FOOD]: { KRW: 0, USD: 0 },
      [ExpenseCategory.TRANSPORT]: { KRW: 0, USD: 0 },
      [ExpenseCategory.ACTIVITY]: { KRW: 0, USD: 0 },
      [ExpenseCategory.ACCOMMODATION]: { KRW: 0, USD: 0 },
      [ExpenseCategory.FLIGHT]: { KRW: 0, USD: 0 },
      [ExpenseCategory.SHOPPING]: { KRW: 0, USD: 0 },
      [ExpenseCategory.ETC]: { KRW: 0, USD: 0 },
    };
    for (const expense of expenses) {
      if (expense.category in totals) {
        if (expense.currency === "USD")
          totals[expense.category].USD += expense.amount;
        else totals[expense.category].KRW += expense.amount;
      }
    }
    return totals;
  }, [expenses]);

  const attachmentsMap = useMemo(() => {
    const map: Record<number, Attachment[]> = {};
    for (const expense of expenses) {
      const list: Attachment[] = [
        ...attachments.filter(
          a => a.entityType === "expense" && a.entityId === expense.id,
        ),
        ...(expense.accommodationId
          ? attachments.filter(
              a =>
                a.entityType === "accommodation" &&
                a.entityId === expense.accommodationId,
            )
          : []),
        ...(expense.flightId
          ? attachments.filter(
              a => a.entityType === "flight" && a.entityId === expense.flightId,
            )
          : []),
        ...(expense.itineraryId
          ? attachments.filter(
              a =>
                a.entityType === "itinerary" &&
                a.entityId === expense.itineraryId,
            )
          : []),
      ];
      if (list.length > 0) map[expense.id] = list;
    }
    return map;
  }, [expenses, attachments]);

  const expenseMap = useMemo(() => {
    const map: Record<number, Expense> = {};
    for (const e of expenses) map[e.id] = e;
    return map;
  }, [expenses]);

  const allAttachments = useMemo(() => {
    const seen = new Set<number>();
    const all: Attachment[] = [];
    for (const list of Object.values(attachmentsMap)) {
      for (const a of list) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          all.push(a);
        }
      }
    }
    return all;
  }, [attachmentsMap]);

  const attachmentExpenseMap = useMemo(() => {
    const map: Record<number, Expense> = {};
    for (const [expenseIdStr, list] of Object.entries(attachmentsMap)) {
      const expense = expenseMap[Number(expenseIdStr)];
      if (expense) {
        for (const a of list) map[a.id] = expense;
      }
    }
    return map;
  }, [attachmentsMap, expenseMap]);

  const imagePreviewItems = useMemo<ImagePreviewItem[]>(
    () =>
      allAttachments
        .filter(a => a.contentType.startsWith("image/"))
        .map(a => ({ attachment: a, expense: attachmentExpenseMap[a.id] })),
    [allAttachments, attachmentExpenseMap],
  );

  const showDatePerExpense = !exDate;

  const categoryGroups = useMemo(
    () =>
      CATEGORY_ORDER.map(category => ({
        category,
        totals: categoryTotals[category],
        items: expenses.filter(e => e.category === category),
      }))
        .filter(group => group.items.length > 0)
        .sort(
          (a, b) =>
            b.totals.KRW - a.totals.KRW || b.totals.USD - a.totals.USD,
        ),
    [expenses, categoryTotals],
  );

  const toggleCategory = (category: ExpenseCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const formatTotals = (totals: { KRW: number; USD: number }) =>
    [
      totals.KRW > 0 || totals.USD === 0
        ? `${totals.KRW.toLocaleString("ko-KR")} 원`
        : null,
      totals.USD > 0 ? `${totals.USD.toLocaleString("en-US")} 달러` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const handleDelete = async (expenseId: number) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      onExpenseDelete?.();
    } catch {}
  };

  const handleAttachmentPress = (attachment: Attachment) => {
    if (attachment.contentType.startsWith("image/")) {
      const idx = imagePreviewItems.findIndex(
        item => item.attachment.id === attachment.id,
      );
      setPreviewImages(imagePreviewItems);
      setPreviewInitialIndex(Math.max(0, idx));
      setPreviewVisible(true);
    } else {
      Linking.openURL(attachment.fileUrl);
    }
  };

  const handleExpenseAttachmentPress = (
    expense: Expense,
    expAttachments: Attachment[],
  ) => {
    const images = expAttachments
      .filter(a => a.contentType.startsWith("image/"))
      .map(a => ({ attachment: a, expense }));
    if (images.length > 0) {
      setPreviewImages(images);
      setPreviewInitialIndex(0);
      setPreviewVisible(true);
    } else if (expAttachments.length > 0) {
      Linking.openURL(expAttachments[0].fileUrl);
    }
  };

  const closeActiveSwipe = () => {
    if (activeSwipeId.current !== null) {
      swipeRefs.current.get(activeSwipeId.current)?.close();
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.88}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <ScalePressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="닫기"
          >
            <CloseIcon width={24} height={24} color={colors.paletteFg3} />
          </ScalePressable>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            총 비용 <Text style={styles.totalLabelSub}>(Total Cost)</Text>
          </Text>
          <View style={styles.totalAmountColumn}>
            {totalKrw > 0 && (
              <Text style={styles.totalAmount}>
                {totalKrw.toLocaleString("ko-KR")} 원
              </Text>
            )}
            {totalUsd > 0 && (
              <Text style={styles.totalAmount}>
                {totalUsd.toLocaleString("en-US")} 달러
              </Text>
            )}
            {totalKrw === 0 && totalUsd === 0 && (
              <Text style={styles.totalAmount}>0 원</Text>
            )}
          </View>
        </View>

        <View style={styles.tabBar}>
          <ScalePressable
            style={[styles.tabItem, tab === "expenses" && styles.tabItemActive]}
            onPress={() => setTab("expenses")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "expenses" && styles.tabTextActive,
              ]}
            >
              내역
            </Text>
          </ScalePressable>
          <ScalePressable
            style={[
              styles.tabItem,
              tab === "attachments" && styles.tabItemActive,
            ]}
            onPress={() => setTab("attachments")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "attachments" && styles.tabTextActive,
              ]}
            >
              첨부파일
            </Text>
            {allAttachments.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{allAttachments.length}</Text>
              </View>
            )}
          </ScalePressable>
        </View>

        {tab === "expenses" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={closeActiveSwipe}
          >
            {categoryGroups.length > 0 ? (
              categoryGroups.map(({ category, totals, items }) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <View key={category} style={styles.categoryCard}>
                    <ScalePressable
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryLabel}>
                          {categoryLabels[category]}
                        </Text>
                        <Text style={styles.categoryAmount}>
                          {formatTotals(totals)}
                        </Text>
                      </View>
                      <Text style={styles.categoryCount}>{items.length}건</Text>
                      <CategoryChevron expanded={isExpanded} />
                    </ScalePressable>
                    {isExpanded && (
                      <View style={styles.categoryBody}>
                        {items.map(expense => {
                          const expAttachments =
                            attachmentsMap[expense.id] ?? [];
                          return (
                            <Swipeable
                              key={expense.id}
                              ref={el => {
                                if (el) swipeRefs.current.set(expense.id, el);
                                else swipeRefs.current.delete(expense.id);
                              }}
                              friction={2}
                              overshootRight={false}
                              enabled={!readOnly}
                              onSwipeableOpen={() => {
                                const prev = activeSwipeId.current;
                                if (prev !== null && prev !== expense.id) {
                                  swipeRefs.current.get(prev)?.close();
                                }
                                activeSwipeId.current = expense.id;
                              }}
                              onSwipeableClose={() => {
                                if (activeSwipeId.current === expense.id) {
                                  activeSwipeId.current = null;
                                }
                              }}
                              renderRightActions={() => (
                                <View style={styles.swipeDeleteContainer}>
                                  <ScalePressable
                                    style={styles.swipeDeleteButton}
                                    onPress={() => handleDelete(expense.id)}
                                  >
                                    <Text style={styles.swipeDeleteLabel}>
                                      삭제
                                    </Text>
                                  </ScalePressable>
                                </View>
                              )}
                            >
                              <ScalePressable
                                style={styles.detailRow}
                                disabled={readOnly || !onExpensePress}
                                onPress={() => onExpensePress?.(expense)}
                              >
                                <View style={styles.detailContent}>
                                  <Text
                                    style={styles.detailTitle}
                                    numberOfLines={1}
                                  >
                                    {expense.description || "-"}
                                  </Text>
                                  {showDatePerExpense && expense.exDate && (
                                    <Text style={styles.detailSub}>
                                      {dayjs(expense.exDate).format("M월 D일")}
                                    </Text>
                                  )}
                                </View>
                                {expAttachments.length > 0 && (
                                  <ScalePressable
                                    style={styles.attachmentBadge}
                                    onPress={() =>
                                      handleExpenseAttachmentPress(
                                        expense,
                                        expAttachments,
                                      )
                                    }
                                  >
                                    <AttachmentClipIcon
                                      width={13}
                                      height={13}
                                      color={colors.paletteFg2}
                                    />
                                    <Text style={styles.attachmentBadgeText}>
                                      {expAttachments.length}
                                    </Text>
                                  </ScalePressable>
                                )}
                                <Text style={styles.detailAmount}>
                                  {expense.amount.toLocaleString()}{" "}
                                  {currencyLabels[expense.currency]}
                                </Text>
                                {!readOnly && onExpensePress && (
                                  <RightArrowIcon
                                    width={13}
                                    height={13}
                                    color={colors.paletteFg3}
                                    style={styles.detailArrow}
                                  />
                                )}
                              </ScalePressable>
                            </Swipeable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>지출 내역이 없습니다</Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.attachmentScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {allAttachments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  업로드 된 첨부파일이 없습니다
                </Text>
              </View>
            ) : (
              allAttachments.map(attachment => {
                const expense = attachmentExpenseMap[attachment.id];
                const isImage = attachment.contentType.startsWith("image/");
                return (
                  <ScalePressable
                    key={attachment.id}
                    style={styles.attachmentCard}
                    onPress={() => handleAttachmentPress(attachment)}
                  >
                    <View
                      style={[
                        styles.fileTypeBadge,
                        isImage
                          ? styles.fileTypeBadgeImage
                          : styles.fileTypeBadgeDoc,
                      ]}
                    >
                      {isImage ? (
                        <AttachmentImageIcon width={20} height={20} />
                      ) : (
                        <AttachmentDocumentIcon width={20} height={20} />
                      )}
                    </View>
                    <View style={styles.attachmentCardInfo}>
                      <Text style={styles.attachmentFileName} numberOfLines={1}>
                        {attachment.fileName}
                      </Text>
                      {expense && (
                        <View style={styles.attachmentMeta}>
                          <Text
                            style={styles.attachmentCategory}
                            numberOfLines={1}
                          >
                            {categoryLabels[expense.category]}
                          </Text>
                          {expense.description ? (
                            <>
                              <Text style={styles.attachmentMetaDot}>·</Text>
                              <Text
                                style={styles.attachmentDescription}
                                numberOfLines={1}
                              >
                                {expense.description}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      )}
                    </View>
                    <Text style={styles.attachmentFileSize}>
                      {formatFileSize(attachment.fileSize)}
                    </Text>
                  </ScalePressable>
                );
              })
            )}
          </ScrollView>
        )}

        {planId > 0 && onAddExpensePress && (
          <View style={styles.footer}>
            <ScalePressable
              style={styles.addExpenseButton}
              onPress={onAddExpensePress}
            >
              <PlusIcon width={14} height={14} color={colors.white} />
              <Text style={styles.addExpenseButtonText}>비용 추가하기</Text>
            </ScalePressable>
          </View>
        )}

        <ImagePreviewModal
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          images={previewImages}
          initialIndex={previewInitialIndex}
        />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h3,
    letterSpacing: -0.2,
    color: colors.paletteInk,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: "auto",
    marginRight: -spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  totalCard: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lgPlus,
  },
  totalLabel: {
    ...textStyles.h7,
    color: colors.paletteInk,
  },
  totalLabelSub: {
    ...textStyles.body4,
    color: colors.paletteFg3,
  },
  totalAmountColumn: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  totalAmount: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    letterSpacing: -0.48,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabItemActive: {
    borderBottomColor: colors.paletteInk,
  },
  tabText: {
    ...textStyles.body3,
    color: colors.paletteFg3,
  },
  tabTextActive: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    ...textStyles.h8,
    lineHeight: 14,
    color: colors.paletteFg3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  attachmentScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.sm + 2,
  },
  categoryCard: {
    backgroundColor: colors.paletteFill,
    borderRadius: radii.lgPlus,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryLabel: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  categoryAmount: {
    ...textStyles.h5,
    marginTop: spacing.xs,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  categoryCount: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  categoryBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  swipeDeleteContainer: {
    width: 64,
    alignSelf: "stretch",
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeDeleteLabel: {
    ...textStyles.h8,
    color: colors.white,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    backgroundColor: colors.paletteFill,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    ...textStyles.h7,
    color: colors.paletteInk,
  },
  detailSub: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
  },
  detailAmount: {
    ...textStyles.h7,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  detailArrow: {
    marginLeft: -spacing.sm,
  },
  attachmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill2,
  },
  attachmentBadgeText: {
    ...textStyles.h8,
    lineHeight: 16,
    color: colors.paletteFg2,
  },
  emptyText: {
    ...textStyles.h6,
    color: colors.gray500,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
  },
  fileTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.base,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTypeBadgeImage: {
    backgroundColor: "#E7EEFF",
  },
  fileTypeBadgeDoc: {
    backgroundColor: "#E7EEFF",
  },
  attachmentCardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  attachmentFileName: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  attachmentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  attachmentCategory: {
    ...textStyles.h9,
    color: colors.primary,
    flexShrink: 0,
  },
  attachmentMetaDot: {
    ...textStyles.body6,
    color: colors.gray400,
    flexShrink: 0,
  },
  attachmentDescription: {
    ...textStyles.body6,
    color: colors.gray600,
    flex: 1,
  },
  attachmentFileSize: {
    ...textStyles.h9,
    color: colors.gray600,
    flexShrink: 0,
  },
  emptyState: {
    paddingVertical: spacing["2xl"],
    alignItems: "center",
  },
  emptyStateText: {
    ...textStyles.body3,
    color: colors.gray500,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    backgroundColor: colors.white,
  },
  addExpenseButton: {
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
    borderRadius: radii.lgPlus,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  addExpenseButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
