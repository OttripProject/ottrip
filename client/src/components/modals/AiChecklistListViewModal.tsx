import { useBackdropClose } from "@/hooks/useBackdropClose";
import { useMe } from "@/hooks/useMe";
import MotionPressable, {
  MotionIcon,
  useMotionHovered,
} from "@/ui/components/MotionPressable";
import Spinner from "@/ui/components/Spinner";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import AddIcon from "../../../assets/add.svg";
import CheckMarkIcon from "../../../assets/check_mark.svg";
import CloseXIcon from "../../../assets/close_x.svg";
import DeleteIcon from "../../../assets/delete.svg";
import RetryIcon from "../../../assets/retry.svg";

interface ChecklistItem {
  id: number;
  name: string;
  reason: string;
  isChecked: boolean;
  isCustom: boolean;
}

interface ChecklistCategory {
  [key: string]: ChecklistItem[];
}

interface ChecklistData {
  categories: ChecklistCategory;
}

interface AiChecklistListViewModalProps {
  visible: boolean;
  checklist: ChecklistData | null;
  isLoading?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onDeleteItem: (itemId: number) => void;
  onAddItem: (name: string, reason: string, category: string) => void;
}

const _CATEGORY_ORDER = [
  "basicRequired",
  "basic_required",
  "scheduleRequired",
  "schedule_required",
  "recommended",
  "optional",
];

const normalizeCategoryKey = (key: string) =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const getCategoryTitle = (categoryKey: string) => {
  const titles: { [key: string]: string } = {
    basicRequired: "꼭 챙겨야 해요",
    basic_required: "꼭 챙겨야 해요",
    scheduleRequired: "이번 일정에 필요해요",
    schedule_required: "이번 일정에 필요해요",
    recommended: "있으면 더 좋아요",
    optional: "선택이에요",
  };
  return titles[categoryKey] || categoryKey;
};

const sortCategories = (entries: [string, ChecklistItem[]][]) =>
  [...entries].sort(([a], [b]) => {
    const normalize = normalizeCategoryKey;
    const orderKeys = [
      "basicRequired",
      "scheduleRequired",
      "recommended",
      "optional",
    ];
    const ai = orderKeys.indexOf(normalize(a));
    const bi = orderKeys.indexOf(normalize(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

export default function AiChecklistListViewModal({
  visible,
  checklist,
  isLoading = false,
  readOnly = false,
  onClose,
  onRefresh,
  onToggleItem,
  onDeleteItem,
  onAddItem,
}: AiChecklistListViewModalProps) {
  const { data: me } = useMe();
  const isGuest = !!me?.isGuest;
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemReason, setNewItemReason] = useState("");
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [aiPressed, setAiPressed] = useState(false);
  const escapeLockRef = useRef(false);
  const backdrop = useBackdropClose(onClose);

  const handleStartAdding = (categoryKey: string) => {
    setAddingCategory(categoryKey);
    setNewItemName("");
    setNewItemReason("");
  };

  const handleCancelAdding = () => {
    setAddingCategory(null);
    setNewItemName("");
    setNewItemReason("");
  };

  const handleSaveAdding = () => {
    if (!addingCategory || !newItemName.trim()) {
      return;
    }
    onAddItem(newItemName.trim(), newItemReason.trim(), addingCategory);
    setAddingCategory(null);
    setNewItemName("");
    setNewItemReason("");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => {
        if (escapeLockRef.current) return;
        if (addingCategory) {
          escapeLockRef.current = true;
          handleCancelAdding();
          setTimeout(() => {
            escapeLockRef.current = false;
          }, 100);
        } else {
          onClose();
        }
      }}
    >
      <View style={styles.modalOverlay} {...backdrop.overlayProps}>
        <View style={styles.modalContent} {...backdrop.cardProps}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Spinner />
              <Text style={styles.loadingTitle}>
                AI가 체크리스트를 추천하고 있어요
              </Text>
              <Text style={styles.loadingSubtitle}>
                여행 일정을 분석해 필요한 항목을 추가하는 중...
              </Text>
            </View>
          )}
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>체크리스트</Text>
              {readOnly && checklist && checklist.categories && (
                <View style={styles.readOnlyCountBadge}>
                  <Text style={styles.readOnlyCountText}>
                    전체 {Object.values(checklist.categories).flat().length}개
                  </Text>
                </View>
              )}
              {!readOnly && (
                <MotionPressable
                  onPress={() => {
                    if (isGuest) {
                      guestPrompt.show();
                      return;
                    }
                    onRefresh();
                  }}
                  onPressIn={() => setAiPressed(true)}
                  onPressOut={() => setAiPressed(false)}
                  style={styles.aiRecommendButton}
                  hoverStyle={shadows.aiGlow}
                  pressedStyle={shadows.aiGlowPress}
                >
                  <AiRecommendGradient pressed={aiPressed} />
                  <View>
                    <RetryIcon width={12} height={12} color={colors.white} />
                  </View>
                  <Text style={styles.aiRecommendButtonText}>AI 추천</Text>
                </MotionPressable>
              )}
            </View>
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
          <ScrollView
            style={styles.checklistScrollView}
            showsVerticalScrollIndicator={false}
          >
            {checklist && readOnly
              ? sortCategories(Object.entries(checklist.categories ?? {}))
                  .filter(([, items]) => items.length > 0)
                  .map(([categoryKey, items], sectionIndex) => (
                    <View
                      key={categoryKey}
                      style={[
                        styles.readOnlyCategorySection,
                        sectionIndex > 0 &&
                          styles.readOnlyCategorySectionBorder,
                      ]}
                    >
                      <View style={styles.readOnlyCategoryHeader}>
                        <Text style={styles.readOnlyCategoryTitle}>
                          {getCategoryTitle(categoryKey)}
                        </Text>
                        <Text style={styles.readOnlyCategoryCount}>
                          {items.length}개
                        </Text>
                      </View>
                      {items.map((item, i) => (
                        <View key={item.id ?? i} style={styles.readOnlyItemRow}>
                          <View style={styles.readOnlyItemDot} />
                          {!item.isCustom && (
                            <View style={styles.readOnlyAiBadge}>
                              <Text style={styles.readOnlyAiBadgeText}>AI</Text>
                            </View>
                          )}
                          <Text style={styles.readOnlyItemText}>
                            {item.name}
                            {item.reason ? (
                              <Text style={styles.readOnlyItemReason}>
                                {" · "}
                                {item.reason}
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))
              : checklist &&
                sortCategories(Object.entries(checklist.categories ?? {})).map(
                  ([categoryKey, items], sectionIndex) => (
                    <View
                      key={categoryKey}
                      style={[
                        styles.categorySection,
                        sectionIndex > 0 && styles.categorySectionBorder,
                      ]}
                    >
                      <View style={styles.categoryHeaderRow}>
                        <Text style={styles.categoryTitle}>
                          {getCategoryTitle(categoryKey)}
                        </Text>
                        <Text style={styles.categoryProgress}>
                          {`${items.filter(i => i.isChecked).length}/${items.length}`}
                        </Text>
                        <View style={styles.categoryHeaderSpacer} />
                        {addingCategory !== categoryKey && (
                          <MotionPressable
                            onPress={() => handleStartAdding(categoryKey)}
                            style={styles.addItemButton}
                          >
                            <MotionIcon>
                              <AddIcon width={16} height={16} />
                            </MotionIcon>
                          </MotionPressable>
                        )}
                      </View>

                      <View style={styles.itemList}>
                        {items.map(item => {
                          const isHovered = hoveredItemId === item.id;
                          return (
                            <View
                              key={item.id}
                              style={[
                                styles.checklistItemWrapper,
                                Platform.OS === "web" && bgTransition,
                                isHovered && styles.checklistItemHover,
                              ]}
                              {...(Platform.OS === "web"
                                ? {
                                    onMouseEnter: () =>
                                      setHoveredItemId(item.id),
                                    onMouseLeave: () => setHoveredItemId(null),
                                  }
                                : {})}
                            >
                              <Pressable
                                style={styles.checklistItem}
                                onPress={() =>
                                  onToggleItem(item.id, !item.isChecked)
                                }
                              >
                                <MotionPressable
                                  style={[
                                    styles.checkboxContainer,
                                    item.isChecked &&
                                      styles.checkboxContainerChecked,
                                  ]}
                                  hoverStyle={
                                    item.isChecked && shadows.darkHover
                                  }
                                  onPress={() =>
                                    onToggleItem(item.id, !item.isChecked)
                                  }
                                >
                                  {item.isChecked ? (
                                    <MotionIcon>
                                      <CheckMarkIcon
                                        width={10}
                                        height={10}
                                        color={colors.white}
                                      />
                                    </MotionIcon>
                                  ) : null}
                                </MotionPressable>
                                <View style={styles.itemTextContainer}>
                                  <View style={styles.itemNameRow}>
                                    {!item.isCustom && (
                                      <View style={styles.aiBadge}>
                                        <Text style={styles.aiBadgeText}>
                                          AI
                                        </Text>
                                      </View>
                                    )}
                                    <Text
                                      style={[
                                        styles.itemName,
                                        item.isChecked &&
                                          styles.itemNameChecked,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.name}
                                    </Text>
                                  </View>
                                  {item.reason ? (
                                    <Text
                                      style={[
                                        styles.itemReason,
                                        item.isChecked &&
                                          styles.itemReasonChecked,
                                      ]}
                                      numberOfLines={2}
                                    >
                                      {item.reason}
                                    </Text>
                                  ) : null}
                                </View>
                              </Pressable>
                              <MotionPressable
                                style={[
                                  styles.deleteItemButton,
                                  isHovered && styles.deleteItemVisible,
                                ]}
                                hoverStyle={styles.deleteItemHover}
                                onPress={() => onDeleteItem(item.id)}
                              >
                                <MotionIcon>
                                  <DeleteIcon
                                    width={11}
                                    height={11}
                                    color={colors.gray900}
                                  />
                                </MotionIcon>
                              </MotionPressable>
                            </View>
                          );
                        })}
                        {addingCategory === categoryKey && (
                          <View style={styles.addingItemRow}>
                            <View
                              style={[
                                styles.checkboxContainer,
                                styles.addingItemCheckboxPlaceholder,
                              ]}
                            />
                            <View style={styles.addingItemInputs}>
                              <View style={styles.inputWrapper}>
                                <Input
                                  variant="filled"
                                  style={styles.addingItemInput}
                                  placeholder="항목명"
                                  placeholderTextColor={colors.gray600}
                                  value={newItemName}
                                  onChangeText={setNewItemName}
                                  maxLength={16}
                                  autoFocus
                                  onSubmitEditing={handleSaveAdding}
                                />
                                <Text
                                  style={[
                                    styles.counterText,
                                    newItemName.length === 16 &&
                                      styles.counterTextMax,
                                  ]}
                                >
                                  {newItemName.length}/16
                                </Text>
                              </View>
                              <View style={styles.inputWrapper}>
                                <Input
                                  variant="filled"
                                  style={styles.addingItemInput}
                                  placeholder="이유 (선택)"
                                  placeholderTextColor={colors.gray600}
                                  value={newItemReason}
                                  onChangeText={setNewItemReason}
                                  maxLength={24}
                                  onSubmitEditing={handleSaveAdding}
                                />
                                <Text
                                  style={[
                                    styles.counterText,
                                    newItemReason.length === 24 &&
                                      styles.counterTextMax,
                                  ]}
                                >
                                  {newItemReason.length}/24
                                </Text>
                              </View>
                            </View>
                            <View style={styles.addingItemButtons}>
                              <MotionPressable
                                style={styles.addingItemCancelButton}
                                hoverStyle={shadows.xsHover}
                                onPress={handleCancelAdding}
                              >
                                <Text style={styles.addingItemCancelText}>
                                  취소
                                </Text>
                              </MotionPressable>
                              <MotionPressable
                                style={styles.addingItemSaveButton}
                                onPress={handleSaveAdding}
                              >
                                <Text style={styles.addingItemSaveText}>
                                  추가
                                </Text>
                              </MotionPressable>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ),
                )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AiRecommendGradient({ pressed }: { pressed: boolean }) {
  const hovered = useMotionHovered();
  return (
    <LinearGradient
      colors={
        pressed
          ? colors.aiGradPress
          : hovered
            ? colors.aiGradHover
            : colors.aiGrad
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const bgTransition = {
  transitionProperty: "background-color",
  transitionDuration: `${motion.duration.fast}ms`,
} as ViewStyle;

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
    width: 520 + spacing.xl * 2,
    maxWidth: "100%",
    maxHeight: "min(680px, calc(100dvh - 80px))" as any,
    overflow: "hidden",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    ...shadows.xl,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(238, 240, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    gap: 10,
  },
  loadingTitle: {
    ...textStyles.h6,
    color: colors.gray900,
    textAlign: "center",
  },
  loadingSubtitle: {
    ...textStyles.body5,
    color: colors.gray700,
    textAlign: "center",
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  aiRecommendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    gap: spacing.xs,
    overflow: "hidden",
  },
  aiRecommendButtonText: {
    ...textStyles.h9,
    color: colors.white,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  checklistScrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  categorySection: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  categorySectionBorder: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryTitle: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  categoryProgress: {
    ...textStyles.h9,
    color: colors.gray600,
  },
  categoryHeaderSpacer: {
    flex: 1,
  },
  addItemButton: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  itemList: {
    gap: spacing.xs,
  },
  checklistItemWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  checklistItemHover: {
    backgroundColor: colors.gray100,
  },
  checklistItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  deleteItemButton: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    opacity: 0,
  },
  deleteItemVisible: {
    opacity: 0.7,
  },
  deleteItemHover: {
    opacity: 1,
  },
  addingItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  addingItemCheckboxPlaceholder: {
    opacity: 0.4,
  },
  addingItemInputs: {
    flex: 1,
    gap: spacing.sm,
  },
  addingItemInput: {
    ...textStyles.body3,
    color: colors.gray900,
    borderRadius: radii.mdPlus,
    paddingVertical: spacing.md,
    paddingLeft: 14,
    paddingRight: spacing["2xl"] + spacing.lg,
  },
  addingItemButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  addingItemCancelButton: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray350,
    justifyContent: "center",
    alignItems: "center",
  },
  addingItemCancelText: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  addingItemSaveButton: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    ...surfaces.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addingItemSaveText: {
    ...textStyles.h8,
    color: colors.white,
  },
  checkboxContainer: {
    width: 16,
    height: 16,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxContainerChecked: {
    ...surfaces.dark,
    borderColor: colors.gray900,
  },
  itemTextContainer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  aiBadge: {
    height: 16,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.xs,
    backgroundColor: colors.aiTint,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBadgeText: {
    ...textStyles.h9,
    color: colors.aiInk,
  },
  itemName: {
    ...textStyles.h7,
    color: colors.gray900,
    flexShrink: 1,
  },
  itemNameChecked: {
    color: colors.gray600,
    textDecorationLine: "line-through",
  },
  itemReason: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  itemReasonChecked: {
    color: colors.gray500,
  },
  readOnlyCountBadge: {
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },
  readOnlyCountText: {
    ...textStyles.h9,
    color: "#6C6C6C",
  },
  readOnlyCategorySection: {
    paddingTop: 4,
    paddingBottom: 14,
  },
  readOnlyCategorySectionBorder: {
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    paddingTop: 14,
  },
  readOnlyCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  readOnlyCategoryTitle: {
    ...textStyles.h7,
    color: "#1F1F1F",
  },
  readOnlyCategoryCount: {
    ...textStyles.h9,
    color: "#9B9B9B",
  },
  readOnlyItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  readOnlyItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#C4C4C4",
    marginLeft: 5,
    marginRight: 10,
    marginTop: 6,
    flexShrink: 0,
  },
  readOnlyAiBadge: {
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 4,
    backgroundColor: "#F0EBFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    marginTop: 1,
    flexShrink: 0,
  },
  readOnlyAiBadgeText: {
    ...textStyles.h10,
    color: "#7B6CFF",
    letterSpacing: 0.3,
  },
  readOnlyItemText: {
    ...textStyles.body5,
    color: "#1F1F1F",
    flex: 1,
  },
  readOnlyItemReason: {
    ...textStyles.body5,
    color: "#6C6C6C",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  counterText: {
    position: "absolute",
    right: spacing.md,
    ...textStyles.body6,
    fontVariant: ["tabular-nums"],
    color: colors.gray500,
    pointerEvents: "none",
  },
  counterTextMax: {
    color: colors.primary,
  },
});
