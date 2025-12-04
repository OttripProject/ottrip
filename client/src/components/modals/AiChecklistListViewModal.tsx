import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import GradientBackground from '@/ui/components/GradientBackground';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import AiRefreshIcon from '../../../assets/ai_refresh.svg';
import AiCheckIcon from '../../../assets/ai_check.svg';
import AiListIcon from '../../../assets/ai_list.svg';
import DeleteIcon from '../../../assets/delete_ai.svg';
import XIcon from '../../../assets/x.svg';

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
  onClose: () => void;
  onRefresh: () => void;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onDeleteItem: (itemId: number) => void;
  onAddItem: (name: string, reason: string, category: string) => void;
}

// 그라데이션 텍스트 컴포넌트
const GradientText = ({ children, style }: { children: string; style?: any }) => {
  if (Platform.OS === 'web') {
    return (
      <Text 
        style={[
          style,
          {
            background: 'linear-gradient(90deg, #FF2391 0%, #1F96FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } as any
        ]}
      >
        {children}
      </Text>
    );
  }

  return (
    <MaskedView
      maskElement={
        <Text style={style}>{children}</Text>
      }
      style={{ flexDirection: 'row', height: 24 }}
    >
      <LinearGradient
        colors={['#FF2391', '#1F96FF']}
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
    'basicRequired': '기본 필수',
    'basic_required': '기본 필수',
    'scheduleRequired': '일정 필수',
    'schedule_required': '일정 필수',
    'recommended': '권장 (있으면 편리한 항목)',
    'optional': '옵션 (선택 사항)',
  };
  return titles[categoryKey] || categoryKey;
};

export default function AiChecklistListViewModal({
  visible,
  checklist,
  onClose,
  onRefresh,
  onToggleItem,
  onDeleteItem,
  onAddItem,
}: AiChecklistListViewModalProps) {
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemReason, setNewItemReason] = useState('');
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

  const handleStartAdding = (categoryKey: string) => {
    setAddingCategory(categoryKey);
    setNewItemName('');
    setNewItemReason('');
  };

  const handleCancelAdding = () => {
    setAddingCategory(null);
    setNewItemName('');
    setNewItemReason('');
  };

  const handleSaveAdding = () => {
    if (!addingCategory || !newItemName.trim()) {
      return;
    }
    onAddItem(newItemName.trim(), newItemReason.trim(), addingCategory);
    setAddingCategory(null);
    setNewItemName('');
    setNewItemReason('');
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
          <GradientBackground style={{ flex: 1 }}>
            <View style={styles.headerSection}>
              <View style={styles.titleContainer}>
                <GradientText style={styles.headerTitle}>Cheklist</GradientText>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                  <AiRefreshIcon width={16} height={16} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.viewAllButton}>
                <XIcon width={20} height={20}  />
              </TouchableOpacity>
            </View>
            <View style={styles.scrollWrapper}>
              <ScrollView style={styles.checklistScrollView} showsVerticalScrollIndicator={false}>
              {checklist && (
                <View style={styles.checklistHeader}>
                  <AiListIcon width={16} height={16} />
                  <Text style={styles.checklistHeaderText}>체크 리스트</Text>
                </View>
              )}
              {checklist && Object.entries(checklist.categories).map(([categoryKey, items]) => (
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
                        <Text style={styles.addItemButtonTextCard}>+</Text>
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
                            <Text style={styles.addingItemCancelText}>취소</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addingItemSaveButton}
                            onPress={handleSaveAdding}
                          >
                            <Text style={styles.addingItemSaveText}>저장</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {items.length === 0 && addingCategory !== categoryKey ? (
                      <View style={styles.emptyCategory}>
                        <Text style={styles.emptyCategoryText}>추가된 항목이 없습니다</Text>
                      </View>
                    ) : (
                      items.map((item) => {
                        const isHovered = hoveredItemId === item.id;
                        return (
                          <View 
                            key={item.id} 
                            style={styles.checklistItemWrapper}
                            {...(Platform.OS === 'web' ? {
                              onMouseEnter: () => setHoveredItemId(item.id),
                              onMouseLeave: () => setHoveredItemId(null),
                            } : {})}
                          >
                            <TouchableOpacity
                              style={styles.checklistItem}
                              onPress={() => onToggleItem(item.id, !item.isChecked)}
                            >
                              <View style={styles.itemContent}>
                                <View style={[
                                  styles.checkboxContainer,
                                  item.isChecked && styles.checkboxContainerChecked
                                ]}>
                                  {item.isChecked ? (
                                    <AiCheckIcon width={13} height={13} fill={colors.white} />
                                  ) : null}
                                </View>
                                {!item.isCustom && (
                                  <View style={styles.aiBadge}>
                                    <GradientText style={styles.aiBadgeText}>AI</GradientText>
                                  </View>
                                )}
                                <View style={styles.itemTextContainer}>
                                  <View style={styles.itemTextRow}>
                                    <Text style={[
                                      styles.itemText,
                                      item.isChecked && styles.itemTextChecked
                                    ]}>
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
                                <DeleteIcon width={18.33} height={18.33} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 506,
    maxHeight: '90%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.black,
  },
  refreshButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.gray700,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  checklistScrollView: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'transparent',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  checklistHeaderText: {
    ...textStyles.h7,
    color: colors.black,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    position: 'relative',
  },
  addItemButtonCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  addItemButtonTextCard: {
    ...textStyles.body4,
    color: colors.gray700,
    fontSize: 16,
    lineHeight: 20,
  },
  checklistItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  deleteItemButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  emptyCategory: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyCategoryText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  addingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  addingItemInputs: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    width: 15,
    height: 15,
    borderRadius: 5,
    borderWidth: 1.25,
    borderColor: colors.gray400,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: typography.fontFamily.poppinsMedium,
    textAlign: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
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

