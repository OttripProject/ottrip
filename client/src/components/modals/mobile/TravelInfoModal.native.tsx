import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Keyboard } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plan, Itinerary, Accommodation, FlightRead, Expense } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { plansApi } from '@/services/plans';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import TodayExpenseDetailModal from './TodayExpenseDetailModal.native';
import AddExpenseModal from './AddExpenseModal.native';
import SharedMembersModal from './SharedMembersModal.native';
import WeeklyChecklistCard from '@/components/cards/WeeklyChecklistCard.native';
import CloseIcon from '../../../../assets/x.svg';
import MemberIcon from '../../../../assets/mobile_member.svg';
import ItineraryIcon from '../../../../assets/mobile_check_backup.svg';

interface TravelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  itineraries: Itinerary[];
  accommodations?: Accommodation[];
  flights?: FlightRead[];
  expenses: Expense[];
  planPublicId: string | null;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  onExpenseAdd?: (expense: Expense) => void;
  onRefreshExpenses?: () => Promise<void>;
  onRefreshPlan?: () => Promise<void>;
}

const formatCurrency = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

const formatPeriod = (start: string, end: string) =>
  `${dayjs(start).format('YYYY.MM.DD')} ~ ${dayjs(end).format('YYYY.MM.DD')}`;

export default function TravelInfoModal({
  visible,
  onClose,
  plan,
  itineraries,
  accommodations = [],
  flights = [],
  expenses,
  planPublicId,
  planId,
  planStartDate,
  planEndDate,
  onExpenseAdd,
  onRefreshExpenses,
  onRefreshPlan,
}: TravelInfoModalProps) {
  const queryClient = useQueryClient();
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpenseFromDetail, setShowAddExpenseFromDetail] = useState(false);
  const [showSharedMembers, setShowSharedMembers] = useState(false);
  const [memo, setMemo] = useState(plan?.memo ?? '');

  useEffect(() => {
    if (visible && plan) {
      setMemo(plan.memo ?? '');
    }
  }, [visible, plan?.id, plan?.memo]);

  useEffect(() => {
    if (visible && onRefreshExpenses) {
      onRefreshExpenses();
    }
  }, [visible]);

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

  const memberCount = 1; // TODO: 공유 기능 추가 후 실제 멤버 수
  const scheduleCount = (itineraries?.length ?? 0) + (accommodations?.length ?? 0) + (flights?.length ?? 0);

  const handleExpenseAdded = async (expense: Expense) => {
    onExpenseAdd?.(expense);
    setShowExpenseDetail(false);
    await onRefreshExpenses?.();
  };

  const handleMemoBlur = useCallback(async () => {
    if (!plan?.id) return;
    const trimmed = memo.trim();
    if (trimmed === (plan.memo ?? '')) return;
    try {
      await plansApi.setMemo(plan.id, trimmed);
      queryClient.invalidateQueries({ queryKey: ['plan', planPublicId ?? undefined] });
      await onRefreshPlan?.();
    } catch {
      setMemo(plan.memo ?? '');
    }
  }, [plan?.id, plan?.memo, memo, planPublicId, onRefreshPlan, queryClient]);

  const handleClose = useCallback(async () => {
    Keyboard.dismiss();
    await handleMemoBlur();
    onClose();
  }, [handleMemoBlur, onClose]);

  if (!plan) return null;

  return (
    <FullScreenModal visible={visible} onClose={handleClose} containerBackgroundColor={colors.gray300}>
      {/* Header - Figma: 여행 정보 + 닫기 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>여행 정보</Text>
        <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={8}>
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
          <Pressable
            style={styles.smallCard}
            onPress={() => setShowSharedMembers(true)}
          >
            <MemberIcon width={20} height={20} color={colors.black} />
            <Text style={styles.twoColValue}>{memberCount}명</Text>
            <Text style={styles.twoColLabel}>참여 멤버</Text>
          </Pressable>
          <View style={styles.smallCard}>
            <ItineraryIcon width={20} height={20} color={colors.black} />
            <Text style={styles.twoColValue}>{scheduleCount}개</Text>
            <Text style={styles.twoColLabel}>등록 일정</Text>
          </View>
        </View>

        {/* Card 4: 공유 메모 - 흰색 카드, 연한 파란 박스, 편집 가능, blur 시 저장 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>공유 메모</Text>
          <View style={styles.memoBox}>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              onBlur={handleMemoBlur}
              placeholder="메모를 입력하세요"
              placeholderTextColor={colors.gray500}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Card 5: 여행 준비 체크리스트 - plan 전체용 */}
        {planPublicId && (
          <View style={styles.checklistCardWrapper}>
            <WeeklyChecklistCard
              planPublicId={planPublicId}
              mode="full"
              planStartDate={planStartDate}
              itineraries={itineraries ?? []}
              titleOverride="여행 준비 체크리스트"
            />
          </View>
        )}
      </ScrollView>

      <TodayExpenseDetailModal
        visible={showExpenseDetail && !showAddExpenseFromDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={expenses || []}
        total={totalExpenses}
        byCategory={expensesByCategory}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        title="전체 여행 비용"
        onExpenseAdd={handleExpenseAdded}
        onAddExpensePress={() => {
          setShowExpenseDetail(false);
          setShowAddExpenseFromDetail(true);
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseFromDetail}
        onClose={(opts) => {
          setShowAddExpenseFromDetail(false);
          if (opts?.fromSave) {
            setShowExpenseDetail(false);
          } else {
            setShowExpenseDetail(true);
          }
        }}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        onExpenseAdd={handleExpenseAdded}
      />

      <SharedMembersModal
        visible={showSharedMembers}
        onClose={() => setShowSharedMembers(false)}
        planId={planId}
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
  memoInput: {
    ...textStyles.body3,
    color: colors.primary,
    minHeight: 60,
    padding: 0,
  },
  checklistCardWrapper: {
    marginTop: 12,
  },
});
