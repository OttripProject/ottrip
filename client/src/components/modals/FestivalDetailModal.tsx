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
import { useBackdropClose } from "@/hooks/useBackdropClose";
import { ItineraryCategory } from "@/types/itinerary";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import CloseIcon from "../../../assets/close_sm.svg";
import CloseXIcon from "../../../assets/close_x.svg";
import PlusIcon from "../../../assets/mobile_plus.svg";
import LocationIcon from "../../../assets/mobile_location.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import WonIcon from "../../../assets/won.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";

const LCLSSYSTM2_MAP: Record<string, { label: string; bg: string; color: string }> = {
  EV01: { label: "축제", bg: colors.festivalBg, color: colors.festivalText },
  EV02: { label: "공연", bg: colors.performanceBg, color: colors.categoryActivity },
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
  const backdrop = useBackdropClose(onClose);

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

  const handleAddToItinerary = () => {
    if (!onAddToItinerary || !item) return;
    const title = detail?.title ?? item.title;
    const address = detail?.address ?? item.address;
    const coords =
      detail?.mapy && detail?.mapx
        ? { lat: detail.mapy, lng: detail.mapx }
        : item.mapy && item.mapx
          ? { lat: item.mapy, lng: item.mapx }
          : null;
    onAddToItinerary({
      title,
      description: detail?.overview ?? undefined,
      location: address ?? title,
      category: ItineraryCategory.SIGHTSEEING,
      matchedDate: item.matchedDate ?? undefined,
      locationLat: coords?.lat,
      locationLng: coords?.lng,
      locationAddress: address ?? undefined,
      eventStartDate: item.eventStartDate ?? undefined,
      eventEndDate: item.eventEndDate ?? undefined,
      playtime: detail?.playtime ?? undefined,
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
  if (period) iconRows.push({ label: "기간", value: period, icon: "calendar" });
  if (detail?.playtime) iconRows.push({ label: "행사시간", value: detail.playtime, icon: "clock" });
  if (detail?.usetimefestival) iconRows.push({ label: "이용요금", value: detail.usetimefestival, icon: "won" });

  return (
    <>
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay} {...backdrop.overlayProps}>
        <View style={styles.modal} {...backdrop.cardProps}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* 헤더 */}
          <View>
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <MotionPressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="닫기"
              >
                <MotionIcon>
                  <CloseXIcon width={16} height={16} color={colors.gray700} />
                </MotionIcon>
              </MotionPressable>
            </View>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={colors.gray400} />
            ) : (
              <>
                <Text style={styles.title} numberOfLines={2}>{detail?.title ?? item.title}</Text>
                {(detail?.address || item.address) && (
                  <View style={styles.addressRow}>
                    <LocationIcon width={13} height={13} color={colors.gray500} />
                    <Text style={styles.metaText} numberOfLines={2}>
                      {detail?.address ?? item.address}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

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
                <View style={styles.section}>
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
            {!loading && detail && <Text style={styles.attribution}>출처: ⓒ한국관광공사</Text>}
          </ScrollView>

          {/* 푸터 */}
          <View style={styles.footer}>
            <MotionPressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </MotionPressable>
            <MotionPressable
              style={[styles.addButton, (loading || !detail) && styles.addButtonDisabled]}
              hoverStyle={shadows.darkHover}
              onPress={handleAddToItinerary}
              disabled={loading || !detail}
            >
              <MotionIcon>
                <PlusIcon width={16} height={16} color={colors.white} />
              </MotionIcon>
              <Text style={styles.addButtonText}>일정에 추가</Text>
            </MotionPressable>
          </View>
        </View>
      </View>
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
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    ...modalMotion.card,
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    width: "100%",
    maxWidth: 640,
    maxHeight: "min(720px, calc(100vh - 80px))" as any,
    overflow: "hidden",
    display: "flex" as any,
    flexDirection: "column",
    ...shadows.modal,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  badge: {
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    ...textStyles.h8,
    lineHeight: textStyles.h8.fontSize,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    ...surfaces.subtle,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...textStyles.h2,
    marginTop: spacing.lg,
    letterSpacing: -0.48,
    color: colors.gray900,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    ...textStyles.body5,
    color: colors.gray600,
    flex: 1,
  },
  photoWrapper: {
    marginTop: spacing.lg,
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
    marginTop: spacing.lg,
  },
  iconRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
    paddingVertical: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.primaryTint,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRowText: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    gap: spacing.xs,
  },
  iconRowLabel: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconRowValue: {
    ...textStyles.h3,
    color: colors.gray900,
    whiteSpace: "pre-line",
  } as any,
  iconRowValueSmall: {
    ...textStyles.body3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginTop: spacing.lg,
  },
  section: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...textStyles.h7,
    color: colors.gray900,
  },
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
    borderRadius: radii.lgPlus,
    overflow: "hidden",
    backgroundColor: colors.gray200,
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
    gap: spacing.lg,
    alignItems: "baseline",
    paddingVertical: spacing.sm,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  tableLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    width: 96,
    flexShrink: 0,
  },
  tableValue: {
    ...textStyles.body4,
    color: colors.gray900,
    flex: 1,
    textAlign: "right",
    whiteSpace: "pre-line",
  } as any,
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  attribution: {
    ...textStyles.body6,
    color: colors.gray500,
    textAlign: "right",
    marginTop: spacing.md,
  } as any,
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  closeButton: {
    flex: 1,
    height: 52,
    borderRadius: radii.lgPlus,
    ...surfaces.subtle,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  addButton: {
    flex: 1.7,
    height: 52,
    borderRadius: radii.lgPlus,
    ...surfaces.dark,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.4,
  } as any,
  addButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  zoomOverlay: {
    // RNW Pressable이 기본으로 붙이는 cursor:pointer를 상쇄 (래퍼일 뿐 버튼이 아님)
    cursor: "auto",
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  zoomImageWrapper: {
    // RNW Pressable이 기본으로 붙이는 cursor:pointer를 상쇄 (래퍼일 뿐 버튼이 아님)
    cursor: "auto",
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
