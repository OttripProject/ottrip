import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import PanelLayout from '../PanelLayout';
import RefreshChecklistModal from '../../modals/AiRefreshChecklistModal';
import InsufficientScheduleModal from '../../modals/AiInsufficientModal';
import AiChecklistListViewModal from '../../modals/AiChecklistListViewModal';
import api from '@/services/api';
import { handleGuestPromptError } from '@/utils/guestPrompt';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';

interface ChecklistItem {
  id: number;
  name: string;
  reason: string;
  isChecked: boolean;
  isCustom: boolean;  // true: 사용자 추가, false: AI 생성
}

interface ChecklistCategory {
  [key: string]: ChecklistItem[];
}

interface ChecklistData {
  categories: ChecklistCategory;
}

interface AIAssistantPanelProps {
  publicId: string | null;
}

export default function AIAssistantPanel({ publicId }: AIAssistantPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showListViewModal, setShowListViewModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemReason, setNewItemReason] = useState('');

  const checkExistingChecklist = useCallback(async () => {
    if (!publicId) {
      setChecklist(null);
      return;
    }
    
    try {
      const response = await api.get(`/private/ai/checklist/${publicId}`);
      
      if (response.data && response.data.categories) {
        setChecklist(response.data);
      } else {
        setChecklist(null);
      }
    } catch (error) {
      setChecklist(null);
    }
  }, [publicId]);

  useEffect(() => {
    if (publicId) {
      checkExistingChecklist();
    } else {
      setChecklist(null);
    }
  }, [publicId, checkExistingChecklist]);
  
  const handleGenerateChecklist = async () => {
    if (!publicId) return;
    
    try {
      setIsLoading(true);
      
      const response = await api.get(`/private/plans/${publicId}`);
      const plan = response.data;
      
      const activeItineraries = plan.itineraries?.filter((it: any) => !it.is_deleted) || [];
      
      if (activeItineraries.length < 2) {
        setIsLoading(false);
        setShowInsufficientModal(true);
        return;
      }
      
      const checklistResponse = await api.post(`/private/ai/checklist/${publicId}/generate`, {
        force_regenerate: true
      });
      
      if (checklistResponse.data.success) {
        setChecklist(checklistResponse.data.checklist);
      } else {
        Alert.alert('알림', checklistResponse.data.message || '체크리스트 생성에 실패했습니다.');
      }
      
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('알림', '체크리스트 생성 중 알림가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setShowRefreshModal(true);
  };

  const performRefresh = async () => {
    if (!publicId) return;
    
    try {
      setIsLoading(true);
      
      const planResponse = await api.get(`/private/plans/${publicId}`);
      const plan = planResponse.data;
      
      const activeItineraries = plan.itineraries?.filter((it: any) => !it.is_deleted) || [];
      
      if (activeItineraries.length < 2) {
        setIsLoading(false);
        setShowInsufficientModal(true);
        return;
      }
      
      const response = await api.post(`/private/ai/checklist/${publicId}/generate`, {
        force_regenerate: true
      });
      
      if (response.data.success) {
        setChecklist(response.data.checklist);
      } else {
        Alert.alert('알림', response.data.message || '체크리스트 새로고침에 실패했습니다.');
      }
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('알림', '체크리스트 새로고침 중 알림가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAll = () => {
    setShowListViewModal(true);
  };

  const handleCloseListViewModal = () => {
    setShowListViewModal(false);
  };

  const getCategoryTitle = (categoryKey: string) => {
    const titles: { [key: string]: string } = {
      'basicRequired': '꼭 챙겨야 해요',
      'scheduleRequired': '이번 일정에 필요해요', 
      'recommended': '있으면 더 좋아요',
      'optional': '선택이에요'
    };
    return titles[categoryKey] || categoryKey;
  };

  const handleToggleItem = async (itemId: number, isChecked: boolean) => {
    if (!publicId) return;
    
    try {
      const endpoint = `/private/ai/checklist/${publicId}/item/${itemId}`;
      
      await api.patch(endpoint, {
        is_checked: isChecked
      });
      
      if (checklist) {
        const updatedChecklist = { ...checklist };
        Object.values(updatedChecklist.categories).forEach(category => {
          category.forEach(item => {
            if (item.id === itemId) {
              item.isChecked = isChecked;
            }
          });
        });
        setChecklist(updatedChecklist);
      }
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('알림', '체크리스트 항목 업데이트에 실패했습니다.');
    }
  };

  const handleAddItem = async (name: string, reason: string, category: string) => {
    if (!publicId) return;
    
    try {
      const endpoint = `/private/ai/checklist/${publicId}/item`;
      
      await api.post(endpoint, {
        name,
        reason,
        category
      });
      
      await checkExistingChecklist();
      
      setAddingCategory(null);
      setNewItemName('');
      setNewItemReason('');
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('알림', '체크리스트 항목 추가에 실패했습니다.');
    }
  };

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
      Alert.alert('알림', '항목명을 입력해주세요.');
      return;
    }
    handleAddItem(newItemName.trim(), newItemReason.trim(), addingCategory);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!publicId) return;
    
    try {
      const endpoint = `/private/ai/checklist/${publicId}/item/${itemId}`;
      
      await api.delete(endpoint);
      
      await checkExistingChecklist();
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('알림', '체크리스트 항목 삭제에 실패했습니다.');
    }
  };

  const hasChecklistItems = () => {
    if (!checklist || !checklist.categories) return false;
    
    return Object.values(checklist.categories).some(
      (category: any) => category && Array.isArray(category) && category.length > 0
    );
  };

  // 미리보기 통계 계산
  const getPreviewStats = () => {
    if (!checklist) return { total: 0, checked: 0 };
    
    let total = 0;
    let checked = 0;
    
    Object.values(checklist.categories).forEach(category => {
      category.forEach(item => {
        total++;
        if (item.isChecked) checked++;
      });
    });
    
    return { total, checked };
  };

  const stats = getPreviewStats();
  const hasItems = hasChecklistItems();

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

  return (
    <PanelLayout style={{ flex: 1 }}>
      <View style={styles.contentContainer}>
          {!publicId ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
            </View>
          ) : (
            <View
              style={styles.previewContainer}
            >
            <View style={styles.headerSection}>
              <View style={styles.titleContainer}>
                {/* <GradientText style={styles.headerTitle}>체크리스트</GradientText> */}
                <Text style={styles.headerTitle}>체크리스트</Text>
              </View>
              <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>상세보기</Text>
              </TouchableOpacity>
            </View>
            
            {/* 작은 통계 버튼 */}
            <View style={styles.simpleStatsContainer}>
              <View style={styles.simpleStatButton}>
                <Text style={styles.simpleStatLabel}>준비 필요</Text>
                <Text style={styles.simpleStatNumber}>{stats.total - stats.checked}개</Text>
              </View>
              <View style={styles.simpleStatButton}>
                <Text style={styles.simpleStatLabel}>준비 됨</Text>
                <Text style={styles.simpleStatNumber}>{stats.checked}개</Text>
              </View>
            </View>

            {/* (리스트 제거) */}
          </View>
          )}
      </View>

      {/* 리스트 보기 Modal */}
      <AiChecklistListViewModal
        visible={showListViewModal}
        checklist={checklist}
        isLoading={isLoading}
        onClose={handleCloseListViewModal}
        onRefresh={handleRefresh}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        onAddItem={handleAddItem}
      />

      {/* 새로고침 확인 Modal */}
      <RefreshChecklistModal
        visible={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onConfirm={() => {
          setShowRefreshModal(false);
          performRefresh();
        }}
      />

      {/* 일정 부족 Modal */}
      <InsufficientScheduleModal
        visible={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
      />

    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  generateButton: {
    backgroundColor: colors.gray400,
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  generateButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    ...textStyles.body4,
    color: colors.white,
  },
  previewContainer: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...textStyles.h4,
  },
  headerTitleTransparent: {
    opacity: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButton: {
    width: 74,
    height: 32,
    borderRadius: 28,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    ...textStyles.h8,
    color: colors.black,
  },
  simpleStatsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg, // headerSection과의 간격
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flex: 1, // 남은 높이 채우기
    alignItems: 'stretch',
  },
  simpleStatButton: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleStatLabel: {
    ...textStyles.h6,
    color: colors.gray700,
    marginLeft: 16,
  },
  simpleStatNumber: {
    ...textStyles.h6,
    color: colors.black,
    marginRight: 16,
  },
  // 간단히 보기 카테고리 섹션
  previewCategorySection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  previewCategoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewCategoryTitle: {
    ...textStyles.h7,
    color: colors.black,
  },
  previewAddItemButtonCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  previewAddItemButtonTextCard: {
    ...textStyles.body4,
    color: colors.gray700,
    fontSize: 16,
    lineHeight: 20,
  },
  previewCategoryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    position: 'relative',
  },
  previewChecklistItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewChecklistItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  previewItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  previewEmptyCategory: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  previewEmptyCategoryText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  emptyChecklistMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyChecklistText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  // 기존 상세 보기용 스타일 (유지)
  statsWrapper: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md + 3,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  statGroup: {
    flex: 1,
  },
  statCard: {
    width: '100%',
    aspectRatio: 5 / 4.55,
    borderRadius: radii.md + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardWarning: {
    backgroundColor: colors.white,
  },
  statCardSuccess: {
    backgroundColor: colors.white,
  },
  statHeader: {
    marginBottom: spacing.sm + 1,
  },
  statHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  statTitleWarning: {
    ...textStyles.h7,
    color: colors.gray700,
  },
  statTitleSuccess: {
    ...textStyles.h7,
    color: colors.gray700,
  },
  checkIconWrapper: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkIconBackground: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    top: 2,
    left: 2,
  },
  checkIconContainer: {
    zIndex: 1,
    position: 'relative',
  },
  statNumber: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 50,
    lineHeight: 70,
    color: colors.gray900,
  },
  // Placeholder 상태 스타일
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Modal 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.black,
  },
  confirmButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  // 전체보기 스타일 (모달에서도 사용)
  fullViewContainer: {
    flex: 1,
    minHeight: 0,
  },
  checklistScrollView: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'transparent',
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
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
  addItemButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.gray100,
  },
  addItemButtonText: {
    ...textStyles.body4,
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
  // 아이템 추가 row 스타일
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
  // 간단히 보기용 추가 row 스타일
  previewAddingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  previewAddingItemInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  checkboxContainer: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.3,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxContainerChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  checkboxEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
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
