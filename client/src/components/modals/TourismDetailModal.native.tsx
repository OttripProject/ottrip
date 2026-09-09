import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import MiniMapView from "@/ui/components/MiniMapView";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { locationsApi } from "@/services/locations";
import { ItineraryCategory } from "@/types/itinerary";
import { formatWalkTime, haversineDistance } from "@/utils/distanceUtils";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NearbyAttraction, TourismDetail } from "@/services/tourism";
import CloseIcon from "../../../assets/mobile_close.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import HourglassIcon from "../../../assets/hourglass.svg";
import WonIcon from "../../../assets/won.svg";
import RouteIcon from "../../../assets/route.svg";
import RoomIcon from "../../../assets/room.svg";
import CutleryIcon from "../../../assets/cutlery.svg";
import { tourismApi } from "@/services/tourism";

const BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  여행코스: { color: "rgb(62, 91, 217)", bg: "rgb(236, 239, 254)" },
  쇼핑: { color: "rgb(31, 157, 87)", bg: "rgb(231, 247, 236)" },
  레포츠: { color: "rgb(55, 55, 55)", bg: "rgb(244, 244, 244)" },
  "축제·공연": { color: "rgb(14, 138, 138)", bg: "rgb(227, 246, 246)" },
  문화시설: { color: "rgb(10, 132, 255)", bg: "rgb(239, 244, 255)" },
  음식점: { color: "rgb(183, 104, 0)", bg: "rgb(255, 244, 224)" },
  관광지: { color: "rgb(217, 28, 181)", bg: "rgb(255, 235, 251)" },
};
const DEFAULT_BADGE = { color: "#6C6C6C", bg: "#F5F5F5" };

type Row = { label: string; value: string };
type IconType = "clock" | "calendar" | "hourglass" | "won" | "route" | "checkinout" | "room" | "cutlery";
type IconRow = { label: string; value: string; icon: IconType };

function getCategoryRows(detail: TourismDetail): { iconRows: IconRow[]; tableRows: Row[]; usageRows: Row[] } {
  const t = detail.contentTypeId;
  const is = (...ids: string[]) => ids.some(id => t === id);
  const r = (label: string, v: string | null | undefined): Row | null => v ? { label, value: v } : null;
  const ir = (label: string, v: string | null | undefined, icon: IconType): IconRow | null => v ? { label, value: v, icon } : null;
  const rows = (...items: (Row | null)[]) => items.filter(Boolean) as Row[];
  const irows = (...items: (IconRow | null)[]) => items.filter(Boolean) as IconRow[];

  if (is("12", "관광지")) return {
    iconRows: irows(ir("이용시간", detail.usetime, "clock"), ir("휴관일", detail.restdate, "calendar")),
    tableRows: rows(r("주차", detail.parking)),
    usageRows: [],
  };
  if (is("14", "문화시설")) return {
    iconRows: irows(ir("이용시간", detail.usetimeculture, "clock"), ir("휴관일", detail.restdateculture, "calendar"), ir("관람소요시간", detail.spendtime, "hourglass"), ir("이용요금", detail.usefee, "won")),
    tableRows: rows(r("주차", detail.parkingculture)),
    usageRows: [],
  };
  if (is("15", "축제·공연")) return {
    iconRows: irows(ir("행사기간", detail.eventdate, "calendar"), ir("공연시간", detail.playtime, "clock"), ir("이용요금", detail.usetimefestival, "won")),
    tableRows: rows(r("행사장소", detail.eventplace), r("관람연령", detail.agelimit)),
    usageRows: rows(r("예매처", detail.bookingplace)),
  };
  if (is("25", "여행코스")) return {
    iconRows: irows(ir("총거리", detail.distance, "route"), ir("소요시간", detail.taketime, "hourglass")),
    tableRows: rows(r("코스", detail.schedule)),
    usageRows: rows(r("문의", detail.infocentertourcourse || detail.tel)),
  };
  if (is("28", "레포츠")) return {
    iconRows: irows(ir("이용시간", detail.usetimeleports, "clock"), ir("휴관일", detail.restdateleports, "calendar"), ir("입장료", detail.usefeeleports, "won")),
    tableRows: rows(r("주차", detail.parkingleports)),
    usageRows: rows(r("예약안내", detail.reservation)),
  };
  if (is("38", "쇼핑")) return {
    iconRows: irows(ir("영업시간", detail.opentime, "clock"), ir("휴무일", detail.restdateshopping, "calendar")),
    tableRows: rows(r("주차", detail.parkingshopping)),
    usageRows: [],
  };
  if (is("39", "음식점")) return {
    iconRows: irows(ir("영업시간", detail.opentimefood, "clock"), ir("휴무일", detail.restdatefood, "calendar"), ir("대표메뉴", detail.firstmenu, "cutlery")),
    tableRows: rows(r("주차", detail.parkingfood)),
    usageRows: rows(r("포장", detail.packing), r("예약안내", detail.reservationfood)),
  };
  return { iconRows: [], tableRows: [], usageRows: [] };
}

function IconRowIcon({ icon }: { icon: IconType }) {
  const props = { width: 20, height: 20, color: colors.primary };
  switch (icon) {
    case "clock": return <TimeIcon {...props} />;
    case "calendar": return <CalendarIcon {...props} />;
    case "hourglass": return <HourglassIcon {...props} />;
    case "won": return <WonIcon {...props} />;
    case "route": return <RouteIcon {...props} />;
    case "room": return <RoomIcon {...props} />;
    case "cutlery": return <CutleryIcon {...props} />;
    default: return <TimeIcon {...props} />;
  }
}

function mapContentTypeToCategory(contentTypeId: string | null): ItineraryCategory {
  switch (contentTypeId) {
    case "39": case "음식점": return ItineraryCategory.MEAL;
    case "38": case "쇼핑": return ItineraryCategory.SHOPPING;
    default: return ItineraryCategory.ACTIVITY;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  item: NearbyAttraction | null;
  itineraryLocation: { latitude: number; longitude: number } | null;
  itinerary: any;
  onOpenNewItinerary: (draft: any) => void;
  onSwitchToAccommodation?: (draft: any) => void;
}

export default function TourismDetailModal({
  visible,
  onClose,
  item,
  itineraryLocation,
  itinerary,
  onOpenNewItinerary,
}: Props) {
  const [detail, setDetail] = useState<TourismDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  useEffect(() => {
    if (!visible || !item) {
      setDetail(null);
      setOverviewExpanded(false);
      return;
    }
    setLoading(true);
    const isRealContentId = /^\d+$/.test(item.contentId);
    const fetchDetail = isRealContentId
      ? tourismApi.getTourismDetail({ contentId: item.contentId, contentTypeId: item.contentTypeId, includeImages: false })
      : tourismApi.getTourismDetail({ name: item.title, includeImages: false });

    fetchDetail
      .then(async d => {
        if (isRealContentId && d.title && !d.title.includes(item.title) && !item.title.includes(d.title)) {
          return tourismApi.getTourismDetail({ name: item.title, includeImages: false });
        }
        return d;
      })
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, item?.contentId]);

  const handleAddToItinerary = async () => {
    if (!item) return;
    const raw = itinerary?.end_time ?? itinerary?.endTime ?? "09:00:00";
    const [h, m] = raw.split(":").map(Number);
    const startMins = h * 60 + (m || 0);
    const endMins = Math.min(startMins + 60, 24 * 60);
    const fmt = (n: number) =>
      `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

    let locationId: number | undefined;
    try {
      if (detail?.mapy && detail?.mapx) {
        const nameHash = [...item.title].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0).toString(16);
        const loc = await locationsApi.createLocation({
          name: item.title,
          placeId: `m_${nameHash}_${Math.random().toString(16).slice(2, 10)}`,
          latitude: detail.mapy,
          longitude: detail.mapx,
          address: detail.address ?? undefined,
          fromGoogle: false,
        });
        locationId = loc.id;
      }
    } catch {}

    onOpenNewItinerary({
      title: detail?.title ?? item.title,
      description: detail?.overview ?? undefined,
      location: item.title,
      locationId,
      country: itinerary?.country || undefined,
      city: itinerary?.city || undefined,
      itineraryDate: itinerary?.itinerary_date ?? itinerary?.itineraryDate ?? "",
      startTime: fmt(startMins),
      endTime: fmt(endMins),
      category: mapContentTypeToCategory(detail?.contentTypeId ?? item.contentTypeId),
      locationLat: detail?.mapy,
      locationLng: detail?.mapx,
    });
    onClose();
  };

  if (!item) return null;

  const badge = BADGE_COLORS[item.contentTypeId] ?? DEFAULT_BADGE;
  const hasMap = !!detail?.mapx && !!detail?.mapy;

  const walkTime = (() => {
    if (item.dist) return formatWalkTime(item.dist);
    if (itineraryLocation && detail?.mapy && detail?.mapx) {
      const dist = haversineDistance(itineraryLocation.latitude, itineraryLocation.longitude, detail.mapy, detail.mapx);
      return formatWalkTime(dist);
    }
    return null;
  })();

  const { iconRows, tableRows: categoryRows, usageRows } = detail ? getCategoryRows(detail) : { iconRows: [], tableRows: [], usageRows: [] };
  const tableRows = [
    ...(detail?.address ? [{ label: "주소", value: detail.address }] : []),
    ...categoryRows,
  ];
  const hasUsageInfo = !!(detail?.tel || detail?.infocenter || detail?.infocenterlodging || detail?.homepage || usageRows.length > 0);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.85}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 배지 + 닫기 */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{item.contentTypeId}</Text>
          </View>
          <Pressable style={styles.actionButton} onPress={onClose} hitSlop={8}>
            <CloseIcon width={20} height={20} color={colors.gray600} />
          </Pressable>
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{detail?.title ?? item.title}</Text>
          {(detail?.address || item.address || walkTime) && (
            <Text style={styles.metaText}>
              {[(detail?.address ?? item.address), walkTime].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* 아이콘 행 */}
        {!loading && iconRows.length > 0 && (
          <View style={styles.iconRowContainer}>
            {iconRows.map((row, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconBox}>
                  <IconRowIcon icon={row.icon} />
                </View>
                <View style={styles.iconRowTextCol}>
                  <Text style={styles.iconRowLabel}>{row.label}</Text>
                  <Text style={styles.iconRowValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 소개 */}
        {!loading && detail?.overview && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.overviewText} numberOfLines={overviewExpanded ? undefined : 3}>
              {detail.overview}
            </Text>
            <Pressable onPress={() => setOverviewExpanded(p => !p)}>
              <Text style={styles.expandBtn}>{overviewExpanded ? "접기" : "더보기"}</Text>
            </Pressable>
          </View>
        )}

        {/* 장소: 지도 + 주소/카테고리 정보 */}
        {!loading && (hasMap || tableRows.length > 0) && (
          <View style={styles.placeSection}>
            <Text style={styles.sectionTitle}>장소</Text>
            {hasMap && (
              <MiniMapView latitude={detail!.mapy!} longitude={detail!.mapx!} name={item.title} />
            )}
            {tableRows.length > 0 && (
              <View style={styles.table}>
                {tableRows.map((row, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableLabel}>{row.label}</Text>
                    <Text style={styles.tableValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 이용 정보 */}
        {!loading && hasUsageInfo && (
          <View style={styles.usageSection}>
            <Text style={styles.sectionTitle}>이용 정보</Text>
            <View style={styles.table}>
              {usageRows.map((row, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{row.label}</Text>
                  <Text style={styles.tableValue}>{row.value}</Text>
                </View>
              ))}
              {(detail?.tel || detail?.infocenter || detail?.infocenterlodging) && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>문의</Text>
                  <Pressable onPress={() => Linking.openURL(`tel:${detail?.tel ?? detail?.infocenter ?? detail?.infocenterlodging}`)}>
                    <Text style={[styles.tableValue, styles.link]}>
                      {detail?.tel ?? detail?.infocenter ?? detail?.infocenterlodging}
                    </Text>
                  </Pressable>
                </View>
              )}
              {detail?.homepage && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>홈페이지</Text>
                  <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(detail.homepage!)}>
                    <Text style={[styles.tableValue, styles.link]} numberOfLines={1}>{detail.homepage}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Pressable style={styles.addButton} onPress={handleAddToItinerary}>
          <Text style={styles.addButtonText}>일정에 추가</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: spacing.md,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionButton: {
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray200,
    borderRadius: 16,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  title: {
    ...textStyles.h3,
    color: colors.gray900,
  },
  titleGroup: { gap: spacing.xs, marginBottom: spacing.sm },
  metaText: {
    ...textStyles.body5,
    color: colors.gray500,
  },
  loadingRow: { alignItems: "center", paddingVertical: spacing.lg },
  table: {
    // backgroundColor: colors.gray100,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 0,
  },
  sectionTitle: {
    ...textStyles.h8,
    color: colors.gray900,
    paddingTop: spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  tableLabel: {
    ...textStyles.body5,
    color: colors.gray600,
    width: 80,
    flexShrink: 0,
  },
  tableValue: {
    ...textStyles.body5,
    color: colors.gray700,
    flex: 1,
  },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  iconRowContainer: {
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor:  "rgb(234, 241, 254)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  iconRowTextCol: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  iconRowLabel: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  iconRowValue: {
    ...textStyles.body4,
    color: colors.gray900,
  },
  placeSection: { gap: spacing.sm },
  usageSection: { gap: spacing.sm },
  overviewSection: { gap: spacing.xs },
  overviewText: {
    ...textStyles.body5,
    color: colors.gray700,
    lineHeight: 20,
  },
  expandBtn: {
    ...textStyles.body5,
    color: colors.primary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  addButton: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});
