import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Itinerary } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { formatTime } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '@/services/expenses';
import TimeIcon from '../../../../assets/week_bar_time.svg';
import LocationIcon from '../../../../assets/mobile_location.svg';
import ExpenseIcon from '../../../../assets/mobile_expense.svg';
import MemoIcon from '../../../../assets/memo.svg';
import UpdateIcon from '../../../../assets/update.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';
import CloseIcon from '../../../../assets/mobile_close.svg';
import MapIcon from '../../../../assets/mobile_map.svg';

interface ItineraryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
}

export default function ItineraryDetailModal({
  visible,
  onClose,
  itinerary,
  onEdit,
  onDelete,
}: ItineraryDetailModalProps) {
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    if (visible && itinerary?.id) {
      setLoadingExpenses(true);
      expensesApi.getExpensesByItinerary(itinerary.id)
        .then((expenses) => {
          const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
          setExpenseAmount(total);
        })
        .catch(() => {
          setExpenseAmount(0);
        })
        .finally(() => {
          setLoadingExpenses(false);
        });
    } else {
      setExpenseAmount(0);
    }
  }, [visible, itinerary?.id]);

  if (!itinerary) return null;

  const handleOpenMap = () => {
    if (!itinerary.location) {
      Alert.alert('알림', '장소 정보가 없습니다.');
      return;
    }

    const encodedLocation = encodeURIComponent(itinerary.location);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('오류', '지도 앱을 열 수 없습니다.');
      });
    } else {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      Linking.openURL(googleMapsUrl).catch(() => {
        Alert.alert('오류', '지도 앱을 열 수 없습니다.');
      });
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(itinerary);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '일정 삭제',
      '이 일정을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(itinerary);
            }
            onClose();
          },
        },
      ]
    );
  };

  const startTime = itinerary.startTime ? formatTime(itinerary.startTime) : '00:00';
  const endTime = itinerary.endTime ? formatTime(itinerary.endTime) : '00:00';
  const timeRange = `${startTime} ~ ${endTime}`;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.6}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {itinerary.title || '활동'}
          </Text>
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable
                style={styles.actionButton}
                onPress={handleEdit}
                hitSlop={8}
              >
                  <UpdateIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                style={styles.actionButton}
                onPress={handleDelete}
                hitSlop={8}
              >
                <DeleteIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
            )}
            <Pressable
              style={styles.actionButton}
              onPress={onClose}
              hitSlop={8}
            >
              <CloseIcon width={20} height={20} color={colors.gray600} />
            </Pressable>
          </View>
        </View>

        {/* 상세 정보 */}
        <View style={styles.details}>
          {/* 시간 */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <TimeIcon width={20} height={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>시간</Text>
              <Text style={styles.detailValue}>{timeRange}</Text>
            </View>
          </View>

          {/* 장소 */}
          {itinerary.location && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <LocationIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>장소</Text>
                <Text style={styles.detailValue}>{itinerary.location}</Text>
              </View>
            </View>
          )}

          {/* 비용 */}
          {expenseAmount > 0 && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <ExpenseIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>비용</Text>
                <Text style={styles.detailValue}>
                  {expenseAmount.toLocaleString('ko-KR')}원
                </Text>
              </View>
            </View>
          )}

          {/* 설명 */}
          {itinerary.description && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <MemoIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>설명</Text>
                <Text style={styles.detailValue}>{itinerary.description}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 지도 앱에서 길찾기 버튼 */}
      {itinerary.location && (
        <View style={styles.footer}>
          <Pressable
            style={styles.mapButton}
            onPress={handleOpenMap}
          >
            <MapIcon width={20} height={20}/>
            <Text style={styles.mapButtonText}>지도 앱에서 길찾기</Text>
          </Pressable>
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    ...textStyles.h4,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 16,
  },
  details: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 2,
  },
  detailValue: {
    ...textStyles.h6,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 16,
  },
  mapButton: {
    backgroundColor: colors.black,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
