import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import PanelLayout from '../PanelLayout';
import GradientBackground from '@/ui/components/GradientBackground';
import api from '@/services/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import AiRefreshIcon from '../../../../assets/ai_refresh.svg';
import AiCautionIcon from '../../../../assets/ai_caution.svg';
import AiCheckedIcon from '../../../../assets/ai_checked.svg';
import AiCheckIcon from '../../../../assets/ai_check.svg';
import AiListIcon from '../../../../assets/ai_list.svg';

interface ChecklistItem {
  id: number;
  name: string;
  reason: string;
  isChecked: boolean;
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
  const [showPreview, setShowPreview] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showFullView, setShowFullView] = useState(false);

  // Plan이 선택될 때 기존 체크리스트 확인
  useEffect(() => {
    if (publicId) {
      checkExistingChecklist();
    } else {
      // Plan이 선택되지 않으면 상태 초기화
      setChecklist(null);
      setShowPreview(false);
    }
  }, [publicId]);

  const checkExistingChecklist = async () => {
    if (!publicId) return;
    
    try {
      const response = await api.get(`/private/ai/checklist/${publicId}`);
      
      if (response.data && response.data.categories) {
        const hasItems = Object.values(response.data.categories).some(
          (category: any) => category && category.length > 0
        );
        
        if (hasItems) {
          setChecklist(response.data);
          setShowPreview(true);
        } else {
          setChecklist(null);
          setShowPreview(false);
        }
      } else {
        setChecklist(null);
        setShowPreview(false);
      }
    } catch (error) {
      console.log('기존 체크리스트 없음 또는 오류:', error);
      setChecklist(null);
      setShowPreview(false);
    }
  };
  
  const handleGenerateChecklist = async () => {
    if (!publicId) return;
    
    try {
      setIsLoading(true);
      
      // 1. 유효성 검사: 상세일정 2개 이상 확인 (삭제되지 않은 일정만)
      const response = await api.get(`/private/plans/${publicId}`);
      const plan = response.data;
      
      // 삭제되지 않은 일정만 필터링
      const activeItineraries = plan.itineraries?.filter((it: any) => !it.is_deleted) || [];
      
      if (activeItineraries.length < 2) {
        setShowInsufficientModal(true);
        return;
      }
      
      // 2. AI 체크리스트 생성
      const checklistResponse = await api.post(`/private/ai/checklist/${publicId}/generate`, {
        force_regenerate: false
      });
      
      if (checklistResponse.data.success) {
        setChecklist(checklistResponse.data.checklist);
        setShowPreview(true);
      } else {
        Alert.alert('오류', checklistResponse.data.message || '체크리스트 생성에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('체크리스트 생성 오류:', error);
      Alert.alert('오류', '체크리스트 생성 중 오류가 발생했습니다.');
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
      
      // 기존 체크리스트를 강제로 재생성
      const response = await api.post(`/private/ai/checklist/${publicId}/generate`, {
        force_regenerate: true
      });
      
      if (response.data.success) {
        setChecklist(response.data.checklist);
        setShowPreview(true);
      } else {
        Alert.alert('오류', response.data.message || '체크리스트 새로고침에 실패했습니다.');
      }
    } catch (error) {
      console.error('체크리스트 새로고침 오류:', error);
      Alert.alert('오류', '체크리스트 새로고침 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAll = () => {
    setShowFullView(true);
  };

  const handleSimpleView = () => {
    setShowFullView(false);
  };

  const getCategoryTitle = (categoryKey: string) => {
    const titles: { [key: string]: string } = {
      'basicRequired': '기본 필수',
      'scheduleRequired': '일정 필수', 
      'recommended': '권장 (있으면 편리한 항목)',
      'optional': '옵션 (선택 사항)'
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
      
      // 로컬 상태 업데이트
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
      console.error('체크리스트 항목 업데이트 오류:', error);
      Alert.alert('오류', '체크리스트 항목 업데이트에 실패했습니다.');
    }
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

  // 그라데이션 텍스트 컴포넌트
  const GradientText = ({ children, style }: { children: string; style?: any }) => {
    if (Platform.OS === 'web') {
      // 웹에서는 CSS gradient 사용
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
    
    // 네이티브에서는 MaskedView 사용
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
          <Text style={[style, styles.headerTitleTransparent]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    );
  };

  return (
    <PanelLayout style={{ flex: 1 }}>
      <GradientBackground style={{ flex: 1 }}>
        {!publicId ? (
          // Plan이 선택되지 않은 상태
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
          </View>
        ) : !showPreview ? (
          // 초기 상태: AI 체크리스트 버튼
          <View style={styles.initialState}>
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={handleGenerateChecklist}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>체크리스트 생성 중...</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>AI 체크리스트</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : showFullView ? (
          // 전체보기 상태 (컨테이너 고정, 내부 스크롤)
          <View style={styles.fullViewContainer}>
            <View style={styles.headerSection}>
              <View style={styles.titleContainer}>
                <GradientText style={styles.headerTitle}>AI assistant</GradientText>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                  <AiRefreshIcon width={16} height={16} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleSimpleView} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>간단히 보기</Text>
              </TouchableOpacity>
            </View>
          <View style={styles.scrollWrapper}>
            <ScrollView style={styles.checklistScrollView} showsVerticalScrollIndicator={true}>
            {checklist && (
              <View style={styles.checklistHeader}>
                <AiListIcon width={16} height={16} />
                <Text style={styles.checklistHeaderText}>체크 리스트</Text>
              </View>
            )}
            {checklist && Object.entries(checklist.categories).map(([categoryKey, items]) => (
              <View key={categoryKey} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {getCategoryTitle(categoryKey)}
                </Text>
                <View style={styles.categoryCard}>
                  {items.map((item) => {
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.checklistItem}
                        onPress={() => handleToggleItem(item.id, !item.isChecked)}
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
                          <View style={styles.itemTextContainer}>
                            <Text style={[
                              styles.itemText,
                              item.isChecked && styles.itemTextChecked
                            ]}>
                              {item.name} → {item.reason}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            </ScrollView>
          </View>
        </View>
        ) : (
        // 미리보기 상태
        <View style={styles.previewContainer}>
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <GradientText style={styles.headerTitle}>AI assistant</GradientText>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <AiRefreshIcon width={16} height={16} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsWrapper}>
            <View style={styles.statsContainer}>
              <View style={styles.statGroup}>
                <View style={styles.statHeader}>
                  <View style={styles.statHeaderContent}>
                    <AiCautionIcon width={16} height={16} />
                    <Text style={styles.statTitleWarning}>준비 필요</Text>
                  </View>
                </View>
                <View style={[styles.statCard, styles.statCardWarning]}>
                  <Text style={styles.statNumber}>{stats.total - stats.checked}</Text>
                </View>
              </View>
              
              <View style={styles.statGroup}>
                <View style={styles.statHeader}>
                  <View style={styles.statHeaderContent}>
                    <View style={styles.checkIconWrapper}>
                      <View style={styles.checkIconBackground} />
                      <View style={styles.checkIconContainer}>
                        <AiCheckedIcon width={16} height={16} />
                      </View>
                    </View>
                    <Text style={styles.statTitleSuccess}>준비 됨</Text>
                  </View>
                </View>
                <View style={[styles.statCard, styles.statCardSuccess]}>
                  <Text style={styles.statNumber}>{stats.checked}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        )}
      </GradientBackground>

      {/* 새로고침 확인 Modal */}
      <Modal
        visible={showRefreshModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRefreshModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로고침</Text>
            <Text style={styles.modalMessage}>
              새로고침하면 이번 여행의{'\n'}
              체크리스트가 초기화돼요.{'\n'}
              계속 진행할까요?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRefreshModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setShowRefreshModal(false);
                  performRefresh();
                }}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 일정 부족 Modal */}
      <Modal
        visible={showInsufficientModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInsufficientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>일정이 부족해요</Text>
            <Text style={styles.modalMessage}>
              여행 일정이 아직 충분하지 않아{'\n'}
              AI 체크리스트를 만들 수 없어요.{'\n'}
              일정을 조금 더 추가해 주세요.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowInsufficientModal(false)}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  // 초기 상태 스타일
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // 미리보기 상태 스타일
  previewContainer: {
    flex: 1,
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
  headerTitleTransparent: {
    opacity: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: spacing.xs,
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
    ...textStyles.h6,
    color: colors.gray700,
  },
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
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  // 전체보기 스타일
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
  categoryTitle: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  checklistItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  itemText: {
    ...textStyles.body4,
    color: colors.black,
  },
  itemTextChecked: {
    color: colors.gray700,
  },
});
