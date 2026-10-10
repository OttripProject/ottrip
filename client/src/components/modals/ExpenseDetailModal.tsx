import ExpenseCard from "@/components/cards/ExpenseCard"
import ImagePreviewModal, { type ImagePreviewItem } from "@/components/modals/ImagePreviewModal";
import { useToast, ToastUI } from "@/contexts/ToastContext";
import { useBackdropClose } from "@/hooks/useBackdropClose";
import { expensesApi } from "@/services/expenses";
import type { Attachment } from "@/types/api";
import type { Expense } from "@/types/api";
import {
  ExpenseCategory,
  ExpenseCurrency,
  categoryLabels,
  currencyLabels,
} from "@/types/expense";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import AttachmentIcon from "../../../assets/attachment_clip.svg";
import DeleteIcon from "../../../assets/delete.svg";
import UpdateIcon from "../../../assets/update.svg"
import AttachmentDocumentIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import CloseXIcon from "../../../assets/close_x.svg";


interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  attachments?: Attachment[];
  onExpenseDelete?: () => void;
  onExpenseUpdate?: () => void;
  readOnly?: boolean;
}

const categoryOrder = [
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACTIVITY,
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];

export default function ExpenseDetailModal({
  visible,
  onClose,
  expenses,
  attachments = [],
  onExpenseDelete,
  onExpenseUpdate,
  readOnly = false,
}: ExpenseDetailModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const backdrop = useBackdropClose(onClose);
  const [tab, setTab] = useState<"expenses" | "attachments">("expenses");
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const { showToast } = useToast();

  const expenseMap = useMemo(() => {
    const map: Record<number, Expense> = {};
    expenses.forEach(e => { map[e.id] = e; });
    return map;
  }, [expenses]);

  const attachmentsMap = useMemo(() => {
    const map: Record<number, Attachment[]> = {};
    for (const expense of expenses) {
      const list: Attachment[] = [
        ...attachments.filter(a => a.entityType === "expense" && a.entityId === expense.id),
        ...(expense.accommodationId
          ? attachments.filter(a => a.entityType === "accommodation" && a.entityId === expense.accommodationId)
          : []),
        ...(expense.flightId
          ? attachments.filter(a => a.entityType === "flight" && a.entityId === expense.flightId)
          : []),
        ...(expense.itineraryId
          ? attachments.filter(a => a.entityType === "itinerary" && a.entityId === expense.itineraryId)
          : []),
      ];
      if (list.length > 0) map[expense.id] = list;
    }
    return map;
  }, [expenses, attachments]);

  const expenseAttachments = useMemo(() => {
    const seen = new Set<number>();
    const all: Attachment[] = [];
    for (const list of Object.values(attachmentsMap)) {
      for (const a of list) {
        if (!seen.has(a.id)) { seen.add(a.id); all.push(a); }
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
      expenseAttachments
        .filter(a => a.contentType.startsWith("image/"))
        .map(a => ({ attachment: a, expense: attachmentExpenseMap[a.id] })),
    [expenseAttachments, attachmentExpenseMap],
  );

  const totalsByCurrency = useMemo(() => {
    const result = { KRW: 0, USD: 0 };
    for (const expense of expenses) {
      if (expense.currency === ExpenseCurrency.USD)
        result.USD += expense.amount;
      else result.KRW += expense.amount;
    }
    return result;
  }, [expenses]);

  const hasKRW = totalsByCurrency.KRW > 0;
  const hasUSD = totalsByCurrency.USD > 0;

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
    expenses.forEach(expense => {
      if (expense.category in totals) {
        if (expense.currency === ExpenseCurrency.USD)
          totals[expense.category].USD += expense.amount;
        else totals[expense.category].KRW += expense.amount;
      }
    });
    return totals;
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const grouped: Record<ExpenseCategory, Expense[]> = {
      [ExpenseCategory.FOOD]: [],
      [ExpenseCategory.TRANSPORT]: [],
      [ExpenseCategory.FLIGHT]: [],
      [ExpenseCategory.ACTIVITY]: [],
      [ExpenseCategory.ACCOMMODATION]: [],
      [ExpenseCategory.SHOPPING]: [],
      [ExpenseCategory.ETC]: [],
    };
    expenses.forEach(expense => {
      if (expense.category in grouped) grouped[expense.category].push(expense);
    });
    return grouped;
  }, [expenses]);

  const handleDelete = async (expenseId: number) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      onExpenseDelete?.();
      showToast("지출을 삭제했습니다.")
    } catch {}
  };

  const handleAttachmentCardPress = (attachment: Attachment) => {
    if (attachment.contentType.startsWith("image/")) {
      const idx = imagePreviewItems.findIndex(
        item => item.attachment.id === attachment.id,
      );
      setPreviewImages(imagePreviewItems);
      setPreviewInitialIndex(Math.max(0, idx));
      setPreviewVisible(true);
    } else if (typeof window !== "undefined") {
      window.open(attachment.fileUrl, "_blank");
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
    } else if (expAttachments.length > 0 && typeof window !== "undefined") {
      window.open(expAttachments[0].fileUrl, "_blank");
    }
  };

  const formatAmount = (amount: number) => amount.toLocaleString();
  const formatDate = (exDate: string) => exDate.slice(5).replace("-", ".");

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay} {...backdrop.overlayProps}>
          <View
            {...backdrop.cardProps}
            style={[
              styles.modalContent,
              {
                maxHeight: Math.min(680, windowHeight - 80),
                minHeight: windowHeight * 0.3,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>지출 내역</Text>
              <MotionPressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <MotionIcon>
                  <CloseXIcon width={16} height={16} color={colors.gray900} />
                </MotionIcon>
              </MotionPressable>
            </View>

            <Pressable
              style={styles.totalSection}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.totalLabel}>총 지출</Text>
              <View style={styles.totalAmountColumn}>
                {(!hasUSD || hasKRW) && (
                  <Text style={styles.totalAmount}>
                    {formatAmount(totalsByCurrency.KRW)} 원
                  </Text>
                )}
                {hasUSD && (
                  <Text style={styles.totalAmount}>
                    {formatAmount(totalsByCurrency.USD)} 달러
                  </Text>
                )}
              </View>
            </Pressable>

            {!readOnly && (
              <View style={styles.tabBar}>
                <MotionPressable
                  style={[
                    styles.tabItem,
                    tab === "expenses" && styles.tabItemActive,
                  ]}
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
                </MotionPressable>
                <MotionPressable
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
                  {expenseAttachments.length > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {expenseAttachments.length}
                      </Text>
                    </View>
                  )}
                </MotionPressable>
              </View>
            )}

            {tab === "expenses" ? (
              <>
                <ScrollView
                  style={styles.detailScrollView}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.summarySection}>
                    {categoryOrder.map(category => {
                      const catTotal = categoryTotals[category];
                      if (catTotal.KRW === 0 && catTotal.USD === 0) return null;
                      const isSelected = selectedCategory === category;
                      const amountText = [
                        catTotal.KRW > 0
                          ? `${formatAmount(catTotal.KRW)}원`
                          : null,
                        catTotal.USD > 0
                          ? `${formatAmount(catTotal.USD)}달러`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <MotionPressable
                          key={category}
                          style={[
                            styles.summaryRow,
                            isSelected && styles.summaryRowSelected,
                          ]}
                          onPress={() =>
                            setSelectedCategory(isSelected ? null : category)
                          }
                        >
                          <Text
                            style={[
                              styles.summaryCategory,
                              isSelected && styles.summaryCategorySelected,
                            ]}
                          >
                            {categoryLabels[category]}
                          </Text>
                          <Text
                            style={[
                              styles.summaryAmount,
                              isSelected && styles.summaryAmountSelected,
                            ]}
                          >
                            {amountText}
                          </Text>
                        </MotionPressable>
                      );
                    })}
                  </View>

                  <View style={styles.divider} />

                  {categoryOrder.map(category => {
                    const categoryExpenses = expensesByCategory[category];
                    if (categoryExpenses.length === 0) return null;
                    if (
                      selectedCategory !== null &&
                      selectedCategory !== category
                    )
                      return null;
                    return (
                      <View key={category} style={styles.categorySection}>
                        <Text style={styles.categoryHeader}>
                          {categoryLabels[category]}
                        </Text>
                        {categoryExpenses.map(expense => (
                          <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            attachments={attachmentsMap[expense.id] ?? []}
                            readOnly={readOnly}
                            onDelete={handleDelete}
                            onUpdate={onExpenseUpdate}
                            onAttachmentPress={handleExpenseAttachmentPress}
                          />
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <ScrollView
                style={styles.detailScrollView}
                contentContainerStyle={styles.attachmentScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {expenseAttachments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      업로드 된 첨부파일이 없습니다
                    </Text>
                  </View>
                ) : (
                  expenseAttachments.map(attachment => {
                    const expense = attachmentExpenseMap[attachment.id];
                    const isImage = attachment.contentType.startsWith("image/");
                    return (
                      <Pressable
                        key={attachment.id}
                        style={styles.attachmentCard}
                        onPress={() => handleAttachmentCardPress(attachment)}
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
                          <Text
                            style={styles.attachmentFileName}
                            numberOfLines={1}
                          >
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
                                  <Text style={styles.attachmentMetaDot}>
                                    ·
                                  </Text>
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
          </View>
        </View>
        <ToastUI />
      </Modal>

      <ImagePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        images={previewImages}
        initialIndex={previewInitialIndex}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lgPlus,
  },
  modalContent: {
    ...modalMotion.card,
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    width: "100%",
    maxWidth: 520,
    minHeight: 0,
    overflow: "hidden",
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.gray900,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing["2xl"],
    padding: spacing.lg,
    backgroundColor: colors.gray900,
    borderRadius: radii.mdPlus,
  },
  totalLabel: {
    ...textStyles.h7,
    color: "rgba(255, 255, 255, 0.7)",
  },
  totalAmountColumn: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  totalAmount: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    color: colors.white,
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabItemActive: {
    borderBottomColor: colors.gray900,
  },
  tabText: {
    ...textStyles.h5,
    color: colors.gray600,
  },
  tabTextActive: {
    color: colors.gray900,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    ...textStyles.h9,
    color: colors.gray600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
  },
  summarySection: {
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.md,
  },
  summaryRowSelected: {
    backgroundColor: colors.gray200,
  },
  summaryCategory: {
    ...textStyles.body3,
    color: colors.gray900,
  },
  summaryCategorySelected: {
    ...textStyles.h6,
    fontWeight: typography.weight.bold,
    color: colors.gray900,
  },
  summaryAmount: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  summaryAmountSelected: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  detailScrollView: {
    flex: 1,
    minHeight: 0,
  },
  detailScrollContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  attachmentScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm + 2,
  },
  categorySection: {
    gap: spacing.md,
  },
  categoryHeader: {
    ...textStyles.h6,
    color: colors.gray900,
    marginTop: spacing.xs,
  },
  expenseCard: {
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  expenseCardLeft: {
    flex: 1,
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  expenseCardRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  expenseDescription: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  expenseDate: {
    fontFamily: typography.fontFamily.poppinsMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray600,
  },
  expenseAmount: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  expenseCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  attachmentCount: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray700,
  },
  updateButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
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
});
