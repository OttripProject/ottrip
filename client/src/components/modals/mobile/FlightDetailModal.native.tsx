import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import type { Attachment, FlightRead, FlightSegmentReadDto } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { convertUTCToLocalTime } from "@/utils/dateUtils";
import dayjs from "dayjs";
import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FlightIcon from "../../../../assets/airplane.svg";
import DeleteIcon from "../../../../assets/delete_gray.svg";
import PNRIcon from "../../../../assets/memo.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ExpenseIcon from "../../../../assets/mobile_expense.svg";
import UpdateIcon from "../../../../assets/update.svg";

interface FlightDetailModalProps {
  visible: boolean;
  onClose: () => void;
  flight: FlightRead | null;
  segment?: FlightSegmentReadDto | null;
  onEdit?: (flight: FlightRead) => void;
  onDelete?: (flight: FlightRead) => void;
  attachments?: Attachment[];
}

export default function FlightDetailModal({
  visible,
  onClose,
  flight,
  segment: _segment,
  onEdit,
  onDelete,
  attachments = [],
}: FlightDetailModalProps) {
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const flightAttachments = useMemo(
    () =>
      flight
        ? attachments.filter(
            a => a.entityType === "flight" && a.entityId === flight.id,
          )
        : [],
    [attachments, flight],
  );

  useEffect(() => {
    if (!visible) {
      setShowAdditionalInfo(false);
      setPreviewVisible(false);
    }
  }, [visible]);

  if (!flight) return null;

  const segments = [...(flight.flightSegments || [])].sort(
    (a, b) => a.order - b.order,
  );
  const expenseAmount = flight.expense?.amount ?? 0;
  const expenseCurrency = (flight.expense?.currency ??
    ExpenseCurrency.KRW) as ExpenseCurrency;
  const hasAdditionalInfo = !!(flight.ticketNumber || flight.bookingReference);

  const formatSegmentDate = (dateTime: string) => {
    return dayjs(dateTime).format("MM/DD");
  };

  const formatLayover = (prevArrival: string, nextDeparture: string) => {
    const prev = dayjs(prevArrival);
    const next = dayjs(nextDeparture);
    const minutes = next.diff(prev, "minute");
    if (minutes <= 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `경유시간 :  ${hours}시간 ${mins}분`;
    if (hours > 0) return `경유시간 :  ${hours}시간`;
    return `경유 ${mins}분`;
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(flight);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert("항공 편 삭제", "이 항공 편을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          if (onDelete) onDelete(flight);
          onClose();
        },
      },
    ]);
  };

  const handleViewTicket = () => {
    const images = flightAttachments.filter(a =>
      a.contentType.startsWith("image/"),
    );
    if (images.length > 0) {
      setPreviewImages(images.map(a => ({ attachment: a })));
      setPreviewInitialIndex(0);
      setPreviewVisible(true);
    } else if (flightAttachments.length > 0) {
      Linking.openURL(flightAttachments[0].fileUrl);
    }
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
            항공권 정보
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

          {/* 예약번호 */}
          {flight.reservationNumber && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <PNRIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>예약번호 (PNR)</Text>
                <Text style={styles.detailValue}>
                  {flight.reservationNumber}
                </Text>
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
                  {Number(expenseAmount).toLocaleString("ko-KR", {
                    maximumFractionDigits: 0,
                  })}
                  {currencyLabels[expenseCurrency]}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 항공 정보 섹션 - 모든 구간 나열 */}
        {segments.map((seg, index) => {
          const routeText = `${seg.departureAirport} → ${seg.arrivalAirport}`;
          const depTime = convertUTCToLocalTime(seg.departureTime);
          const arrTime = convertUTCToLocalTime(seg.arrivalTime);
          const depDate = formatSegmentDate(seg.departureTime);
          const arrDate = formatSegmentDate(seg.arrivalTime);
          const timeRange =
            depDate === arrDate
              ? `${depDate} ${depTime} - ${arrTime}`
              : `${depDate} ${depTime} - ${arrDate} ${arrTime}`;
          const flightNumber = seg.flightNumber ?? null;
          const layover =
            index > 0
              ? formatLayover(
                  segments[index - 1].arrivalTime,
                  seg.departureTime,
                )
              : null;

          return (
            <React.Fragment key={seg.id ?? index}>
              {layover && (
                <View style={styles.layoverRow}>
                  <Text style={styles.layoverText}>{layover}</Text>
                </View>
              )}
              <View style={styles.flightSection}>
                <View style={styles.flightSectionHeader}>
                  <FlightIcon width={20} height={20} color={colors.primary} />
                  <Text style={styles.flightSectionTitle}>
                    구간 {seg.order}
                  </Text>
                </View>
                <View style={styles.routeRow}>
                  <Text style={styles.routeText}>{routeText}</Text>
                </View>
                {flightNumber ? (
                  <Text style={styles.airlineText}>{flightNumber}</Text>
                ) : null}
                <Text style={styles.segmentTime}>{timeRange}</Text>
              </View>
            </React.Fragment>
          );
        })}

        {/* 추가 정보 - 구간 아래 */}
        {hasAdditionalInfo && (
          <>
            <Pressable
              style={[
                styles.additionalInfoToggle,
                showAdditionalInfo && styles.additionalInfoToggleOpen,
              ]}
              onPress={() => setShowAdditionalInfo(v => !v)}
            >
              <Text style={styles.additionalInfoToggleText}>
                {showAdditionalInfo ? "추가정보 닫기" : "추가정보 보기"}
              </Text>
            </Pressable>
            {showAdditionalInfo && (
              <View style={styles.additionalInfo}>
                {flight.ticketNumber && (
                  <View style={styles.additionalInfoRow}>
                    <Text style={styles.additionalInfoLabel}>항공권번호</Text>
                    <Text style={styles.additionalInfoValue}>
                      {flight.ticketNumber}
                    </Text>
                  </View>
                )}
                {flight.bookingReference && (
                  <View style={styles.additionalInfoRow}>
                    <Text style={styles.additionalInfoLabel}>
                      여행사 예약번호
                    </Text>
                    <Text style={styles.additionalInfoValue}>
                      {flight.bookingReference}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {flightAttachments.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.ticketButton} onPress={handleViewTicket}>
            <FlightIcon width={20} height={20} color={colors.white} />
            <Text style={styles.ticketButtonText}>항공권 보기</Text>
          </Pressable>
        </View>
      )}

      <ImagePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        images={previewImages}
        initialIndex={previewInitialIndex}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    ...textStyles.h4,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButton: {
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray200,
    borderRadius: 16,
  },
  layoverRow: {
    paddingHorizontal: 4,
    alignItems: "center",
  },
  layoverText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  flightSection: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
  },
  flightSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  segmentTime: {
    ...textStyles.body5,
    color: colors.gray600,
    marginBottom: 4,
  },
  airlineText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  details: {
    gap: 20,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: "center",
  },
  detailLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 2,
  },
  detailValue: {
    ...textStyles.h6,
  },
  additionalInfoToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
    marginTop: 16,
  },
  additionalInfoToggleOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  additionalInfoToggleText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  additionalInfo: {
    backgroundColor: colors.gray200,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  additionalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  additionalInfoLabel: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  additionalInfoValue: {
    ...textStyles.h6,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  ticketButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ticketButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
