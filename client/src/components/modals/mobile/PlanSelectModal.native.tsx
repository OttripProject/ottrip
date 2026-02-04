import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, Dimensions, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { Plan } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CheckedIcon from '../../../../assets/mobile_plan_checked.svg';
import UnCheckedIcon from '../../../../assets/mobile_plan_unchecked.svg';
import AddPlanIcon from '../../../../assets/mobile_plan_add.svg';

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
}

const DRAG_THRESHOLD = 80;
const MAX_UPWARD_DRAG = 50; // 위로 드래그 최대 거리 제한 (더 엄격하게)
const MODAL_HEIGHT = Dimensions.get('window').height * 0.5; // 화면의 60% 높이

export default function PlanSelectModal({
  visible,
  onClose,
  plans = [],
  selectedPlan,
  onSelectPlan,
  onAddTrip,
}: PlanSelectModalProps) {
  const slidePosition = useSharedValue(MODAL_HEIGHT); // 닫힌 상태
  const dragOffset = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragOffset.value = 0;
      // 더 부드러운 애니메이션 (damping 증가, stiffness 감소)
      slidePosition.value = withSpring(0, { 
        damping: 30, 
        stiffness: 80,
        mass: 0.8,
      });
    } else {
      slidePosition.value = withTiming(MODAL_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // 위(음수)/아래(양수) 모두 드래그, 위로는 최대 MAX_UPWARD_DRAG까지 제한
      // 아래로는 제한 없음 (닫기 위해)
      const clamped = Math.max(-MAX_UPWARD_DRAG, e.translationY);
      dragOffset.value = clamped;
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_THRESHOLD || e.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        dragOffset.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // 위로 드래그 제한: 모달이 기본 위치(slidePosition.value = 0)보다 위로 올라가지 않도록
    // translateY가 0 이하로 가지 않도록 제한 (0 = 완전히 올라온 상태)
    const totalTranslateY = slidePosition.value + dragOffset.value;
    // 모달이 기본 위치보다 위로 올라가지 않도록 제한 (0 이상으로 유지)
    const clampedTranslateY = Math.max(0, totalTranslateY);
    
    return {
      transform: [{ translateY: clampedTranslateY }],
    };
  });

  const handleBackdropPress = () => {
    // 모달을 아래로 내려가는 애니메이션
    dragOffset.value = 0;
    slidePosition.value = withTiming(
      MODAL_HEIGHT,
      { duration: 250 },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      }
    );
  };

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

  const validPlans = Array.isArray(plans) ? plans : [];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 배경 오버레이 - 고정 */}
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        {/* 모달 컨텐츠 - 아래에서 올라옴, 드래그 가능 */}
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* 드래그 핸들 바 - Gesture.Pan()으로 위/아래 드래그 */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>
            </GestureDetector>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>여행 선택</Text>
              <Pressable style={styles.addTripButton} onPress={handleAddTripPress} hitSlop={8}>
                <AddPlanIcon width={16} height={16} color={colors.primary} />
                <Text style={styles.addTripButtonText}>새 여행</Text>
              </Pressable>
            </View>

            {/* 여행 목록 - Gesture.Native()로 네이티브 스크롤 동작 */}
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
                        <View style={styles.planCardLeft}>
                          <View style={styles.planCardTextWrap}>
                            <Text style={styles.planCardTitle} numberOfLines={1}>
                              {plan.title}
                            </Text>
                            <Text style={styles.planCardDate} numberOfLines={1}>
                              {formatPlanDateRange(plan.startDate, plan.endDate)}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.planCardCheckWrap, isSelected && styles.planCardCheckWrapSelected]}>
                          {isSelected ? (
                            <CheckedIcon width={20} height={20} color={colors.primary} />
                          ) : (
                            <UnCheckedIcon width={20} height={20} color={colors.gray500} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </GestureDetector>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: MODAL_HEIGHT,
    maxHeight: MODAL_HEIGHT, // 최대 높이 제한
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
    maxHeight: MODAL_HEIGHT,
  },
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
  },
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
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
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
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardCheckWrapSelected: {
    // 선택 시 아이콘 색상만 primary로 표시
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
