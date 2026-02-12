import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Accommodation } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { formatTime } from '@/utils/dateUtils';
import AccommodationIcon from '../../../../assets/mobile_accomodation.svg';
import TimeIcon from '../../../../assets/week_bar_time.svg';
import LocationIcon from '../../../../assets/mobile_location.svg';
import ExpenseIcon from '../../../../assets/mobile_expense.svg';
import MemoIcon from '../../../../assets/memo.svg';
import UpdateIcon from '../../../../assets/update.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';
import CloseIcon from '../../../../assets/mobile_close.svg';
import MapIcon from '../../../../assets/mobile_map.svg';
import dayjs from 'dayjs';

interface AccommodationDetailModalProps {
  visible: boolean;
  onClose: () => void;
  accommodation: Accommodation | null;
  onEdit?: (accommodation: Accommodation) => void;
  onDelete?: (accommodation: Accommodation) => void;
}

export default function AccommodationDetailModal({
  visible,
  onClose,
  accommodation,
  onEdit,
  onDelete,
}: AccommodationDetailModalProps) {
  if (!accommodation) return null;

  const location = accommodation.place || [accommodation.city, accommodation.country].filter(Boolean).join(', ') || undefined;
  const expenseAmount = accommodation.expense?.amount ?? 0;
  const checkinTime = formatTime(accommodation.checkinTime);
  const checkoutTime = formatTime(accommodation.checkoutTime);
  const checkinDate = accommodation.checkinDate ? dayjs(accommodation.checkinDate).format('YYYY-MM-DD') : '';
  const checkoutDate = accommodation.checkoutDate ? dayjs(accommodation.checkoutDate).format('YYYY-MM-DD') : '';
  const timeRange = `${checkinTime} ~ ${checkoutTime}`;

  const handleOpenMap = () => {
    const address = location || accommodation.name;
    if (!address) {
      Alert.alert('알림', '장소 정보가 없습니다.');
      return;
    }

    const encodedLocation = encodeURIComponent(address);
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
      onEdit(accommodation);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '숙소 삭제',
      '이 숙소를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(accommodation);
            }
            onClose();
          },
        },
      ]
    );
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.8}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {accommodation.name || '숙소'}
          </Text>
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable style={styles.actionButton} onPress={handleEdit} hitSlop={8}>
                <UpdateIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable style={styles.actionButton} onPress={handleDelete} hitSlop={8}>
                <DeleteIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
            )}
            <Pressable style={styles.actionButton} onPress={onClose} hitSlop={8}>
              <CloseIcon width={20} height={20} color={colors.gray600} />
            </Pressable>
          </View>
        </View>

        {/* 숙소 정보 섹션 (파란 배경) */}
        <View style={styles.accommodationSection}>
          <View style={styles.accommodationSectionHeader}>
            <AccommodationIcon width={20} height={20} color={colors.primary} />
            <Text style={styles.accommodationSectionTitle}>숙소 정보</Text>
          </View>
          <View style={styles.checkinoutRow}>
            <View style={styles.checkinoutItem}>
              <Text style={styles.checkinoutLabel}>체크인</Text>
              <Text style={styles.checkinoutTime}>{checkinTime}</Text>
              <Text style={styles.checkinoutDate}>{checkinDate}</Text>
            </View>
            <View style={[styles.checkinoutItem, styles.checkinoutItemRight]}>
              <Text style={styles.checkinoutLabel}>체크아웃</Text>
              <Text style={styles.checkinoutTime}>{checkoutTime}</Text>
              <Text style={styles.checkinoutDate}>{checkoutDate}</Text>
            </View>
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
          {location && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <LocationIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>장소</Text>
                <Text style={styles.detailValue}>{location}</Text>
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
                  {Number(expenseAmount).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
                </Text>
              </View>
            </View>
          )}

          {/* 설명 */}
          {accommodation.description && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <MemoIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>설명</Text>
                <Text style={styles.detailValue}>{accommodation.description}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 지도 앱에서 길찾기 버튼 */}
      {(location || accommodation.name) && (
        <View style={styles.footer}>
          <Pressable style={styles.mapButton} onPress={handleOpenMap}>
            <MapIcon width={20} height={20} color={colors.white} />
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
    marginBottom: 20,
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
  accommodationSection: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  accommodationSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  accommodationSectionTitle: {
    ...textStyles.h6,
    color: colors.primary,
  },
  checkinoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkinoutItem: {
    flex: 1,
  },
  checkinoutItemRight: {
    alignItems: 'flex-end',
  },
  checkinoutLabel: {
    ...textStyles.h8,
    color: colors.gray600,
    marginBottom: 4,
  },
  checkinoutTime: {
    ...textStyles.h5,
  },
  checkinoutDate: {
    ...textStyles.body5,
    color: colors.gray600,
    marginTop: 2,
  },
  details: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    paddingBottom: 16,
  },
  mapButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
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
