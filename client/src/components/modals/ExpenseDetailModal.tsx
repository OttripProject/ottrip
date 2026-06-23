import { expensesApi } from "@/services/expenses";
import type { Attachment } from "@/types/api";
import type { Expense } from "@/types/api";
import {
  ExpenseCategory,
  ExpenseCurrency,
  categoryLabels,
  currencyLabels,
} from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
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
} from "react-native";
import AttachmentIcon from "../../../assets/attachment.svg";
import DeleteIcon from "../../../assets/delete.svg";
import AttachmentDocumentIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import XIcon from "../../../assets/x.svg";
import ImagePreviewModal, { type ImagePreviewItem } from "./ImagePreviewModal";

interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  attachments?: Attachment[];
  onExpenseDelete?: () => void;
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
}: ExpenseDetailModalProps) {
  const [tab, setTab] = useState<"expenses" | "attachments">("expenses");
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const expenseAttachments = useMemo(
    () => attachments.filter(a => a.entityType === "expense"),
    [attachments],
  );

  const attachmentsMap = useMemo(() => {
    const map: Record<number, Attachment[]> = {};
    expenseAttachments.forEach(a => {
      if (!map[a.entityId]) map[a.entityId] = [];
      map[a.entityId].push(a);
    });
    return map;
  }, [expenseAttachments]);

  const expenseMap = useMemo(() => {
    const map: Record<number, Expense> = {};
    expenses.forEach(e => {
      map[e.id] = e;
    });
    return map;
  }, [expenses]);

  const imagePreviewItems = useMemo<ImagePreviewItem[]>(
    () =>
      expenseAttachments
        .filter(a => a.contentType.startsWith("image/"))
        .map(a => ({ attachment: a, expense: expenseMap[a.entityId] })),
    [expenseAttachments, expenseMap],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      [ExpenseCategory.FOOD]: 0,
      [ExpenseCategory.TRANSPORT]: 0,
      [ExpenseCategory.ACTIVITY]: 0,
      [ExpenseCategory.ACCOMMODATION]: 0,
      [ExpenseCategory.FLIGHT]: 0,
      [ExpenseCategory.SHOPPING]: 0,
      [ExpenseCategory.ETC]: 0,
    };
    expenses.forEach(expense => {
      if (expense.category in totals)
        totals[expense.category] += expense.amount;
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
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>지출 내역</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <XIcon width={24} height={24} />
              </Pressable>
            </View>

            <Pressable
              style={styles.totalSection}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.totalLabel}>총 지출</Text>
              <Text style={styles.totalAmount}>
                {formatAmount(totalExpenses)}{" "}
                {currencyLabels[ExpenseCurrency.KRW]}
              </Text>
            </Pressable>

            <View style={styles.tabBar}>
              <Pressable
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
                {expenseAttachments.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {expenseAttachments.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {tab === "expenses" ? (
              <>
                <View style={styles.summarySection}>
                  {categoryOrder.map(category => {
                    const total = categoryTotals[category];
                    if (total === 0) return null;
                    const isSelected = selectedCategory === category;
                    return (
                      <Pressable
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
                          {formatAmount(total)}{" "}
                          {currencyLabels[ExpenseCurrency.KRW]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <ScrollView
                  style={styles.detailScrollView}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                >
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
                        {categoryExpenses.map(expense => {
                          const expAttachments =
                            attachmentsMap[expense.id] ?? [];
                          return (
                            <View key={expense.id} style={styles.expenseCard}>
                              <View style={styles.expenseCardLeft}>
                                <Text
                                  style={styles.expenseDescription}
                                  numberOfLines={1}
                                >
                                  {expense.description || "내용 없음"}
                                </Text>
                                <Text style={styles.expenseDate}>
                                  {formatDate(expense.exDate)}
                                </Text>
                              </View>
                              <View style={styles.expenseCardRight}>
                                <Text style={styles.expenseAmount}>
                                  {formatAmount(expense.amount)}{" "}
                                  {currencyLabels[expense.currency]}
                                </Text>
                                <View style={styles.expenseCardActions}>
                                  {expAttachments.length > 0 && (
                                    <Pressable
                                      style={styles.attachmentButton}
                                      onPress={() =>
                                        handleExpenseAttachmentPress(
                                          expense,
                                          expAttachments,
                                        )
                                      }
                                    >
                                      <AttachmentIcon
                                        width={11}
                                        height={11}
                                        color={colors.gray700}
                                      />
                                      <Text style={styles.attachmentCount}>
                                        {expAttachments.length}
                                      </Text>
                                    </Pressable>
                                  )}
                                  <Pressable
                                    onPress={() => handleDelete(expense.id)}
                                    style={styles.deleteButton}
                                  >
                                    <DeleteIcon width={14} height={14} />
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          );
                        })}
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
                      첨부파일이 없습니다
                    </Text>
                  </View>
                ) : (
                  expenseAttachments.map(attachment => {
                    const expense = expenseMap[attachment.entityId];
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
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    width: "90%",
    maxWidth: 420,
    maxHeight: 648,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.black,
  },
  closeButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
  },
  totalLabel: {
    ...textStyles.h7,
    color: "rgba(255, 255, 255, 0.7)",
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
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 10,
    lineHeight: 18,
    color: colors.gray600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md + 4,
  },
  summarySection: {
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
  },
  summaryRowSelected: {
    backgroundColor: colors.gray200,
  },
  summaryCategory: {
    ...textStyles.body3,
    color: colors.black,
  },
  summaryCategorySelected: {
    ...textStyles.h7,
    color: colors.black,
  },
  summaryAmount: {
    ...textStyles.h7,
    color: colors.black,
  },
  summaryAmountSelected: {
    ...textStyles.h7,
    color: colors.black,
  },
  detailScrollView: {
    flex: 1,
    minHeight: 0,
  },
  detailScrollContent: {
    paddingHorizontal: spacing.xl,
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
    ...textStyles.h7,
    color: colors.black,
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
    ...textStyles.body6,
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
    ...textStyles.h9,
    color: colors.gray700,
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
    backgroundColor: "#FFE9D6",
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
