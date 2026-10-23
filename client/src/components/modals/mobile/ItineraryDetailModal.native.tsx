import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import type { Attachment, Expense, Itinerary } from "@/types/api";
import { getTourismCategoryColor } from "@/types/tourism";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import MiniMapView from "@/ui/components/MiniMapView";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatDuration, formatTime } from "@/utils/dateUtils";
import { formatWalkTime } from "@/utils/distanceUtils";
import dayjs from "dayjs";
import type { NearbyAttraction } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import ExternalLinkIcon from "../../../../assets/external_link.svg";
import MemoIcon from "../../../../assets/memo.svg";
import AttachmentDocumentIcon from "../../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../../assets/mobile_attachment_image.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ExpenseIcon from "../../../../assets/mobile_expense.svg";
import LocationIcon from "../../../../assets/mobile_location.svg";
import UpdateIcon from "../../../../assets/update.svg";
import TimeIcon from "../../../../assets/mobile_time.svg";

const MEMO_MAX_LINES = 3;

interface ItineraryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
  planExpenses?: Expense[];
  attachments?: Attachment[];
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
  onAttractionSelect?: (attraction: NearbyAttraction) => void;
  planStartDate?: string;
}

export default function ItineraryDetailModal({
  visible,
  onClose,
  itinerary,
  planExpenses = [],
  attachments = [],
  onEdit,
  onDelete,
  onAttractionSelect,
  planStartDate,
}: ItineraryDetailModalProps) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [nearbyAttractions, setNearbyAttractions] = useState<
    NearbyAttraction[]
  >([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descLineCount, setDescLineCount] = useState(0);

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
      setNearbyLoading(false);
      setDescExpanded(false);
      return;
    }
    if (!itinerary?.id || !itinerary?.location || itinerary?.country !== "대한민국") return;
    setNearbyLoading(true);
    tourismApi.getNearbyAttractions(itinerary.id)
      .then(data => {
        const filtered = data.filter(
          item => item.contentTypeId !== "숙박" && item.contentTypeId !== "숙소",
        );
        setNearbyAttractions(filtered);
      })
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
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
  const duration = formatDuration(startTime, endTime);
  const dayNumber = planStartDate
    ? dayjs(itinerary.itineraryDate).diff(dayjs(planStartDate), "day") + 1
    : null;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.68}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {!!dayNumber && <Text style={styles.day}>DAY {dayNumber}</Text>}
          <Text style={styles.title} numberOfLines={1}>
            {itinerary.title || "활동"}
          </Text>
          {itinerary.location?.name && (
            <View style={styles.place}>
              <LocationIcon width={13} height={13} color={colors.gray600} />
              <Text style={styles.placeText} numberOfLines={1}>
                {itinerary.location.name}
              </Text>
              <ScalePressable onPress={handleOpenMap} hitSlop={8}>
                <ExternalLinkIcon
                  width={14}
                  height={14}
                  color={colors.paletteFg3}
                />
              </ScalePressable>
            </View>
          )}
        </View>
        <ScalePressable style={styles.closeButton} onPress={onClose}>
          <View style={styles.closeCircle}>
            <CloseIcon width={17} height={17} color={colors.gray700} />
          </View>
        </ScalePressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <TimeIcon width={20} height={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailValue}>{timeRange}</Text>
              {duration && <Text style={styles.detailSub}>{duration}</Text>}
            </View>
          </View>

          {Object.values(expenseByCurrency).some(v => v > 0) && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <ExpenseIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
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

          {itinerary.description && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <MemoIcon width={20} height={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text
                  style={[styles.memo, styles.memoMeasure]}
                  onTextLayout={e =>
                    setDescLineCount(e.nativeEvent.lines.length)
                  }
                >
                  {itinerary.description}
                </Text>
                <Text
                  style={styles.memo}
                  numberOfLines={descExpanded ? undefined : MEMO_MAX_LINES}
                >
                  {itinerary.description}
                </Text>
                {descLineCount > MEMO_MAX_LINES && (
                  <Pressable onPress={() => setDescExpanded(p => !p)}>
                    <Text style={styles.expandBtn}>
                      {descExpanded ? "접기" : "더보기"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {itinerary.location?.hasCoords &&
            !!itinerary.location.latitude &&
            !!itinerary.location.longitude && (
              <MiniMapView
                latitude={itinerary.location.latitude}
                longitude={itinerary.location.longitude}
                name={itinerary.location.name}
              />
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
                <ScalePressable
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
                </ScalePressable>
              );
            })}
          </View>
        )}

        {/* 주변 추천 */}
        {nearbyLoading && (
          <View style={styles.nearbyLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.nearbyLoadingText}>주변 추천 불러오는 중...</Text>
          </View>
        )}
        {!nearbyLoading && nearbyAttractions.length > 0 && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>주변 추천</Text>
              <Text style={styles.nearbyCount}>{nearbyAttractions.length}곳</Text>
            </View>
            {nearbyAttractions.map((item, index) => {
              const badge = getTourismCategoryColor(item.contentTypeId);
              const walkTime = item.dist ? formatWalkTime(item.dist) : null;
              const sub = item.dist != null
                ? [item.address, walkTime].filter(Boolean).join(" · ")
                : [item.address, item.categorySub].filter(Boolean).join(" · ");
              return (
                <ScalePressable
                  key={index}
                  style={styles.nearbyCard}
                  onPress={() => onAttractionSelect?.(item)}
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
                </ScalePressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {(onEdit || onDelete) && (
        <View style={styles.footer}>
          {onEdit && (
            <ScalePressable
              style={[styles.footerButton, styles.editButton]}
              onPress={handleEdit}
            >
              <UpdateIcon width={17} height={17} color={colors.gray800} />
              <Text style={styles.editButtonText}>수정</Text>
            </ScalePressable>
          )}
          {onDelete && (
            <ScalePressable
              style={[styles.footerButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <DeleteIcon width={17} height={17} color={colors.danger} />
              <Text style={styles.deleteButtonText}>삭제</Text>
            </ScalePressable>
          )}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingRight: 18,
    paddingLeft: spacing.xl,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  day: {
    ...textStyles.h8,
    letterSpacing: 1.68,
    color: colors.paletteFg3,
  },
  title: {
    ...textStyles.h3,
    marginTop: spacing.xs,
    color: colors.paletteInk,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  placeText: {
    ...textStyles.h7,
    flexShrink: 1,
    color: colors.paletteFg3,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginTop: -2,
    marginBottom: -6,
    alignItems: "center",
    justifyContent: "center",
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paletteFill,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: 10,
  },
  detailIcon: {
    width: 20,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailValue: {
    ...textStyles.h6,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  detailSub: {
    ...textStyles.body5,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  memo: {
    ...textStyles.body3,
    color: colors.paletteInk,
  },
  memoMeasure: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
  expandBtn: {
    ...textStyles.body5,
    color: colors.primary,
    marginTop: 4,
  },
  nearbyLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg
  },
  nearbyLoadingText: {
    ...textStyles.body5,
    color: colors.gray500,
  },
  nearbySection: {
    marginTop: spacing.xl,
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
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  footerButton: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.mdPlus,
  },
  editButton: {
    backgroundColor: colors.paletteFill,
  },
  deleteButton: {
    backgroundColor: colors.dangerSoft,
  },
  editButtonText: {
    ...textStyles.h6,
    color: colors.gray800,
  },
  deleteButtonText: {
    ...textStyles.h6,
    color: colors.danger,
  },
});
