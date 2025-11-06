import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Pressable } from 'react-native';
import ModalLayout from './ModalLayout';
import api from '@/services/api';

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

interface AIAssistantModalProps {
  planId: number | null;
}

export default function AIAssistantModal({ planId }: AIAssistantModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showFullView, setShowFullView] = useState(false);

  // Plan이 선택될 때 기존 체크리스트 확인
  useEffect(() => {
    if (planId) {
      checkExistingChecklist();
    } else {
      // Plan이 선택되지 않으면 상태 초기화
      setChecklist(null);
      setShowPreview(false);
    }
  }, [planId]);

  const checkExistingChecklist = async () => {
    if (!planId) return;
    
    try {
      const response = await api.get(`/private/ai/checklist/${planId}`);
      
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
    try {
      setIsLoading(true);
      
      // 1. 유효성 검사: 상세일정 2개 이상 확인 (삭제되지 않은 일정만)
      const response = await api.get(`/private/plans/${planId}`);
      const plan = response.data;
      
      // 삭제되지 않은 일정만 필터링
      const activeItineraries = plan.itineraries?.filter((it: any) => !it.is_deleted) || [];
      
      if (activeItineraries.length < 2) {
        setShowInsufficientModal(true);
        return;
      }
      
      // 2. AI 체크리스트 생성
      const checklistResponse = await api.post(`/private/ai/checklist/${planId}/generate`, {
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
    if (!planId) return;
    
    try {
      setIsLoading(true);
      
      // 기존 체크리스트를 강제로 재생성
      const response = await api.post(`/private/ai/checklist/${planId}/generate`, {
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
      'recommended': '권장',
      'optional': '옵션'
    };
    return titles[categoryKey] || categoryKey;
  };

  const handleToggleItem = async (itemId: number, isChecked: boolean) => {
    if (!planId) return;
    
    try {
      const endpoint = `/private/ai/checklist/${planId}/item/${itemId}`;
      
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

  return (
    <ModalLayout style={{ flex: 1 }}>
      {!planId ? (
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
            <Text style={styles.headerTitle}>AI assistant</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSimpleView} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>간단히 보기</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.scrollWrapper}>
            <ScrollView style={styles.checklistScrollView} showsVerticalScrollIndicator={true}>
            {checklist && Object.entries(checklist.categories).map(([categoryKey, items]) => (
              <View key={categoryKey} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {getCategoryTitle(categoryKey)}
                </Text>
                {items.map((item) => {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => handleToggleItem(item.id, !item.isChecked)}
                    >
                      <View style={styles.itemContent}>
                        <View style={styles.checkboxContainer}>
                          <Text style={styles.checkbox}>
                            {item.isChecked ? '☑️' : '☐'}
                          </Text>
                        </View>
                        <View style={styles.itemTextContainer}>
                          <Text style={[
                            styles.itemName,
                            item.isChecked && styles.itemNameChecked
                          ]}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemReason}>{item.reason}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        // 미리보기 상태
        <View style={styles.previewContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>전체보기</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.centerContent}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statTitle}>준비 필요 ⚠️</Text>
                </View>
                <Text style={styles.statNumber}>{stats.total - stats.checked}</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statTitle}>준비됨 ✅</Text>
                </View>
                <Text style={styles.statNumber}>{stats.checked}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

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
    </ModalLayout>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  refreshButton: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 16,
  },
  viewAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingHorizontal: 16,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  checklistItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    fontSize: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemNameChecked: {
    color: '#666',
  },
  itemReason: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
