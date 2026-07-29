import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import type { Attachment, Expense, Itinerary } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import { formatTime } from "@/utils/dateUtils";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DeleteIcon from "../../../../assets/delete_gray.svg";
import MemoIcon from "../../../../assets/memo.svg";
import AttachmentDocumentIcon from "../../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../../assets/mobile_attachment_image.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ExpenseIcon from "../../../../assets/mobile_expense.svg";
import LocationIcon from "../../../../assets/mobile_location.svg";
import MapIcon from "../../../../assets/mobile_map.svg";
import UpdateIcon from "../../../../assets/update.svg";
import TimeIcon from "../../../../assets/week_bar_time.svg";

interface ItineraryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
  planExpenses?: Expense[];
  attachments?: Attachment[];
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
}

export default function ItineraryDetailModal({
  visible,
  onClose,
  itinerary,
  planExpenses = [],
  attachments = [],
  onEdit,
  onDelete,
}: ItineraryDetailModalProps) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const expenseByCurrency = useMemo(() => {
    if (!itinerary) return {} as Record<ExpenseCurrency, number>;
    const list =
      itinerary.expenses && itinerary.expenses.length > 0
        ? itinerary.expenses
        : (planExpenses ?? []).filter(e => e.itineraryId === itinerary.id);
    const result = {} as Record<ExpenseCurrency, number>;
    for (const e of list) {
      const cur = (e.currency ?? ExpenseCurrency.KRW) as ExpenseCurrency;
      result[cur] = (result[cur] ?? 0) + (Number(e.amount) || 0);
    }
    return result;
  }, [itinerary, planExpenses]);

  const itineraryAttachments = useMemo(
    () =>
      itinerary
        ? attachments.filter(
            a => a.entityType === "itinerary" && a.entityId === itinerary.id,
          )
        : [],
    [attachments, itinerary],
  );

  useEffect(() => {
    if (!visible) setPreviewVisible(false);
  }, [visible]);

  if (!itinerary) return null;

  const handleOpenMap = () => {
    if (!itinerary.location) {
      Alert.alert("알림", "장소 정보가 없습니다.");
      return;
    }

    const encodedLocation = encodeURIComponent(itinerary.location);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("알림", "지도 앱을 열 수 없습니다.");
      });
    } else {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      Linking.openURL(googleMapsUrl).catch(() => {
        Alert.alert("알림", "지도 앱을 열 수 없습니다.");
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
    Alert.alert("일정 삭제", "이 일정을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          if (onDelete) {
            onDelete(itinerary);
          }
          onClose();
        },
      },
    ]);
  };

  const handleAttachmentPress = (index: number) => {
    const attachment = itineraryAttachments[index];
    if (attachment.contentType.startsWith("image/")) {
      const images = itineraryAttachments
        .filter(a => a.contentType.startsWith("image/"))
        .map(a => ({ attachment: a }));
      const imageIndex = itineraryAttachments
        .slice(0, index)
        .filter(a => a.contentType.startsWith("image/")).length;
      setPreviewImages(images);
      setPreviewInitialIndex(imageIndex);
      setPreviewVisible(true);
    } else {
      Linking.openURL(attachment.fileUrl);
    }
  };

  const startTime = itinerary.startTime
    ? formatTime(itinerary.startTime)
    : "00:00";
  const endTime = itinerary.endTime ? formatTime(itinerary.endTime) : "00:00";
  const timeRange = `${startTime} ~ ${endTime}`;

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
            {itinerary.title || "활동"}
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
          {Object.values(expenseByCurrency).some(v => v > 0) && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <ExpenseIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>비용</Text>
                <Text style={styles.detailValue}>
                  {(
                    Object.entries(expenseByCurrency) as [
                      ExpenseCurrency,
                      number,
                    ][]
                  )
                    .filter(([, amt]) => amt > 0)
                    .map(
                      ([cur, amt]) =>
                        `${amt.toLocaleString("ko-KR")}${currencyLabels[cur]}`,
                    )
                    .join(" / ")}
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

        {/* 첨부파일 섹션 */}
        {itineraryAttachments.length > 0 && (
          <View style={styles.attachmentSection}>
            <View style={styles.attachmentDivider} />
            <Text style={styles.attachmentHeader}>
              첨부파일 ({itineraryAttachments.length})
            </Text>
            {itineraryAttachments.map((attachment, index) => {
              const isImage = attachment.contentType.startsWith("image/");
              return (
                <Pressable
                  key={attachment.id}
                  style={styles.attachmentItem}
                  onPress={() => handleAttachmentPress(index)}
                >
                  <View style={styles.attachmentIconWrapper}>
                    {isImage ? (
                      <AttachmentImageIcon
                        width={20}
                        height={20}
                        color={colors.primary}
                      />
                    ) : (
                      <AttachmentDocumentIcon
                        width={20}
                        height={20}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.fileName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 지도 앱에서 길찾기 버튼 */}
      {itinerary.location && (
        <View style={styles.footer}>
          <Pressable style={styles.mapButton} onPress={handleOpenMap}>
            <MapIcon width={20} height={20} />
            <Text style={styles.mapButtonText}>지도 앱에서 길찾기</Text>
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
  details: {
    gap: 20,
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
  attachmentSection: {
    marginTop: 24,
  },
  attachmentDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginBottom: 16,
  },
  attachmentHeader: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 10,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    marginBottom: 6,
  },
  attachmentIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  attachmentName: {
    ...textStyles.body4,
    color: colors.gray800,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  mapButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
