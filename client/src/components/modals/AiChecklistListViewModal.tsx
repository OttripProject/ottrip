import { useMe } from "@/hooks/useMe";
import GradientBackground from "@/ui/components/GradientBackground";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AddCheckList from "../../../assets/add_checklist.svg";
import AiCheckIcon from "../../../assets/ai_check.svg";
import XIcon from "../../../assets/ai_close.svg";
import AiRefreshIcon from "../../../assets/ai_refresh.svg";
import DeleteIcon from "../../../assets/delete_ai.svg";

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
  onClose: () => void;
  onRefresh: () => void;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onDeleteItem: (itemId: number) => void;
  onAddItem: (name: string, reason: string, category: string) => void;
}

const GradientText = ({
  children,
  style,
}: { children: string; style?: any }) => {
  if (Platform.OS === "web") {
    return (
      <Text
        style={[
          style,
          {
            background: "linear-gradient(90deg, #9CBEFF 0%, #B4A7FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          } as any,
        ]}
      >
        {children}
      </Text>
    );
  }

  return (
    <MaskedView
      maskElement={<Text style={style}>{children}</Text>}
      style={{ flexDirection: "row", height: 24 }}
    >
      <LinearGradient
        colors={["#FF2391", "#1F96FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

const getCategoryTitle = (categoryKey: string) => {
  const titles: { [key: string]: string } = {
    basicRequired: "꼭 챙겨야 해요",
    scheduleRequired: "이번 일정에 필요해요",
    recommended: "있으면 더 좋아요",
    optional: "선택이에요",
  };
  return titles[categoryKey] || categoryKey;
};

export default function AiChecklistListViewModal({
  visible,
  checklist,
  isLoading = false,
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject} />
          <GradientBackground
            colors={colors.gradientAIColors}
            style={{ flex: 1 }}
          >
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="large" color={colors.white} />
                  <Text style={styles.loadingMessage}>
                    AI Checklist 생성중..
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.headerSection}>
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>체크리스트</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (isGuest) {
                      guestPrompt.show();
                      return;
                    }
                    onRefresh();
                  }}
                  style={styles.aiRecommendButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={colors.gradientAIRefresh}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.aiRecommendButtonGradient}
                  >
                    <Text style={styles.aiRecommendButtonText}>AI 추천</Text>
                    <AiRefreshIcon width={14} height={14} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.viewAllButton}>
                <XIcon width={20} height={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.scrollWrapper}>
              <ScrollView
                style={styles.checklistScrollView}
                showsVerticalScrollIndicator={false}
              >
                {checklist &&
                  Object.entries(checklist.categories).map(
                    ([categoryKey, items]) => (
                      <View key={categoryKey} style={styles.categorySection}>
                        <View style={styles.categoryTitleRow}>
                          <Text style={styles.categoryTitle}>
                            {getCategoryTitle(categoryKey)}
                          </Text>
                        </View>
                        <View style={styles.categoryCard}>
                          {addingCategory !== categoryKey && (
                            <TouchableOpacity
                              style={styles.addItemButtonCard}
                              onPress={() => handleStartAdding(categoryKey)}
                            >
                              <AddCheckList width={20} height={20} />
                            </TouchableOpacity>
                          )}
                          {addingCategory === categoryKey && (
                            <View style={styles.addingItemRow}>
                              <View style={styles.addingItemInputs}>
                                <TextInput
                                  style={styles.addingItemNameInput}
                                  placeholder="항목명"
                                  placeholderTextColor={colors.gray700}
                                  value={newItemName}
                                  onChangeText={setNewItemName}
                                  maxLength={50}
                                  autoFocus
                                />
                                <TextInput
                                  style={styles.addingItemReasonInput}
                                  placeholder="이유 (선택사항)"
                                  placeholderTextColor={colors.gray700}
                                  value={newItemReason}
                                  onChangeText={setNewItemReason}
                                  maxLength={100}
                                />
                              </View>
                              <View style={styles.addingItemButtons}>
                                <TouchableOpacity
                                  style={styles.addingItemCancelButton}
                                  onPress={handleCancelAdding}
                                >
                                  <Text style={styles.addingItemCancelText}>
                                    취소
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.addingItemSaveButton}
                                  onPress={handleSaveAdding}
                                >
                                  <Text style={styles.addingItemSaveText}>
                                    저장
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          {items.length === 0 &&
                          addingCategory !== categoryKey ? (
                            <View style={styles.emptyCategory}>
                              <Text style={styles.emptyCategoryText}>
                                추가된 항목이 없습니다
                              </Text>
                            </View>
                          ) : (
                            items.map(item => {
                              const isHovered = hoveredItemId === item.id;
                              return (
                                <View
                                  key={item.id}
                                  style={styles.checklistItemWrapper}
                                  {...(Platform.OS === "web"
                                    ? {
                                        onMouseEnter: () =>
                                          setHoveredItemId(item.id),
                                        onMouseLeave: () =>
                                          setHoveredItemId(null),
                                      }
                                    : {})}
                                >
                                  <TouchableOpacity
                                    style={styles.checklistItem}
                                    onPress={() =>
                                      onToggleItem(item.id, !item.isChecked)
                                    }
                                  >
                                    <View style={styles.itemContent}>
                                      <View
                                        style={[
                                          styles.checkboxContainer,
                                          item.isChecked &&
                                            styles.checkboxContainerChecked,
                                        ]}
                                      >
                                        {item.isChecked ? (
                                          <AiCheckIcon
                                            width={13}
                                            height={13}
                                            fill={colors.white}
                                          />
                                        ) : null}
                                      </View>
                                      {!item.isCustom && (
                                        <View style={styles.aiBadge}>
                                          <GradientText
                                            style={styles.aiBadgeText}
                                          >
                                            AI
                                          </GradientText>
                                        </View>
                                      )}
                                      <View style={styles.itemTextContainer}>
                                        <View style={styles.itemTextRow}>
                                          <Text
                                            style={[
                                              styles.itemText,
                                              item.isChecked &&
                                                styles.itemTextChecked,
                                            ]}
                                          >
                                            {item.name} → {item.reason}
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  </TouchableOpacity>
                                  {isHovered && (
                                    <TouchableOpacity
                                      style={styles.deleteItemButton}
                                      onPress={() => onDeleteItem(item.id)}
                                    >
                                      <DeleteIcon
                                        width={18.33}
                                        height={18.33}
                                      />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              );
                            })
                          )}
                        </View>
                      </View>
                    ),
                  )}
              </ScrollView>
            </View>
          </GradientBackground>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: radii.lg,
    width: "100%",
    maxWidth: 506,
    maxHeight: "90%",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  loadingMessage: {
    ...textStyles.h6,
    color: colors.white,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.black,
  },
  aiRecommendButton: {
    width: 88,
    height: 30,
    borderRadius: 40,
    overflow: "hidden",
  },
  aiRecommendButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  aiRecommendButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  viewAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    color: colors.gray700,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    marginTop: spacing.xl,
  },
  checklistScrollView: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: "transparent",
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  checklistHeaderText: {
    ...textStyles.h5,
    color: colors.black,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    ...textStyles.h7,
    color: colors.black,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    position: "relative",
  },
  addItemButtonCard: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  addItemButtonTextCard: {
    ...textStyles.body4,
    color: colors.gray700,
    fontSize: 16,
    lineHeight: 20,
  },
  checklistItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  checklistItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  deleteItemButton: {
    padding: spacing.xs,
    marginRight: spacing.lg,
  },
  emptyCategory: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyCategoryText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  addingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  addingItemInputs: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  addingItemNameInput: {
    ...textStyles.body4,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.black,
  },
  addingItemReasonInput: {
    ...textStyles.body4,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.black,
  },
  addingItemButtons: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  addingItemCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.gray200,
  },
  addingItemCancelText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  addingItemSaveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
  },
  addingItemSaveText: {
    ...textStyles.body4,
    color: colors.white,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    width: 15,
    height: 15,
    borderRadius: 5,
    borderWidth: 1.25,
    borderColor: colors.gray400,
    marginRight: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxContainerChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  aiBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
    marginTop: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: typography.fontFamily.poppinsMedium,
    textAlign: "center",
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  itemText: {
    ...textStyles.body4,
    color: colors.black,
    flex: 1,
  },
  itemTextChecked: {
    color: colors.gray700,
  },
});
