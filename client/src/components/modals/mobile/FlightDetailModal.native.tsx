import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { FlightRead, FlightSegmentReadDto } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { convertUTCToLocalTime } from '@/utils/dateUtils';
import FlightIcon from '../../../../assets/airplane.svg';
import TimeIcon from '../../../../assets/week_bar_time.svg';
import ExpenseIcon from '../../../../assets/mobile_expense.svg';
import UpdateIcon from '../../../../assets/update.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';
import CloseIcon from '../../../../assets/mobile_close.svg';

interface FlightDetailModalProps {
  visible: boolean;
  onClose: () => void;
  flight: FlightRead | null;
  segment?: FlightSegmentReadDto | null;
  onEdit?: (flight: FlightRead) => void;
  onDelete?: (flight: FlightRead) => void;
}

export default function FlightDetailModal({
  visible,
  onClose,
  flight,
  segment: segmentProp,
  onEdit,
  onDelete,
}: FlightDetailModalProps) {
  if (!flight) return null;

  const segments = flight.flightSegments || [];
  const segment = segmentProp ?? segments[0];
  if (!segment) return null;

  const routeText = `${segment.departureAirport} → ${segment.arrivalAirport}`;
  const departureTime = convertUTCToLocalTime(segment.departureTime);
  const arrivalTime = convertUTCToLocalTime(segment.arrivalTime);
  const timeRange = `${departureTime} ~ ${arrivalTime}`;
  const airlineInfo = [segment.airline, segment.flightNumber].filter(Boolean).join(' ');
  const expenseAmount = flight.expense?.amount ?? 0;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(flight);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '항공 편 삭제',
      '이 항공 편을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete(flight);
            onClose();
          },
        },
      ]
    );
  };

  const handleViewTicket = () => {
    // TODO: 항공권 보기 기능 구현
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.6}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            항공권 정보
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

        {/* 상세 정보 */}
        <View style={styles.details}>

          {/* 탑승자 */}
          {flight.passengerName && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <FlightIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>탑승자</Text>
                <Text style={styles.detailValue}>{flight.passengerName}</Text>
              </View>
            </View>
          )}

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

          {/* 예약번호 */}
          {flight.reservationNumber && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <FlightIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>예약번호</Text>
                <Text style={styles.detailValue}>{flight.reservationNumber}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 항공 정보 섹션 */}
        <View style={styles.flightSection}>
          <View style={styles.flightSectionHeader}>
            <FlightIcon width={20} height={20} color={colors.primary} />
            <Text style={styles.flightSectionTitle}>구간 1</Text>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>{routeText}</Text>
          </View>
          {airlineInfo && (
            <Text style={styles.airlineText}>{airlineInfo}</Text>
          )}
        </View>

        
      </ScrollView>

      {/* 항공권 보기 버튼 */}
      <View style={styles.footer}>
        <Pressable style={styles.ticketButton} onPress={handleViewTicket}>
          <FlightIcon width={20} height={20} color={colors.white} />
          <Text style={styles.ticketButtonText}>항공권 보기</Text>
        </Pressable>
      </View>
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
    gap: 6,
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
  flightSection: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: 16,
  },
  flightSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  flightSectionTitle: {
    ...textStyles.h6,
    color: colors.primary,
  },
  routeRow: {
    marginBottom: 4,
  },
  routeText: {
    ...textStyles.h5,
  },
  airlineText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  details: {
    gap: 20,
    marginBottom: 24,
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
    paddingTop: 8,
    paddingBottom: 32,
  },
  ticketButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ticketButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
