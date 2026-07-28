import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import { expensesApi } from "@/services/expenses";
import { type Attachment, type Expense, ExpenseCategory } from "@/types/api";
import { categoryLabels, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import dayjs from "dayjs";
import { useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import FlightIcon from "../../../../assets/airplane.svg";
import AttachmentClipIcon from "../../../../assets/attachment_clip.svg";
import AccommodationIcon from "../../../../assets/mobile_accomodation.svg";
import AttachmentDocumentIcon from "../../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../../assets/mobile_attachment_image.svg";
import MobileCarIcon from "../../../../assets/mobile_car.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import MobileFoodIcon from "../../../../assets/mobile_food.svg";
import PlusIcon from "../../../../assets/mobile_plus.svg";
import MobileTicketIcon from "../../../../assets/mobile_ticket.svg";

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

const getCategoryIcon = (category: ExpenseCategory) => {
  const iconProps = { width: 20, height: 20, color: colors.primary };
  switch (category) {
    case ExpenseCategory.FOOD:
      return <MobileFoodIcon {...iconProps} />;
    case ExpenseCategory.TRANSPORT:
      return <MobileCarIcon {...iconProps} />;
    case ExpenseCategory.ACCOMMODATION:
      return <AccommodationIcon {...iconProps} />;
    case ExpenseCategory.FLIGHT:
      return <FlightIcon {...iconProps} />;
    default:
      return <MobileTicketIcon {...iconProps} />;
  }
};

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
}: ExpenseDetailModalProps) {
  const [tab, setTab] = useState<"expenses" | "attachments">("expenses");
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
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

  const filteredExpenses = selectedCategory
    ? expenses.filter(e => e.category === selectedCategory)
    : expenses;

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
    <BottomSheetModal visible={visible} onClose={onClose} height={0.85}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <CloseIcon width={20} height={20} color={colors.gray700} />
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.totalCard,
            tab === "expenses" && selectedCategory !== null && styles.totalCardDimmed,
          ]}
          onPress={() => {
            setSelectedCategory(null);
            setTab("expenses");
          }}
        >
          <Text style={styles.totalLabel}>총 지출</Text>
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
        </Pressable>

        <View style={styles.tabBar}>
          <Pressable
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
          </Pressable>
          <Pressable
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
              <Text style={styles.tabBadge}>{allAttachments.length}</Text>
            )}
          </Pressable>
        </View>

        {tab === "expenses" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={closeActiveSwipe}
          >
            <View style={styles.categoryGrid}>
              {CATEGORY_ORDER.map(category => {
                const totals = categoryTotals[category];
                if (totals.KRW === 0 && totals.USD === 0) return null;
                const isSelected = selectedCategory === category;
                const amountText = [
                  totals.KRW > 0
                    ? `${totals.KRW.toLocaleString("ko-KR")}원`
                    : null,
                  totals.USD > 0
                    ? `${totals.USD.toLocaleString("en-US")}달러`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() =>
                      setSelectedCategory(isSelected ? null : category)
                    }
                  >
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelSelected,
                      ]}
                    >
                      {categoryLabels[category]}
                    </Text>
                    <Text
                      style={[
                        styles.categoryAmount,
                        isSelected && styles.categoryAmountSelected,
                      ]}
                    >
                      {amountText}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? `${categoryLabels[selectedCategory]} 상세 내역`
                : "전체 상세 내역"}
            </Text>

            {filteredExpenses.length > 0 ? (
              <View style={styles.detailList}>
                {filteredExpenses.map((expense, index) => {
                  const expAttachments = attachmentsMap[expense.id] ?? [];
                  return (
                    <View key={expense.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <Swipeable
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
                            <Pressable
                              style={styles.swipeDeleteButton}
                              onPress={() => handleDelete(expense.id)}
                            >
                              <Text style={styles.swipeDeleteLabel}>삭제</Text>
                            </Pressable>
                          </View>
                        )}
                      >
                        <View style={styles.detailRow}>
                          <View style={styles.detailIconBox}>
                            {getCategoryIcon(expense.category)}
                          </View>
                          <View style={styles.detailContent}>
                            <View style={styles.detailTitleRow}>
                              <Text style={styles.detailCategory}>
                                {categoryLabels[expense.category] ||
                                  expense.category}
                              </Text>
                              {showDatePerExpense && expense.exDate && (
                                <Text style={styles.detailDate}>
                                  {dayjs(expense.exDate).format("MM.DD")}
                                </Text>
                              )}
                            </View>
                            {expense.description ? (
                              <Text
                                style={styles.detailDescription}
                                numberOfLines={1}
                              >
                                {expense.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.detailRight}>
                            <Text style={styles.detailAmount}>
                              {expense.amount.toLocaleString()}{" "}
                              {currencyLabels[expense.currency]}
                            </Text>
                            {expAttachments.length > 0 && (
                              <Pressable
                                style={styles.attachmentBadge}
                                onPress={() =>
                                  handleExpenseAttachmentPress(
                                    expense,
                                    expAttachments,
                                  )
                                }
                              >
                                <AttachmentClipIcon
                                  width={11}
                                  height={11}
                                  color={colors.gray700}
                                />
                                <Text style={styles.attachmentBadgeText}>
                                  {expAttachments.length}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </Swipeable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {selectedCategory
                  ? "해당 카테고리 내역이 없습니다"
                  : "지출 내역이 없습니다"}
              </Text>
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
                  <Pressable
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
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}

        {planId > 0 && onAddExpensePress && (
          <View style={styles.footer}>
            <Pressable
              style={styles.addExpenseButton}
              onPress={onAddExpensePress}
            >
              <PlusIcon width={20} height={20} color={colors.white} />
              <Text style={styles.addExpenseButtonText}>비용 추가하기</Text>
            </Pressable>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
  },
  totalLabel: {
    ...textStyles.h7,
    color: "rgba(255,255,255,0.7)",
  },
  totalCardDimmed: {
    opacity: 0.45,
  },
  totalAmountColumn: {
    alignItems: "flex-end",
    gap: 2,
  },
  totalAmount: {
    ...textStyles.h5,
    color: colors.white,
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    marginTop: spacing.sm,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabItemActive: {
    borderBottomColor: colors.gray900,
  },
  tabText: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  tabTextActive: {
    color: colors.gray900,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.gray300,
    overflow: "hidden",
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.gray600,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  attachmentScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.sm + 2,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  categoryCardSelected: {
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  categoryLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 4,
  },
  categoryLabelSelected: {
    color: colors.primary,
  },
  categoryAmount: {
    ...textStyles.h6,
    color: colors.black,
  },
  categoryAmountSelected: {
    color: colors.primary,
  },
  sectionTitle: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  detailList: {
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    gap: spacing.sm,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.base,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailCategory: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  detailDate: {
    fontFamily: typography.fontFamily.poppinsMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray500,
  },
  detailDescription: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  detailRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
  },
  detailAmount: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  attachmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  attachmentBadgeText: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray700,
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
    paddingTop: spacing.sm,
    paddingBottom: 32,
  },
  addExpenseButton: {
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  addExpenseButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
