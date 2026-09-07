import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ActivityIndicator,
  Image,
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
import type { FestivalItem, TourismDetail } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
import { locationsApi, manualPlaceId } from "@/services/locations";
import { ItineraryCategory } from "@/types/itinerary";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import CloseIcon from "../../../assets/close_sm.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import WonIcon from "../../../assets/won.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";

const LCLSSYSTM2_MAP: Record<string, { label: string; bg: string; color: string }> = {
  EV01: { label: "축제", bg: colors.festivalBg, color: colors.festivalText },
  EV02: { label: "공연", bg: "#FDEAF9", color: colors.categoryActivity },
  EV03: { label: "행사", bg: colors.accommodationBg, color: colors.categoryMeal },
};
const DEFAULT_BADGE = { label: "축제", bg: colors.festivalBg, color: colors.festivalText };

const ITEM_GAP = 8;

function fmtDate(s: string | null): string {
  if (!s || s.length < 8) return "";
  return `${s.slice(0, 4)}.${parseInt(s.slice(4, 6))}.${parseInt(s.slice(6, 8))}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  item: FestivalItem | null;
  onAddToItinerary?: (draft: any) => void;
}

export default function FestivalDetailModal({ visible, onClose, item, onAddToItinerary }: Props) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });

  const [detail, setDetail] = useState<TourismDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoContainerWidth, setPhotoContainerWidth] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [singleAspectRatio, setSingleAspectRatio] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  // detail 로드 후에만 allImages 확정 → loading 중엔 빈 배열 → single/multi 판별 정확
  const allImages = useMemo(() => {
    if (!detail) return [];
    const main = detail.imageUrl || item?.imageUrl || null;
    const extras = detail.images.filter((u) => u !== main);
    return main ? [main, ...extras] : extras;
  }, [detail, item?.imageUrl]);

  const singleImageUri = allImages.length === 1 ? allImages[0] : null;

  // 1장일 때 실제 비율 계산
  useEffect(() => {
    if (!singleImageUri) { setSingleAspectRatio(null); return; }
    Image.getSize(
      singleImageUri,
      (w, h) => { if (w > 0 && h > 0) setSingleAspectRatio(w / h); },
      () => setSingleAspectRatio(4 / 3),
    );
  }, [singleImageUri]);

  useEffect(() => {
    if (photoContainerWidth === 0) return;
    const itemW = (photoContainerWidth - ITEM_GAP) / 2;
    Animated.timing(scrollAnim, {
      toValue: -photoIndex * (itemW + ITEM_GAP),
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [photoIndex, photoContainerWidth]);

  useEffect(() => {
    if (!item || !visible) return;
    setDetail(null);
    setOverviewExpanded(false);
    setProgramExpanded(false);
    setGeocodedCoords(null);
    setPhotoIndex(0);
    scrollAnim.setValue(0);
    setSingleAspectRatio(null);
    setLoading(true);
    tourismApi
      .getTourismDetail({ contentId: item.contentId, contentTypeId: item.contentTypeId ?? "15" })
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item?.contentId, visible]);

  useEffect(() => {
    if (!isLoaded || !item?.title || loading) return;
    const destCoords = detail?.mapy && detail?.mapx ? { lat: detail.mapy, lng: detail.mapx } : null;
    if (destCoords) return;
    const mapx = item.mapx;
    const mapy = item.mapy;
    if (mapx && mapy) {
      setGeocodedCoords({ lat: mapy, lng: mapx });
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: item.title }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        setGeocodedCoords({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [isLoaded, detail, item, loading]);

  const handleAddToItinerary = async () => {
    if (!onAddToItinerary || !item) return;
    const title = detail?.title ?? item.title;
    const coords =
      detail?.mapy && detail?.mapx
        ? { lat: detail.mapy, lng: detail.mapx }
        : item.mapy && item.mapx
          ? { lat: item.mapy, lng: item.mapx }
          : null;
    let locationId: number | undefined;
    try {
      const loc = await locationsApi.createLocation({
        name: title,
        placeId: manualPlaceId(title),
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        address: detail?.address ?? undefined,
        fromGoogle: false,
      });
      locationId = loc.id;
    } catch {}
    onAddToItinerary({
      title,
      description: detail?.overview ?? undefined,
      location: title,
      locationId,
      category: ItineraryCategory.ACTIVITY,
    });
    onClose();
  };

  if (!visible || !item) return null;

  const badge = LCLSSYSTM2_MAP[item.lclsSystm2 ?? ""] ?? DEFAULT_BADGE;

  const destCoords =
    detail?.mapy && detail?.mapx ? { lat: detail.mapy, lng: detail.mapx } : null;
  const mapCoords = destCoords ?? geocodedCoords;

  const period = (() => {
    if (detail?.eventdate) return detail.eventdate;
    const s = fmtDate(item.eventStartDate);
    const e = fmtDate(item.eventEndDate);
    if (s && e) return `${s} – ${e}`;
    return s || e || null;
  })();

  const infoRows: { label: string; value: string }[] = [];
  if (detail?.sponsor1) infoRows.push({ label: "주최", value: detail.sponsor1 });
  if (detail?.sponsor2) infoRows.push({ label: "주관", value: detail.sponsor2 });
  if (detail?.tel || detail?.infocenter) infoRows.push({ label: "문의", value: detail.tel || detail.infocenter || "" });

  const tableRows: { label: string; value: string }[] = [];
  if (detail?.eventplace) tableRows.push({ label: "행사장소", value: detail.eventplace });
  if (detail?.address) tableRows.push({ label: "주소", value: detail.address });
  if (detail?.agelimit) tableRows.push({ label: "관람연령", value: detail.agelimit });

  const iconRows: { label: string; value: string; icon: "calendar" | "clock" | "won" }[] = [];
  if (period) iconRows.push({ label: "행사기간", value: period, icon: "calendar" });
  if (detail?.playtime) iconRows.push({ label: "공연시간", value: detail.playtime, icon: "clock" });
  if (detail?.usetimefestival) iconRows.push({ label: "이용요금", value: detail.usetimefestival, icon: "won" });

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <CloseIcon width={16} height={16} color={colors.gray600} />
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={colors.gray400} />
            ) : (
              <>
                <Text style={styles.title} numberOfLines={2}>{detail?.title ?? item.title}</Text>
                {(detail?.address || item.address) && (
                  <Text style={styles.metaText} numberOfLines={2}>
                    {detail?.address ?? item.address}
                  </Text>
                )}
              </>
            )}
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 사진 */}
            {allImages.length > 0 && (() => {
              const isSingle = allImages.length === 1;
              const singleHeight = singleAspectRatio && photoContainerWidth > 0
                ? photoContainerWidth / singleAspectRatio
                : photoContainerWidth / 1.5;
              const itemW = photoContainerWidth > 0 ? (photoContainerWidth - ITEM_GAP) / 2 : 200;
              const itemH = itemW / 1.5;
              const canPrev = photoIndex > 0;
              const canNext = photoIndex < allImages.length - 1;
              return (
                <View style={styles.photoWrapper}>
                  <View
                    style={styles.photoInner}
                    onLayout={(e) => setPhotoContainerWidth(e.nativeEvent.layout.width)}
                  >
                    {isSingle ? (
                      photoContainerWidth > 0 && (
                        <Pressable onPress={() => setZoomIndex(0)}>
                          <Image
                            source={{ uri: allImages[0] }}
                            style={[styles.photoSingle, { height: singleHeight }]}
                            resizeMode="cover"
                          />
                        </Pressable>
                      )
                    ) : (
                      <View style={[styles.photoStrip, { height: itemH }]}>
                        <Animated.View
                          style={[styles.photoRow, { transform: [{ translateX: scrollAnim }] }]}
                        >
                          {allImages.map((uri, idx) => (
                            <Pressable key={idx} onPress={() => setZoomIndex(idx)}>
                              <Image
                                source={{ uri }}
                                style={[styles.photo, { width: itemW, height: itemH, marginRight: idx < allImages.length - 1 ? ITEM_GAP : 0 }]}
                                resizeMode="cover"
                              />
                            </Pressable>
                          ))}
                        </Animated.View>
                        {canPrev && (
                          <Pressable
                            style={[styles.arrowBtn, styles.arrowLeft]}
                            onPress={() => setPhotoIndex((i) => i - 1)}
                          >
                            <LeftArrowIcon width={16} height={16} color={colors.gray300} />
                          </Pressable>
                        )}
                        {canNext && (
                          <Pressable
                            style={[styles.arrowBtn, styles.arrowRight]}
                            onPress={() => setPhotoIndex((i) => i + 1)}
                          >
                            <RightArrowIcon width={16} height={16} color={colors.gray300} />
                          </Pressable>
                        )}
                      </View>
                    )}
                    {!isSingle && (
                      <View style={styles.dotRow}>
                        {allImages.map((_, idx) => (
                          <View
                            key={idx}
                            style={[styles.dot, idx === photoIndex && styles.dotActive]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* 아이콘 행 */}
            {!loading && iconRows.length > 0 && (
              <View style={styles.iconRowContainer}>
                {iconRows.map((row, i) => (
                  <View key={i} style={styles.iconRow}>
                    <View style={styles.iconBox}>
                      {row.icon === "calendar" ? (
                        <CalendarIcon width={22} height={22} color={colors.primary} />
                      ) : row.icon === "clock" ? (
                        <TimeIcon width={22} height={22} color={colors.primary} />
                      ) : (
                        <WonIcon width={22} height={22} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.iconRowText}>
                      <Text style={styles.iconRowLabel}>{row.label}</Text>
                      <Text style={[styles.iconRowValue, row.value.length > 40 && styles.iconRowValueSmall] as any}>
                        {row.value}
                      </Text>
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
                    style={styles.bodyText}
                    numberOfLines={overviewExpanded ? undefined : 3}
                  >
                    {detail.overview}
                  </Text>
                  <Pressable onPress={() => setOverviewExpanded((v) => !v)}>
                    <Text style={styles.expandBtn}>{overviewExpanded ? "접기" : "더보기"}</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* 프로그램 */}
            {!loading && detail?.program && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>프로그램</Text>
                  <Text
                    style={styles.bodyText}
                    numberOfLines={programExpanded ? undefined : 3}
                  >
                    {detail.program}
                  </Text>
                  <Pressable onPress={() => setProgramExpanded((v) => !v)}>
                    <Text style={styles.expandBtn}>{programExpanded ? "접기" : "더보기"}</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* 장소 */}
            {!loading && (tableRows.length > 0 || (Platform.OS === "web" && mapCoords && isLoaded)) && (
              <>
                <View style={styles.divider} />
                <View style={[styles.section, { paddingBottom: 0 }]}>
                  <Text style={styles.sectionTitle}>장소</Text>
                  {Platform.OS === "web" && mapCoords && isLoaded && (
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
                        <Marker position={mapCoords} title={item.title} />
                      </GoogleMap>
                      <Pressable
                        style={styles.mapOverlay}
                        onPress={() =>
                          Linking.openURL(
                            destCoords
                              ? `https://www.google.com/maps/search/?api=1&query=${destCoords.lat},${destCoords.lng}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title)}`,
                          )
                        }
                      >
                        <Text style={styles.mapOverlayText}>큰 지도 ↗</Text>
                      </Pressable>
                    </View>
                  )}
                  {tableRows.length > 0 && (
                    <View style={[styles.table, { marginTop: mapCoords ? spacing.md : 0 }]}>
                      {tableRows.map((row, i) => (
                        <View
                          key={i}
                          style={[styles.tableRow, i < tableRows.length - 1 && styles.tableRowBorder]}
                        >
                          <Text style={styles.tableLabel}>{row.label}</Text>
                          <Text style={styles.tableValue}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ height: spacing.md }} />
              </>
            )}

            {/* 관람 정보 */}
            {!loading && (infoRows.length > 0 || detail?.homepage) && (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>관람 정보</Text>
                  <View style={styles.table}>
                    {infoRows.map((row, i) => (
                      <View
                        key={i}
                        style={[styles.tableRow, (i < infoRows.length - 1 || !!detail?.homepage) && styles.tableRowBorder]}
                      >
                        <Text style={styles.tableLabel}>{row.label}</Text>
                        <Text style={styles.tableValue}>{row.value}</Text>
                      </View>
                    ))}
                    {detail?.homepage && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>홈페이지</Text>
                        <Pressable style={{ flex: 1 }} onPress={() => window.open(detail.homepage!, "_blank")}>
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
          </ScrollView>

          {/* 푸터 */}
          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={handleAddToItinerary}>
              <Text style={styles.addButtonText}>일정에 추가</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    {/* 이미지 줌 오버레이 */}

    <Modal
      visible={zoomIndex !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setZoomIndex(null)}
    >
      <Pressable style={styles.zoomOverlay} onPress={() => setZoomIndex(null)}>
        <Pressable style={styles.zoomImageWrapper} onPress={() => {}}>
          {zoomIndex !== null && (
            <Image
              source={{ uri: allImages[zoomIndex] }}
              style={styles.zoomImage}
              resizeMode="center"
            />
          )}
        </Pressable>

        {/* 닫기 */}
        <Pressable style={styles.zoomCloseBtn} onPress={() => setZoomIndex(null)}>
          <CloseIcon width={16} height={16} color={colors.white} />
        </Pressable>

        {/* 이전 */}
        {zoomIndex !== null && zoomIndex > 0 && (
          <Pressable
            style={[styles.zoomArrow, styles.zoomArrowLeft]}
            onPress={() => setZoomIndex((i) => (i ?? 0) - 1)}
          >
            <LeftArrowIcon width={16} height={16} color={colors.white} />
          </Pressable>
        )}

        {/* 다음 */}
        {zoomIndex !== null && zoomIndex < allImages.length - 1 && (
          <Pressable
            style={[styles.zoomArrow, styles.zoomArrowRight]}
            onPress={() => setZoomIndex((i) => (i ?? 0) + 1)}
          >
            <RightArrowIcon width={16} height={16} color={colors.white} />
          </Pressable>
        )}

        {/* 카운터 */}
        {zoomIndex !== null && (
          <View style={styles.zoomCounter}>
            <Text style={styles.zoomCounterText}>
              {zoomIndex + 1} / {allImages.length}
            </Text>
          </View>
        )}
      </Pressable>
    </Modal>
    </>
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
  photoWrapper: {
    paddingHorizontal: 32,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  photoInner: {
    gap: spacing.sm,
  },
  photoSingle: {
    width: "100%",
    borderRadius: radii.lg,
    backgroundColor: colors.gray200,
  },
  photoStrip: {
    overflow: "hidden",
  },
  photoRow: {
    flexDirection: "row",
  },
  photo: {
    borderRadius: radii.lg,
    backgroundColor: colors.gray200,
    flexShrink: 0,
  },
  arrowBtn: {
    position: "absolute",
    top: "50%" as any,
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  arrowLeft: {
    left: 0,
  },
  arrowRight: {
    right: 0,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.gray300,
  },
  dotActive: {
    backgroundColor: colors.gray700,
    width: 14,
  },
  iconRowContainer: {
    flexDirection: "column",
    paddingHorizontal: 32,
    marginTop: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 12,
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
  } as any,
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
  bodyText: {
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
  } as any,
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
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  zoomImageWrapper: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  zoomCloseBtn: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomArrow: {
    position: "absolute",
    top: "50%" as any,
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomArrowLeft: {
    left: 24,
  },
  zoomArrowRight: {
    right: 24,
  },
  zoomCounter: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  zoomCounterText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
    lineHeight: 18,
  } as any,
});
