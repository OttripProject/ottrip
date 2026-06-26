import { useMe } from "@/hooks/useMe";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AddCheckList from "../../../assets/mobile_plus.svg";
import AiCheckIcon from "../../../assets/ai_check.svg";
import XIcon from "../../../assets/close_sm.svg";
import AiRefreshIcon from "../../../assets/ai_refresh.svg";
import DeleteIcon from "../../../assets/delete.svg";

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

function Spinner({ size = 42, strokeWidth = 3, color = colors.aiInk }: { size?: number; strokeWidth?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: `${color}33`,
          borderTopColor: color,
          animationName: "spinner-rotate",
          animationDuration: "1s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        } as any}
      />
    );
  }

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: `${color}33`,
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
}

if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("spinner-keyframes")) {
  const style = document.createElement("style");
  style.id = "spinner-keyframes";
  style.textContent = "@keyframes spinner-rotate { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

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
  const escapeLockRef = useRef(false);

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
      onRequestClose={() => {
          if (escapeLockRef.current) return;
          if (addingCategory) {
            escapeLockRef.current = true;
            handleCancelAdding();
            setTimeout(() => { escapeLockRef.current = false; }, 100);
          } else {
            onClose();
          }
        }}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Spinner />
              <Text style={styles.loadingTitle}>AI가 체크리스트를 추천하고 있어요</Text>
              <Text style={styles.loadingSubtitle}>여행 일정을 분석해 필요한 항목을 추가하는 중...</Text>
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
                  colors={colors.aiGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aiRecommendButtonGradient}
                >
                  <AiRefreshIcon width={12} height={12} />
                  <Text style={styles.aiRecommendButtonText}>AI 추천</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon width={14} height={14} fill={colors.black}/>
            </TouchableOpacity>
          </View>
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.checklistScrollView}
              showsVerticalScrollIndicator={false}
            >
              {checklist &&
                Object.entries(checklist.categories).map(
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
                          {items.filter(i => i.isChecked).length}/{items.length}
                        </Text>
                        <View style={styles.categoryHeaderSpacer} />
                        {addingCategory !== categoryKey && (
                          <TouchableOpacity
                            onPress={() => handleStartAdding(categoryKey)}
                            style={styles.addItemButton}
                          >
                            <AddCheckList width={12} height={12} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {items.map(item => {
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
                                        width={10}
                                        height={10}
                                        color={colors.white}
                                      />
                                    ) : null}
                                  </View>
                                  {!item.isCustom && (
                                    <View style={styles.aiBadge}>
                                      <Text style={styles.aiBadgeText}>AI</Text>
                                    </View>
                                  )}
                                  <View style={styles.itemTextContainer}>
                                    <Text style={item.isChecked ? styles.itemTextStrikethrough : undefined}>
                                      <Text
                                        style={[
                                          styles.itemName,
                                          item.isChecked && styles.itemNameChecked,
                                        ]}
                                      >
                                        {item.name}
                                      </Text>
                                      {item.reason ? (
                                        <Text
                                          style={[
                                            styles.itemReason,
                                            item.isChecked &&
                                              styles.itemReasonChecked,
                                          ]}
                                        >
                                          {" · "}
                                          {item.reason}
                                        </Text>
                                      ) : null}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.deleteItemButton,
                                  { opacity: isHovered ? 1 : 0 },
                                ]}
                                onPress={() => onDeleteItem(item.id)}
                              >
                                <DeleteIcon width={11} height={11} color={colors.gray900} />
                              </TouchableOpacity>
                            </View>
                          );
                      })}
                      {addingCategory === categoryKey && (
                        <View style={styles.addingItemRow}>
                          <View style={styles.addingItemCheckboxPlaceholder} />
                          <View style={styles.addingItemInputs}>
                            <TextInput
                              style={styles.addingItemNameInput}
                              placeholder="항목명"
                              placeholderTextColor={colors.gray600}
                              value={newItemName}
                              onChangeText={setNewItemName}
                              maxLength={50}
                              autoFocus
                              onSubmitEditing={handleSaveAdding}
                            />
                            <TextInput
                              style={styles.addingItemReasonInput}
                              placeholder="이유 (선택)"
                              placeholderTextColor={colors.gray600}
                              value={newItemReason}
                              onChangeText={setNewItemReason}
                              maxLength={100}
                              onSubmitEditing={handleSaveAdding}
                            />
                          </View>
                          <View style={styles.addingItemButtons}>
                            <TouchableOpacity
                              style={styles.addingItemCancelButton}
                              onPress={handleCancelAdding}
                            >
                              <Text style={styles.addingItemCancelText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.addingItemSaveButton}
                              onPress={handleSaveAdding}
                            >
                              <Text style={styles.addingItemSaveText}>추가</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ),
                )}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
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
    borderRadius: 20,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: colors.white,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 18,
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
    marginBottom: 14,
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
    width: 74,
    height: 28,
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
    ...textStyles.h9,
    color: colors.white,
  },
  closeButton: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  checklistScrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  categorySection: {
    paddingVertical: 14,
  },
  categorySectionBorder: {
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
    ...textStyles.h7,
    color: colors.black,
  },
  categoryProgress: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  categoryHeaderSpacer: {
    flex: 1,
  },
  addItemButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checklistItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  checklistItem: {
    flex: 1,
  },
  deleteItemButton: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCategory: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  emptyCategoryText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  addingItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  addingItemCheckboxPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    opacity: 0.4,
    marginTop: 1,
  },
  addingItemInputs: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
  addingItemNameInput: {
    ...textStyles.body5,
    backgroundColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.gray900,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  addingItemReasonInput: {
    ...textStyles.body5,
    backgroundColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.gray900,
    outlineWidth: 0,
    outlineStyle: "none",
  } as any,
  addingItemButtons: {
    flexDirection: "row",
    gap: 6,
    alignSelf: "flex-start",
  },
  addingItemCancelButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  addingItemCancelText: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  addingItemSaveButton: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addingItemSaveText: {
    ...textStyles.h8,
    color: colors.white,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxContainerChecked: {
    backgroundColor: colors.gray900,
    borderColor: colors.gray900,
  },
  aiBadge: {
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 4,
    backgroundColor: colors.aiTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    marginTop: 1,
  },
  aiBadgeText: {
    ...textStyles.h10,
    color: colors.aiInk,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  itemTextStrikethrough: {
    textDecorationLine: "line-through",
    textDecorationColor: colors.gray500,
  },
  itemNameChecked: {
    color: colors.gray600,
  },
  itemReason: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  itemReasonChecked: {
    color: colors.gray500,
  },
});
