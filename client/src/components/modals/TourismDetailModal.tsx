import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import type { NearbyAttraction, TourismDetail } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
import { locationsApi } from "@/services/locations";
import { ItineraryCategory } from "@/types/itinerary";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatWalkTime, haversineDistance } from "@/utils/distanceUtils";
import CloseIcon from "../../../assets/close_sm.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  "12": "관광지",
  "14": "문화시설",
  "15": "축제·공연",
  "25": "여행코스",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식점",
};

const BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  여행코스: { color: "rgb(62, 91, 217)", bg: "rgb(236, 239, 254)" },
  쇼핑: { color: "rgb(31, 157, 87)", bg: "rgb(231, 247, 236)" },
  레포츠: { color: "rgb(55, 55, 55)", bg: "rgb(244, 244, 244)" },
  "축제·공연": { color: "rgb(14, 138, 138)", bg: "rgb(227, 246, 246)" },
  문화시설: { color: "rgb(10, 132, 255)", bg: "rgb(239, 244, 255)" },
  음식점: { color: "rgb(183, 104, 0)", bg: "rgb(255, 244, 224)" },
  숙박: { color: "rgb(109, 59, 224)", bg: "rgb(245, 239, 255)" },
  관광지: { color: "rgb(217, 28, 181)", bg: "rgb(255, 235, 251)" },
};
const DEFAULT_BADGE = { color: "#6C6C6C", bg: "#F5F5F5" };

function mapContentTypeToCategory(contentTypeId: string | null): ItineraryCategory {
  switch (contentTypeId) {
    case "39": case "음식점": return ItineraryCategory.MEAL;
    case "38": case "쇼핑": return ItineraryCategory.SHOPPING;
    default: return ItineraryCategory.ACTIVITY;
  }
}

function isAccommodationType(contentTypeId: string | null): boolean {
  return contentTypeId === "32" || contentTypeId === "숙박";
}

type CategoryRow = { label: string; value: string };
type IconRow = { label: string; value: string; icon: "clock" | "calendar" };

function getCategoryFields(detail: TourismDetail): {
  iconRows: IconRow[];
  heroStats: CategoryRow[];
  tableRows: CategoryRow[];
} {
  const t = detail.contentTypeId;
  const is = (...ids: string[]) => ids.some((id) => t === id);
  const r = (label: string, v: string | null | undefined): CategoryRow | null =>
    v ? { label, value: v } : null;
  const rows = (...items: (CategoryRow | null)[]) =>
    items.filter(Boolean) as CategoryRow[];

  const ir = (label: string, v: string | null | undefined, icon: IconRow["icon"]): IconRow | null =>
    v ? { label, value: v, icon } : null;
  const iconRows = (...items: (IconRow | null)[]) =>
    items.filter(Boolean) as IconRow[];

  if (is("12", "관광지")) {
    return {
      iconRows: iconRows(
        ir("이용시간", detail.usetime, "clock"),
        ir("휴관일", detail.restdate, "calendar"),
      ),
      heroStats: [],
      tableRows: rows(
        r("주차", detail.parking),
      ),
    };
  }
  if (is("14", "문화시설")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("이용시간", detail.usetimeculture),
        r("쉬는날", detail.restdateculture),
        r("이용요금", detail.usefee),
        r("관람소요시간", detail.spendtime),
        r("주차", detail.parkingculture),
      ),
    };
  }
  if (is("15", "축제·공연")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("행사기간", detail.eventdate),
        r("행사장소", detail.eventplace),
        r("공연시간", detail.playtime),
        r("이용요금", detail.usetimefestival),
        r("예매처", detail.bookingplace),
        r("관람연령", detail.agelimit),
      ),
    };
  }
  if (is("25", "여행코스")) {
    return {
      iconRows: [],
      heroStats: rows(r("총거리", detail.distance), r("소요시간", detail.taketime)),
      tableRows: rows(
        r("코스기간", detail.schedule),
        r("문의", detail.infocentertourcourse || detail.tel),
      ),
    };
  }
  if (is("28", "레포츠")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("이용시간", detail.usetimeleports),
        r("쉬는날", detail.restdateleports),
        r("입장료", detail.usefeeleports),
        r("예약안내", detail.reservation),
        r("주차", detail.parkingleports),
      ),
    };
  }
  if (is("32", "숙박")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("체크인", detail.checkintime),
        r("체크아웃", detail.checkouttime),
        r("객실수", detail.roomcount),
        r("예약안내", detail.reservationlodging),
        r("환불규정", detail.refundregulation),
        r("부대시설", detail.subfacility),
      ),
    };
  }
  if (is("38", "쇼핑")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("영업시간", detail.opentime),
        r("쉬는날", detail.restdateshopping),
        r("판매품목", detail.saleitem),
        r("주차", detail.parkingshopping),
      ),
    };
  }
  if (is("39", "음식점")) {
    return {
      iconRows: [],
      heroStats: [],
      tableRows: rows(
        r("영업시간", detail.opentimefood),
        r("쉬는날", detail.restdatefood),
        r("대표메뉴", detail.firstmenu),
        r("포장", detail.packing),
        r("예약안내", detail.reservationfood),
        r("주차", detail.parkingfood),
      ),
    };
  }
  return { iconRows: [], heroStats: [], tableRows: [] };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  item: NearbyAttraction | null;
  itineraryLocation: { latitude: number; longitude: number } | null;
  itinerary: any;
  onOpenNewItinerary: (draft: any) => void;
  onSwitchToAccommodation?: () => void;
}

export default function TourismDetailModal({
  visible,
  onClose,
  item,
  itineraryLocation,
  itinerary,
  onOpenNewItinerary,
  onSwitchToAccommodation,
}: Props) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });

  const [detail, setDetail] = useState<TourismDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isAccommodation = isAccommodationType(detail?.contentTypeId ?? item?.contentTypeId ?? null);

  const handleAddToItinerary = async () => {
    if (isAccommodation) {
      onClose();
      onSwitchToAccommodation?.();
      return;
    }
    if (!item) return;

    const raw = itinerary?.end_time ?? itinerary?.endTime ?? "09:00:00";
    const [h, m] = raw.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = Math.min(startMins + 60, 24 * 60);
    const fmt = (n: number) =>
      `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

    const coords = mapCoords;
    let locationId: number | undefined;
    try {
      const nameHash = [...item.title].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0).toString(16);
      const loc = await locationsApi.createLocation({
        name: item.title,
        placeId: `m_${nameHash}_${Math.random().toString(16).slice(2, 10)}`,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        address: detail?.address ?? undefined,
        fromGoogle: !!coords,
      });
      locationId = loc.id;
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
    });
    onClose();
  };
  useEffect(() => {
    if (!item || !visible) return;
    setDetail(null);
    setLoadFailed(false);
    setOverviewExpanded(false);
    setGeocodedCoords(null);
    setLoading(true);

    const isRealContentId = /^\d+$/.test(item.contentId);
    const fetchDetail = isRealContentId
      ? tourismApi.getTourismDetail({ contentId: item.contentId, contentTypeId: item.contentTypeId })
      : tourismApi.getTourismDetail({ name: item.title });

    fetchDetail
      .then(async (d) => {
        // contentId 기반 조회 결과가 item.title과 전혀 다르면 이름으로 재조회
        if (
          isRealContentId &&
          d.title &&
          !d.title.includes(item.title) &&
          !item.title.includes(d.title)
        ) {
          return tourismApi.getTourismDetail({ name: item.title });
        }
        return d;
      })
      .then(setDetail)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [item?.contentId, visible]);

  const destCoords =
    detail?.mapy && detail?.mapx ? { lat: detail.mapy, lng: detail.mapx } : null;

  useEffect(() => {
    if (!isLoaded || destCoords || !item?.title || loading) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: item.title }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        setGeocodedCoords({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [isLoaded, destCoords, item?.title, loading]);

  const mapCoords = destCoords ?? geocodedCoords;

  if (!visible) return null;

  const badge = item ? (BADGE_COLORS[item.contentTypeId] ?? DEFAULT_BADGE) : DEFAULT_BADGE;
  const detailCategoryLabel = detail
    ? (CONTENT_TYPE_LABELS[detail.contentTypeId] ?? detail.contentTypeId)
    : null;
  const badgeText = (() => {
    if (!item) return "";
    if (!detailCategoryLabel || detailCategoryLabel === item.contentTypeId) return item.contentTypeId;
    return `${item.contentTypeId}/${detailCategoryLabel}`;
  })();
  const walkTime = (() => {
    if (item?.dist) return formatWalkTime(item.dist);
    if (itineraryLocation && detail?.mapy && detail?.mapx) {
      const dist = haversineDistance(
        itineraryLocation.latitude,
        itineraryLocation.longitude,
        detail.mapy,
        detail.mapx,
      );
      return formatWalkTime(dist);
    }
    return null;
  })();

  const { iconRows, heroStats, tableRows: categoryRows } = detail
    ? getCategoryFields(detail)
    : { iconRows: [], heroStats: [], tableRows: [] };
  const tableRows = [
    ...(detail?.address ? [{ label: "주소", value: detail.address }] : []),
    ...categoryRows,
  ];

  const hasUsageInfo = !!(detail?.tel || detail?.infocenter || detail?.homepage);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {badgeText}
                  </Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <CloseIcon width={16} height={16} color={colors.gray600} />
                </Pressable>
              </View>

              {loading ? (
                <ActivityIndicator style={{ marginTop: 32 }} color={colors.gray400} />
              ) : (
                <>
                  <Text style={styles.title}>{item?.title}</Text>
                  {(detail?.address || walkTime) && (
                    <Text style={styles.metaText}>
                      {[detail?.address, walkTime].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  {item?.address && loadFailed && (
                    <Text style={styles.metaText}>{item.address}</Text>
                  )}
                </>
              )}
            </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 아이콘 행 (이용시간·휴관일 등) */}
            {!loading && detail && iconRows.length > 0 && (
              <View style={styles.iconRowContainer}>
                {iconRows.map((row, i) => (
                  <View key={i} style={styles.iconRow}>
                    <View style={styles.iconBox}>
                      {row.icon === "clock"
                        ? <TimeIcon width={22} height={22} color={colors.primary} />
                        : <CalendarIcon width={22} height={22} color={colors.primary} />}
                    </View>
                    <View style={styles.iconRowText}>
                      <Text style={styles.iconRowLabel}>{row.label}</Text>
                      <Text style={[
                        styles.iconRowValue,
                        row.value.length > 15 && styles.iconRowValueSmall,
                      ] as any}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 소개 */}
            {!loading && detail?.overview && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>소개</Text>
                  <Text
                    style={styles.overviewText}
                    numberOfLines={overviewExpanded ? undefined : 3}
                  >
                    {detail.overview}
                  </Text>
                  <Pressable onPress={() => setOverviewExpanded((v) => !v)}>
                    <Text style={styles.expandBtn}>
                      {overviewExpanded ? "접기" : "더보기"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* 지도 */}
            {!loading && Platform.OS === "web" && mapCoords && isLoaded && (
              <>
                <View style={styles.divider} />
                <View style={[styles.section, { paddingBottom: 0 }]}>
                  <Text style={styles.sectionTitle}>장소</Text>
                  <View style={styles.mapContainer}>
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCoords}
                      zoom={15}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        controlSize: 24,
                        zoomControlOptions: { position: 7 },
                        gestureHandling: "greedy",
                        keyboardShortcuts: false,
                        clickableIcons: false,
                      }}
                    >
                      <Marker position={mapCoords} title={item?.title ?? undefined} />
                    </GoogleMap>
                    {walkTime && (
                      <View style={styles.mapBadge}>
                        <Text style={styles.mapBadgeText}>
                          {walkTime === "바로 옆" ? "현재 일정 바로 옆" : `현재 일정에서 ${walkTime}`}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.mapOverlay}
                      onPress={() =>
                        Linking.openURL(
                          destCoords
                            ? `https://www.google.com/maps/search/?api=1&query=${destCoords.lat},${destCoords.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item?.title ?? "")}`,
                        )
                      }
                    >
                      <Text style={styles.mapOverlayText}>큰 지도 ↗</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {!loading && detail && (
              <>
                {/* 여행코스 등 hero 스탯 */}
                {heroStats.length > 0 && (
                  <View style={styles.heroRow}>
                    {heroStats.map((stat, i) => (
                      <View key={i} style={styles.heroCard}>
                        <Text style={styles.heroLabel}>{stat.label}</Text>
                        <Text style={styles.heroValue}>{stat.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 카테고리별 정보 */}
                {tableRows.length > 0 && (
                  <>
                    <View style={styles.section}>
                      <View style={styles.table}>
                        {tableRows.map((row, i) => (
                          <View
                            key={i}
                            style={[
                              styles.tableRow,
                              i < tableRows.length - 1 && styles.tableRowBorder,
                            ]}
                          >
                            <Text style={styles.tableLabel}>{row.label}</Text>
                            <Text style={styles.tableValue}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {/* 이용 정보 */}
                {hasUsageInfo && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>이용 정보</Text>
                      <View style={styles.table}>
                        {(detail.tel || detail.infocenter) && (
                          <View
                            style={[
                              styles.tableRow,
                              detail.homepage ? styles.tableRowBorder : undefined,
                            ]}
                          >
                            <Text style={styles.tableLabel}>문의</Text>
                            <Text style={styles.tableValue}>{detail.tel || detail.infocenter}</Text>
                          </View>
                        )}
                        {detail.homepage && (
                          <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>홈페이지</Text>
                            <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(detail.homepage!)}>
                              <Text style={[styles.tableValue, styles.link]} numberOfLines={1}>
                                {detail.homepage}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* 푸터 */}
          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={handleAddToItinerary}
            >
              <Text style={styles.addButtonText}>
                {isAccommodation ? "숙박에 추가" : "일정에 추가"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    width: "100%",
    maxWidth: 640,
    maxHeight: "min(720px, calc(100vh - 80px))" as any,
    overflow: "hidden",
    display: "flex" as any,
    flexDirection: "column",
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.3,
    shadowRadius: 64,
    elevation: 24,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  badge: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 12,
  } as any,
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 36,
    letterSpacing: -0.48,
    color: colors.gray900,
  } as any,
  metaText: {
    marginTop: 8,
    ...textStyles.body5,
    color: colors.gray500,
  },
  iconRowContainer: {
    flexDirection: "column",
    paddingHorizontal: 32,
    marginTop: spacing.md,
  },
  iconRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  iconRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgb(234, 241, 254)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRowText: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  iconRowLabel: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    color: colors.gray500,
  },
  iconRowValue: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 28,
    color: colors.gray900,
    whiteSpace: "pre-line",
  } as any,
  iconRowValueSmall: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
  },
  heroRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 32,
    paddingVertical: spacing.md,
  },
  heroCard: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
  },
  heroLabel: {
    ...textStyles.body5,
    color: colors.gray500,
  },
  heroValue: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 32,
    color: colors.gray900,
  } as any,
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 32,
  },
  section: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    color: colors.gray900,
  } as any,
  overviewText: {
    ...textStyles.body3,
    color: colors.gray700,
    lineHeight: 24,
    whiteSpace: "pre-line",
  } as any,
  expandBtn: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    cursor: "pointer",
  } as any,
  mapContainer: {
    width: "100%",
    height: 176,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    position: "relative",
  },
  mapBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.94)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray900,
  } as any,
  mapOverlay: {
    position: "absolute",
    bottom: 12,
    right: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  mapOverlayText: {
    fontSize: 11,
    color: colors.gray700,
  },
  table: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 8,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tableLabel: {
    ...textStyles.body5,
    color: colors.gray500,
    width: 80,
    flexShrink: 0,
  },
  tableValue: {
    ...textStyles.body5,
    color: colors.gray900,
    flex: 1,
    textAlign: "right",
    whiteSpace: "pre-line",
  } as any,
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  failedText: {
    marginTop: spacing.md,
    ...textStyles.body5,
    color: colors.gray400,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  closeButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray900,
  } as any,
  addButton: {
    flex: 1.7,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.gray900,
    justifyContent: "center",
    alignItems: "center",
  } as any,
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  } as any,
});
