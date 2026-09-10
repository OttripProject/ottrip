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
import LocationIcon from "../../../assets/mobile_location.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import HourglassIcon from "../../../assets/hourglass.svg";
import WonIcon from "../../../assets/won.svg";
import RouteIcon from "../../../assets/route.svg";
import RoomIcon from "../../../assets/room.svg";
import CutleryIcon from "../../../assets/cutlery.svg";

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
  문화시설: { color: "rgb(217, 28, 181)", bg: "rgb(255, 235, 251)" },
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
type IconRow = { label: string; value: string; icon: "clock" | "calendar" | "hourglass" | "won" | "route" | "checkinout" | "room" | "cutlery" };

function getCategoryFields(detail: TourismDetail): {
  iconRows: IconRow[];
  heroStats: CategoryRow[];
  prefixRows: CategoryRow[];
  tableRows: CategoryRow[];
  usageRows: CategoryRow[];
  badgeSection: { title: string; items: string[] } | null;
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
      iconRows: iconRows(ir("이용시간", detail.usetime, "clock"), ir("휴관일", detail.restdate, "calendar")),
      heroStats: [], prefixRows: [], usageRows: [], badgeSection: null,
      tableRows: rows(r("주차", detail.parking)),
    };
  }
  if (is("14", "문화시설")) {
    return {
      iconRows: iconRows(
        ir("이용시간", detail.usetimeculture, "clock"),
        ir("휴관일", detail.restdateculture, "calendar"),
        ir("관람소요시간", detail.spendtime, "hourglass"),
        ir("이용요금", detail.usefee, "won"),
      ),
      heroStats: [], prefixRows: [], usageRows: [], badgeSection: null,
      tableRows: rows(r("주차", detail.parkingculture)),
    };
  }
  if (is("15", "축제·공연")) {
    return {
      iconRows: iconRows(
        ir("행사기간", detail.eventdate, "calendar"),
        ir("공연시간", detail.playtime, "clock"),
        ir("이용요금", detail.usetimefestival, "won"),
      ),
      heroStats: [],
      prefixRows: rows(r("행사장소", detail.eventplace)),
      usageRows: rows(r("예매처", detail.bookingplace)),
      badgeSection: null,
      tableRows: rows(r("관람연령", detail.agelimit)),
    };
  }
  if (is("25", "여행코스")) {
    return {
      iconRows: iconRows(ir("총거리", detail.distance, "route"), ir("소요시간", detail.taketime, "hourglass")),
      heroStats: [],
      prefixRows: rows(r("코스", detail.schedule)),
      usageRows: rows(r("문의", detail.infocentertourcourse || detail.tel)),
      badgeSection: null,
      tableRows: [],
    };
  }
  if (is("28", "레포츠")) {
    return {
      iconRows: iconRows(
        ir("이용시간", detail.usetimeleports, "clock"),
        ir("휴관일", detail.restdateleports, "calendar"),
        ir("입장료", detail.usefeeleports, "won"),
      ),
      heroStats: [], prefixRows: [],
      usageRows: rows(r("예약안내", detail.reservation)),
      badgeSection: null,
      tableRows: rows(r("주차", detail.parkingleports)),
    };
  }
  if (is("32", "숙박")) {
    const checkinCheckout =
      detail.checkintime && detail.checkouttime
        ? `${detail.checkintime}@@${detail.checkouttime}`
        : detail.checkintime ?? detail.checkouttime ?? null;
    return {
      iconRows: iconRows(
        checkinCheckout ? { label: "체크인 / 체크아웃", value: checkinCheckout, icon: "checkinout" } : null,
        ir("객실수", detail.roomcount, "room"),
      ),
      heroStats: [], prefixRows: [],
      usageRows: rows(
        r("예약안내", detail.reservationlodging),
        r("환불규정", detail.refundregulation),
      ),
      badgeSection: detail.subfacility
        ? { title: "부대시설", items: detail.subfacility.split(/[,·\/]/).map((s) => s.trim().replace(/\s*등$/, "")).filter(Boolean) }
        : null,
      tableRows: rows(r("주차", detail.parkinglodging)),
    };
  }
  if (is("38", "쇼핑")) {
    return {
      iconRows: iconRows(
        ir("영업시간", detail.opentime, "clock"),
        ir("휴무일", detail.restdateshopping, "calendar"),
      ),
      heroStats: [], prefixRows: [], usageRows: [],
      badgeSection: detail.saleitem
        ? { title: "판매품목", items: detail.saleitem.split(/[,·\/]/).map((s) => s.trim().replace(/\s*등$/, "")).filter(Boolean) }
        : null,
      tableRows: rows(r("주차", detail.parkingshopping)),
    };
  }
  if (is("39", "음식점")) {
    return {
      iconRows: iconRows(
        ir("영업시간", detail.opentimefood, "clock"),
        ir("휴무일", detail.restdatefood, "calendar"),
        ir("대표메뉴", detail.firstmenu, "cutlery"),
      ),
      heroStats: [], prefixRows: [], badgeSection: null,
      usageRows: rows(r("포장", detail.packing), r("예약안내", detail.reservationfood)),
      tableRows: rows(r("주차", detail.parkingfood)),
    };
  }
  return { iconRows: [], heroStats: [], prefixRows: [], usageRows: [], badgeSection: null, tableRows: [] };
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
      const itineraryDate = itinerary?.itinerary_date ?? itinerary?.itineraryDate ?? "";
      const hotelName = detail?.title ?? item?.title ?? "";
      let locationId: number | undefined;
      try {
        const coords = mapCoords;
        const nameHash = [...hotelName].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0).toString(16);
        const loc = await locationsApi.createLocation({
          name: hotelName,
          placeId: `m_${nameHash}_${Math.random().toString(16).slice(2, 10)}`,
          latitude: coords?.lat ?? 0,
          longitude: coords?.lng ?? 0,
          address: detail?.address ?? undefined,
          hasCoords: !!coords,
        });
        locationId = loc.id;
      } catch {}
      onSwitchToAccommodation?.({
        name: hotelName,
        place: hotelName,
        locationId,
        checkinTime: detail?.checkintime ?? "15:00",
        checkoutTime: detail?.checkouttime ?? "11:00",
        checkinDate: itineraryDate || undefined,
        checkoutDate: itineraryDate
          ? new Date(new Date(itineraryDate).getTime() + 86400000).toISOString().slice(0, 10)
          : undefined,
        country: itinerary?.country || undefined,
        city: itinerary?.city || undefined,
      });
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
        hasCoords: !!coords,
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
      locationLat: coords?.lat,
      locationLng: coords?.lng,
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
      ? tourismApi.getTourismDetail({ contentId: item.contentId, contentTypeId: item.contentTypeId, includeImages: false })
      : tourismApi.getTourismDetail({ name: item.title, includeImages: false });

    fetchDetail
      .then(async (d) => {
        // contentId 기반 조회 결과가 item.title과 전혀 다르면 이름으로 재조회
        if (
          isRealContentId &&
          d.title &&
          !d.title.includes(item.title) &&
          !item.title.includes(d.title)
        ) {
          return tourismApi.getTourismDetail({ name: item.title, includeImages: false });
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
    ? (CONTENT_TYPE_LABELS[detail.contentTypeId ?? ""] ?? detail.contentTypeId)
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

  const { iconRows, heroStats, prefixRows, usageRows, badgeSection, tableRows: categoryRows } = detail
    ? getCategoryFields(detail)
    : { iconRows: [], heroStats: [], prefixRows: [], usageRows: [], badgeSection: null, tableRows: [] };
  const tableRows = [
    ...prefixRows,
    ...(detail?.address ? [{ label: "주소", value: detail.address }] : []),
    ...categoryRows,
  ];

  const hasUsageInfo = !!(detail?.tel || detail?.infocenter || detail?.infocenterlodging || detail?.homepage || usageRows.length > 0);

  const feeValue = (() => {
    if (!detail) return null;
    const t = detail.contentTypeId;
    if (t === "14" || t === "문화시설") return detail.usefee;
    if (t === "15" || t === "축제·공연") return detail.usetimefestival;
    if (t === "28" || t === "레포츠") return detail.usefeeleports;
    return null;
  })();
  const feeBadge = feeValue
    ? (feeValue.includes("유료") || /\d+원/.test(feeValue) || !feeValue.includes("무료") ? "유료" : "무료")
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>
                      {badgeText}
                    </Text>
                  </View>
                  {feeBadge && (
                    <View style={[styles.badge, feeBadge === "무료" ? styles.feeBadgeFree : styles.feeBadgePaid]}>
                      <Text style={[styles.badgeText, feeBadge === "무료" ? styles.feeBadgeFreeText : styles.feeBadgePaidText]}>
                        {feeBadge}
                      </Text>
                    </View>
                  )}
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
                    <View style={styles.addressRow}>
                      <LocationIcon width={12} height={12} color={colors.gray500} />
                      <Text style={styles.metaText}>
                        {[detail?.address, walkTime].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  )}
                  {item?.address && loadFailed && (
                    <View style={styles.addressRow}>
                      <LocationIcon width={12} height={12} color={colors.gray500} />
                      <Text style={styles.metaText}>{item.address}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 아이콘 행 (이용시간·휴관일 등) */}
            {!loading && detail && iconRows.length > 0 && (
              <View style={styles.iconRowContainer}>
                {iconRows.map((row, i) => {
                  if (row.icon === "checkinout") {
                    const parts = row.value.split("@@");
                    const checkin = parts[0] ?? "";
                    const checkout = parts[1] ?? "";
                    return (
                      <View key={i} style={styles.iconRow}>
                        <View style={styles.iconBox}>
                          <TimeIcon width={22} height={22} color={colors.primary} />
                        </View>
                        <View style={[styles.iconRowText, { gap: 2 }]}>
                          <View style={styles.checkinOutRow}>
                            <View style={styles.checkinOutItem}>
                              <Text style={styles.iconRowLabel}>체크인</Text>
                              <Text style={styles.iconRowValue}>{checkin}</Text>
                            </View>
                            <Text style={styles.checkinOutArrow}>→</Text>
                            <View style={styles.checkinOutItem}>
                              <Text style={styles.iconRowLabel}>체크아웃</Text>
                              <Text style={styles.iconRowValue}>{checkout}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={i} style={styles.iconRow}>
                      <View style={styles.iconBox}>
                        {row.icon === "clock"
                          ? <TimeIcon width={22} height={22} color={colors.primary} />
                          : row.icon === "calendar"
                          ? <CalendarIcon width={22} height={22} color={colors.primary} />
                          : row.icon === "hourglass"
                          ? <HourglassIcon width={22} height={22} color={colors.primary} />
                          : row.icon === "route"
                          ? <RouteIcon width={22} height={22} color={colors.primary} />
                          : row.icon === "room"
                          ? <RoomIcon width={22} height={22} color={colors.primary} />
                          : row.icon === "cutlery"
                          ? <CutleryIcon width={22} height={22} color={colors.primary} />
                          : <WonIcon width={22} height={22} color={colors.primary} />}
                      </View>
                      <View style={styles.iconRowText}>
                        <Text style={styles.iconRowLabel}>{row.label}</Text>
                        <Text style={[
                          styles.iconRowValue,
                          row.value.length > 15 && styles.iconRowValueSmall,
                        ] as any}>{row.value}</Text>
                      </View>
                    </View>
                  );
                })}
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

            {/* 뱃지 섹션 (부대시설·판매품목 등) */}
            {!loading && detail && badgeSection && badgeSection.items.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{badgeSection.title}</Text>
                  <View style={styles.facilityBadgeRow}>
                    {badgeSection.items.map((item, i) => (
                      <View key={i} style={styles.facilityBadge}>
                        <Text style={styles.facilityBadgeText}>{item}</Text>
                      </View>
                    ))}
                  </View>
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
                        {usageRows.map((row, i) => (
                          <View key={i} style={[styles.tableRow, styles.tableRowBorder]}>
                            <Text style={styles.tableLabel}>{row.label}</Text>
                            <Text style={styles.tableValue}>{row.value}</Text>
                          </View>
                        ))}
                        {(detail.tel || detail.infocenter || detail.infocenterlodging) && (
                          <View
                            style={[
                              styles.tableRow,
                              detail.homepage ? styles.tableRowBorder : undefined,
                            ]}
                          >
                            <Text style={styles.tableLabel}>문의</Text>
                            <Text style={styles.tableValue}>{detail.tel || detail.infocenter || detail.infocenterlodging}</Text>
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
            {!loading && detail && <Text style={styles.attribution}>출처: ⓒ한국관광공사</Text>}
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
  feeBadgeFree: {
    backgroundColor: colors.gray200,
  },
  feeBadgeFreeText: {
    color: colors.gray700,
  },
  feeBadgePaid: {
    backgroundColor: colors.gray200,
  },
  feeBadgePaidText: {
    color: colors.gray700,
  },
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
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  metaText: {
    ...textStyles.body5,
    color: colors.gray500,
    flex: 1,
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
  checkinOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkinOutItem: {
    flexDirection: "column",
    gap: 2,
  },
  checkinOutArrow: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.gray400,
    lineHeight: 28,
  } as any,
  checkinOutLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray700,
    lineHeight: 18,
  } as any,
  facilityBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  facilityBadge: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  facilityBadgeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgb(55,55,55)",
    lineHeight: 18,
  } as any,
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
  attribution: {
    ...textStyles.body6,
    color: colors.gray500,
    textAlign: "right",
    marginRight: spacing.xl
  } as any,
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
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
