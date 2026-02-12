import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import { Plan } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import CheckedIcon from '../../../../assets/mobile_plan_checked.svg';
import UnCheckedIcon from '../../../../assets/mobile_plan_unchecked.svg';
import AddPlanIcon from '../../../../assets/mobile_plan_add.svg';
import UpdateIcon from '../../../../assets/update.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';

function formatPlanDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate).format('YYYY.MM.DD');
  const end = dayjs(endDate).format('YYYY.MM.DD');
  return `${start} ~ ${end}`;
}

interface PlanSelectModalProps {
  visible: boolean;
  onClose: () => void;
  plans: Plan[];
  selectedPlan: Plan | null;
  onSelectPlan: (plan: Plan) => void;
  onAddTrip?: () => void;
  onEditPlan?: (plan: Plan) => void;
  onDeletePlan?: (plan: Plan) => void;
}

export default function PlanSelectModal({
  visible,
  onClose,
  plans = [],
  selectedPlan,
  onSelectPlan,
  onAddTrip,
  onEditPlan,
  onDeletePlan,
}: PlanSelectModalProps) {

  const handleAddTripPress = () => {
    if (onAddTrip) {
      onClose();
      onAddTrip();
      return;
    }
    Alert.alert('새 여행 추가', '새로운 여행 만들기 기능이 곧 제공될 예정입니다.');
  };

  const handleSelectPlan = (plan: Plan) => {
    onSelectPlan(plan);
    onClose();
  };

  const handleEditPlan = (plan: Plan, e: any) => {
    e?.stopPropagation?.();
    onEditPlan?.(plan);
  };

  const handleDeletePlan = (plan: Plan, e: any) => {
    e?.stopPropagation?.();
    Alert.alert(
      '여행 삭제',
      `"${plan.title}" 여행을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDeletePlan?.(plan),
        },
      ]
    );
  };

  const validPlans = Array.isArray(plans) ? plans : [];

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.5}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>여행 선택</Text>
        <Pressable style={styles.addTripButton} onPress={handleAddTripPress} hitSlop={8}>
          <AddPlanIcon width={16} height={16} color={colors.primary} />
          <Text style={styles.addTripButtonText}>새 여행</Text>
        </Pressable>
      </View>

      {/* 여행 목록 */}
      <GestureDetector gesture={Gesture.Native()}>
        <ScrollView
          style={styles.planList}
          contentContainerStyle={styles.planListContent}
          showsVerticalScrollIndicator={false}
        >
          {validPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>여행 계획이 없습니다</Text>
            </View>
          ) : (
            validPlans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  style={styles.planCard}
                  onPress={() => handleSelectPlan(plan)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {/* 체크 - 왼쪽 */}
                  <View style={[styles.planCardCheckWrap, isSelected && styles.planCardCheckWrapSelected]}>
                    {isSelected ? (
                      <CheckedIcon width={20} height={20} color={colors.primary} />
                    ) : (
                      <UnCheckedIcon width={20} height={20} color={colors.gray500} />
                    )}
                  </View>
                  {/* 여행 정보 - 가운데 */}
                  <View style={styles.planCardCenter}>
                    <View style={styles.planCardTextWrap}>
                      <Text style={styles.planCardTitle} numberOfLines={1}>
                        {plan.title}
                      </Text>
                      <Text style={styles.planCardDate} numberOfLines={1}>
                        {formatPlanDateRange(plan.startDate, plan.endDate)}
                      </Text>
                    </View>
                  </View>
                  {/* 수정/삭제 - 오른쪽 */}
                  <View style={styles.planCardActions}>
                    <Pressable
                      style={styles.planCardActionButton}
                      onPress={(e) => handleEditPlan(plan, e)}
                      hitSlop={8}
                    >
                      <UpdateIcon width={20} height={20} color={colors.gray600} />
                    </Pressable>
                    <Pressable
                      style={styles.planCardActionButton}
                      onPress={(e) => handleDeletePlan(plan, e)}
                      hitSlop={8}
                    >
                      <DeleteIcon width={20} height={20} color={colors.gray600} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </GestureDetector>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  addTripButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTripButtonText: {
    ...textStyles.h6,
    color: colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  planList: {
    flex: 1,
    minHeight: 200,
  },
  planListContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexGrow: 1,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray200,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  planCardCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  planCardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  planCardTitle: {
    ...textStyles.h5,
    color: colors.black,
    fontWeight: '600',
  },
  planCardDate: {
    ...textStyles.body4,
    color: colors.gray600,
    marginTop: 4,
  },
  planCardCheckWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardCheckWrapSelected: {
    // 선택 시 아이콘 색상만 primary로 표시
  },
  planCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planCardActionButton: {
    // padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...textStyles.body2,
    color: colors.gray500,
  },
});
