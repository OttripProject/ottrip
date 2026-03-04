import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { Plan, Itinerary, Expense, TravelChecklistItem } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import GradientBackground from '@/ui/components/GradientBackground';
import TodayExpenseDetailModal from './TodayExpenseDetailModal.native';
import CloseIcon from '../../../../assets/x.svg';
import MemberIcon from '../../../../assets/mobile_member.svg';
import ItineraryIcon from '../../../../assets/mobile_check_backup.svg';
import CheckIcon from '../../../../assets/mobile_check.svg';
import LightningIcon from '../../../../assets/mobile_lightning.svg';
import MobileLocationIcon from '../../../../assets/mobile_location.svg';
import AddIcon from '../../../../assets/add.svg';
import api from '@/services/api';

interface TravelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  itineraries: Itinerary[];
  expenses: Expense[];
  planPublicId: string | null;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  onExpenseAdd?: (expense: Expense) => void;
  onRefreshExpenses?: () => Promise<void>;
}

const formatCurrency = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

const formatPeriod = (start: string, end: string) =>
  `${dayjs(start).format('YYYY.MM.DD')} ~ ${dayjs(end).format('YYYY.MM.DD')}`;

export default function TravelInfoModal({
  visible,
  onClose,
  plan,
  itineraries,
  expenses,
  planPublicId,
  planId,
  planStartDate,
  planEndDate,
  onExpenseAdd,
  onRefreshExpenses,
}: TravelInfoModalProps) {
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);
  const queryClient = useQueryClient();
  const togglingItems = React.useRef<Set<number>>(new Set());

  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['checklist', planPublicId],
    queryFn: async () => {
      if (!planPublicId) return null;
      try {
        const response = await api.get(`/private/ai/checklist/${planPublicId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!planPublicId && visible,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const totalExpenses = useMemo(() => {
    let total = 0;
    (expenses || []).forEach((e: Expense) => {
      total += Number(e?.amount || 0);
    });
    return total;
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const byCategory: Record<string, number> = {};
    (expenses || []).forEach((e: Expense) => {
      const cat = e?.category || '기타';
      byCategory[cat] = (byCategory[cat] || 0) + Number(e?.amount || 0);
    });
    return byCategory;
  }, [expenses]);

  const fullChecklistItems = useMemo(() => {
    const checklist = checklistData;
    if (!checklist?.categories) return [];
    const items: TravelChecklistItem[] = [];
    const categories = checklist.categories;
    if (!categories || typeof categories !== 'object') return [];
    Object.values(categories).forEach((category: any) => {
      if (Array.isArray(category)) {
        category.forEach((item: any) => {
          if (!item || typeof item !== 'object') return;
          items.push({
            id: item.id || 0,
            name: item.name || '',
            reason: item.reason || '',
            is_checked: item.is_checked ?? item.isChecked ?? false,
            is_custom: item.is_custom ?? item.isCustom ?? false,
            date: item.date,
          });
        });
      }
    });
    return items;
  }, [checklistData]);

  const memberCount = 1; // TODO: 공유 기능 추가 후 실제 멤버 수
  const itineraryCount = itineraries?.length ?? 0;

  const handleToggleChecklistItem = async (itemId: number, isChecked: boolean) => {
    if (!planPublicId) return;
    if (togglingItems.current.has(itemId)) return;
    togglingItems.current.add(itemId);
    const previousData = queryClient.getQueryData(['checklist', planPublicId]);
    queryClient.setQueryData(['checklist', planPublicId], (old: any) => {
      if (!old?.categories) return old;
      const updated = { ...old };
      const categories = { ...updated.categories };
      Object.keys(categories).forEach((categoryKey) => {
        const items = categories[categoryKey];
        if (Array.isArray(items)) {
          categories[categoryKey] = items.map((item: any) =>
            item.id === itemId ? { ...item, is_checked: isChecked } : item
          );
        }
      });
      return { ...updated, categories };
    });
    try {
      await api.patch(`/private/ai/checklist/${planPublicId}/item/${itemId}`, {
        is_checked: isChecked,
      });
    } catch {
      queryClient.setQueryData(['checklist', planPublicId], previousData);
    } finally {
      togglingItems.current.delete(itemId);
    }
  };

  const handleAddChecklistItem = async () => {
    const name = newChecklistItem.trim();
    if (!name || !planPublicId) return;
    setAddingChecklistItem(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/item`, {
        name,
        reason: '',
        category: 'basic_required',
        date: planStartDate || dayjs().format('YYYY-MM-DD'),
      });
      setNewChecklistItem('');
      refetchChecklist();
    } catch {
      Alert.alert('오류', '체크리스트 항목 추가에 실패했습니다.');
    } finally {
      setAddingChecklistItem(false);
    }
  };

  const handleAiRecommendChecklist = async () => {
    if (!planPublicId) return;
    if ((itineraries?.length ?? 0) < 2) {
      Alert.alert('알림', '체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다.');
      return;
    }
    setAiRecommendLoading(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/generate`, {
        force_regenerate: true,
        date: planStartDate || dayjs().format('YYYY-MM-DD'),
      });
      refetchChecklist();
    } catch {
      Alert.alert('오류', 'AI 체크리스트 생성에 실패했습니다.');
    } finally {
      setAiRecommendLoading(false);
    }
  };

  const handleExpenseAdded = async (expense: Expense) => {
    onExpenseAdd?.(expense);
    setShowExpenseDetail(false);
    await onRefreshExpenses?.();
  };

  if (!plan) return null;

  return (
    <FullScreenModal visible={visible} onClose={onClose} containerBackgroundColor={colors.gray300}>
      {/* Header - Figma: 여행 정보 + 닫기 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>여행 정보</Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <CloseIcon width={24} height={24} color={colors.black} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: 여행제목 + 기간 - 흰색 카드 */}
        <View style={styles.card}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planPeriod}>{formatPeriod(plan.startDate, plan.endDate)}</Text>
        </View>

        {/* Card 2: 여행 총 경비 - 흰색 카드, 라벨 gray, 금액 black, 검정 버튼 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>여행 총 경비</Text>
          <Text style={styles.expenseAmount}>{formatCurrency(totalExpenses)}</Text>
          <Pressable
            style={styles.expenseDetailButton}
            onPress={() => setShowExpenseDetail(true)}
          >
            <Text style={styles.expenseDetailButtonText}>상세 내역 및 비용 추가</Text>
          </Pressable>
        </View>

        {/* Card 3: 참여 멤버 / 등록 일정 - 카드 2개, 같은 줄, gap 9 */}
        <View style={styles.twoCardRow}>
          <View style={styles.smallCard}>
            <MemberIcon width={20} height={20} color={colors.black} />
            <Text style={styles.twoColValue}>{memberCount}명</Text>
            <Text style={styles.twoColLabel}>참여 멤버</Text>
          </View>
          <View style={styles.smallCard}>
            <ItineraryIcon width={20} height={20} color={colors.black} />
            <Text style={styles.twoColValue}>{itineraryCount}개</Text>
            <Text style={styles.twoColLabel}>등록 일정</Text>
          </View>
        </View>

        {/* Card 4: 공유 메모 - 흰색 카드, 연한 파란 박스, 파란 텍스트 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>공유 메모</Text>
          {plan.memo ? (
            <View style={styles.memoBox}>
              <Text style={styles.memoText}>{plan.memo}</Text>
            </View>
          ) : (
            <View style={styles.memoBox}>
              <Text style={styles.memoPlaceholder}>메모가 없습니다</Text>
            </View>
          )}
        </View>

        {/* Card 5: 여행 준비 체크리스트 - 흰색 카드, pin+제목+plus, 빈 상태: AI 추천받기 */}
        <View style={styles.card}>
          <View style={styles.checklistHeader}>
            <View style={styles.checklistHeaderLeft}>
              <MobileLocationIcon width={20} height={20} color={colors.black} />
              <Text style={styles.checklistTitle}>여행 준비 체크리스트</Text>
            </View>
            <Pressable onPress={() => {}} hitSlop={8}>
              <AddIcon width={20} height={20} color={colors.black} />
            </Pressable>
          </View>

          {fullChecklistItems.length > 0 ? (
            <View style={styles.checklistList}>
              {fullChecklistItems.map((item) => (
                <View key={item.id} style={styles.checklistItem}>
                  <Pressable
                    onPress={() => handleToggleChecklistItem(item.id, !item.is_checked)}
                    hitSlop={8}
                  >
                    <View style={[styles.checkbox, item.is_checked && styles.checkboxSelected]}>
                      <CheckIcon width={16} height={16} fill={colors.white} />
                    </View>
                  </Pressable>
                  <Text
                    style={[styles.checklistItemName, item.is_checked && styles.checklistItemChecked]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </Text>
                  {!item.is_custom && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.checklistEmpty}>
              <Text style={styles.checklistEmptyTitle}>체크리스트가 비어있어요</Text>
              <Text style={styles.checklistEmptySubtitle}>
                AI가 일정에 맞는 준비물을 추천해드려요.
              </Text>
              <Pressable
                onPress={handleAiRecommendChecklist}
                disabled={aiRecommendLoading}
                style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              >
                <GradientBackground
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.aiRecommendButton}
                >
                  <View style={styles.aiRecommendButtonContent}>
                    <LightningIcon width={16} height={16} color={colors.black} />
                    <Text style={styles.aiRecommendButtonText}>AI 추천받기</Text>
                  </View>
                </GradientBackground>
              </Pressable>
            </View>
          )}

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="할일 입력..."
              placeholderTextColor={colors.gray500}
              value={newChecklistItem}
              onChangeText={setNewChecklistItem}
              maxLength={100}
              editable={!addingChecklistItem}
              returnKeyType="done"
              onSubmitEditing={handleAddChecklistItem}
            />
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
              onPress={handleAddChecklistItem}
              disabled={addingChecklistItem || !newChecklistItem.trim()}
            >
              <Text style={styles.addButtonText}>추가</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <TodayExpenseDetailModal
        visible={showExpenseDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={expenses || []}
        total={totalExpenses}
        byCategory={expensesByCategory}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        onExpenseAdd={handleExpenseAdded}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.gray300,
  },
  headerTitle: {
    ...textStyles.h5,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,  
    marginBottom: 8,
  },
  planTitle: {
    ...textStyles.h4,
    marginBottom: 7,
  },
  planPeriod: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  cardLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 4,
  },
  expenseAmount: {
    ...textStyles.h2,
    marginBottom: 16,
  },
  expenseDetailButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDetailButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  twoCardRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 8,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  twoColValue: {
    ...textStyles.h3,
    color: colors.black,
    marginVertical: 8,
  },
  twoColLabel: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  memoBox: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: 16,
  },
  memoText: {
    ...textStyles.body3,
    color: colors.primary,
  },
  memoPlaceholder: {
    ...textStyles.body4,
    color: colors.gray500,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  checklistList: {
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checklistItemName: {
    ...textStyles.body3,
    color: colors.black,
    flex: 1,
  },
  checklistItemChecked: {
    color: colors.gray500,
    textDecorationLine: 'line-through',
  },
  aiTag: {
    backgroundColor: colors.gray200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiTagText: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  checklistEmpty: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 26,
    marginBottom: 16,
  },
  checklistEmptyTitle: {
    ...textStyles.h6,
    color: colors.gray700,
    marginBottom: 4,
    textAlign: 'center',
  },
  checklistEmptySubtitle: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 16,
    textAlign: 'center',
  },
  aiRecommendButton: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  aiRecommendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiRecommendButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    ...textStyles.body3,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.black,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  addButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
