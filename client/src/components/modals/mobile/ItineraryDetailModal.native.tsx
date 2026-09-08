import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import TourismDetailModal from "@/components/modals/TourismDetailModal";
import type { Attachment, Expense, Itinerary } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import MiniMapView from "@/ui/components/MiniMapView";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatTime } from "@/utils/dateUtils";
import { formatWalkTime } from "@/utils/distanceUtils";
import { useEffect, useMemo, useState } from "react";
import type { NearbyAttraction } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
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

const NEARBY_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  여행코스: { color: "rgb(62, 91, 217)", bg: "rgb(236, 239, 254)" },
  쇼핑: { color: "rgb(31, 157, 87)", bg: "rgb(231, 247, 236)" },
  레포츠: { color: "rgb(55, 55, 55)", bg: "rgb(244, 244, 244)" },
  "축제·공연": { color: "rgb(14, 138, 138)", bg: "rgb(227, 246, 246)" },
  문화시설: { color: "rgb(10, 132, 255)", bg: "rgb(239, 244, 255)" },
  음식점: { color: "rgb(183, 104, 0)", bg: "rgb(255, 244, 224)" },
  관광지: { color: "rgb(217, 28, 181)", bg: "rgb(255, 235, 251)" },
};
const DEFAULT_NEARBY_BADGE = { color: "#6C6C6C", bg: "#F5F5F5" };

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
  const [nearbyAttractions, setNearbyAttractions] = useState<NearbyAttraction[]>([]);
  const [selectedAttraction, setSelectedAttraction] = useState<NearbyAttraction | null>(null);
  const [tourismDetailVisible, setTourismDetailVisible] = useState(false);

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
    if (!visible) {
      setPreviewVisible(false);
      setNearbyAttractions([]);
      setTourismDetailVisible(false);
      return;
    }
    if (!itinerary?.id || !itinerary?.location || itinerary?.country !== "대한민국") return;
    tourismApi.getNearbyAttractions(itinerary.id)
      .then(data => {
        const filtered = data.filter(
          item => item.contentTypeId !== "숙박" && item.contentTypeId !== "숙소",
        );
        setNearbyAttractions(filtered);
      })
      .catch(() => {});
  }, [visible, itinerary?.id, itinerary?.location?.id]);

  if (!itinerary) return null;

  const handleOpenMap = () => {
    if (!itinerary.location?.name) {
      Alert.alert("알림", "장소 정보가 없습니다");
      return;
    }

    const encodedLocation = encodeURIComponent(itinerary.location.name);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("알림", "지도 앱을 열 수 없습니다");
      });
    } else {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      Linking.openURL(googleMapsUrl).catch(() => {
        Alert.alert("알림", "지도 앱을 열 수 없습니다");
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
          {itinerary.location?.name && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <LocationIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>장소</Text>
                <Text style={styles.detailValue}>{itinerary.location.name}</Text>
              </View>
            </View>
          )}
          {itinerary.location?.fromGoogle &&
            !!itinerary.location.latitude &&
            !!itinerary.location.longitude && (
              <MiniMapView
                latitude={itinerary.location.latitude}
                longitude={itinerary.location.longitude}
                name={itinerary.location.name}
              />
            )}

          {/* 주변 추천 */}
          {nearbyAttractions.length > 0 && (
            <View style={styles.nearbySection}>
              <View style={styles.nearbyHeader}>
                <Text style={styles.nearbyTitle}>주변 추천</Text>
                <Text style={styles.nearbyCount}>{nearbyAttractions.length}곳</Text>
              </View>
              {nearbyAttractions.map((item, index) => {
                const badge = NEARBY_BADGE_COLORS[item.contentTypeId] ?? DEFAULT_NEARBY_BADGE;
                const walkTime = item.dist ? formatWalkTime(item.dist) : null;
                const sub = item.dist != null
                  ? [item.address, walkTime].filter(Boolean).join(" · ")
                  : [item.address, item.categorySub].filter(Boolean).join(" · ");
                return (
                  <Pressable
                    key={index}
                    style={styles.nearbyCard}
                    onPress={() => {
                      setSelectedAttraction(item);
                      setTourismDetailVisible(true);
                    }}
                  >
                    <View style={[styles.nearbyBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.nearbyBadgeText, { color: badge.color }]}>
                        {item.contentTypeId}
                      </Text>
                    </View>
                    <View style={styles.nearbyCardContent}>
                      <Text style={styles.nearbyCardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!!sub && (
                        <Text style={styles.nearbyCardSub} numberOfLines={1}>{sub}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
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
      {itinerary.location?.name && (
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
      <TourismDetailModal
        visible={tourismDetailVisible}
        onClose={() => setTourismDetailVisible(false)}
        item={selectedAttraction}
        itineraryLocation={
          itinerary.location?.latitude != null
            ? { latitude: itinerary.location.latitude, longitude: itinerary.location.longitude }
            : null
        }
        itinerary={itinerary}
        onOpenNewItinerary={() => {}}
        onSwitchToAccommodation={() => {}}
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
  nearbySection: {
    marginTop: spacing.sm,
  },
  nearbyHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  nearbyTitle: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  nearbyCount: {
    ...textStyles.body6,
    color: colors.gray400,
  },
  nearbyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.gray100,
    marginBottom: 4,
  },
  nearbyBadge: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  nearbyBadgeText: {
    ...textStyles.h9
  },
  nearbyCardContent: {
    flex: 1,
    gap: 2,
  },
  nearbyCardTitle: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  nearbyCardSub: {
    ...textStyles.body6,
    color: colors.gray600,
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
    ...textStyles.h7,
    color: colors.gray800,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
