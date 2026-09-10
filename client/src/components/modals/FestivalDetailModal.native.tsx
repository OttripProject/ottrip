import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import MiniMapView from "@/ui/components/MiniMapView";
import { locationsApi, manualPlaceId } from "@/services/locations";
import { ItineraryCategory } from "@/types/itinerary";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { FestivalItem, TourismDetail } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
import CloseIcon from "../../../assets/mobile_close.svg";
import LocationIcon from "../../../assets/mobile_location.svg";
import TimeIcon from "../../../assets/week_bar_time.svg";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import WonIcon from "../../../assets/won.svg";

const LCLSSYSTM2_MAP: Record<string, { label: string; bg: string; color: string }> = {
  EV01: { label: "축제", bg: colors.festivalBg, color: colors.festivalText },
  EV02: { label: "공연", bg: "#FDEAF9", color: colors.categoryActivity },
  EV03: { label: "행사", bg: colors.accommodationBg, color: colors.categoryMeal },
};
const DEFAULT_BADGE = { label: "축제", bg: colors.festivalBg, color: colors.festivalText };

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
  const [detail, setDetail] = useState<TourismDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoWidth, setPhotoWidth] = useState(0);
  const [singleAspectRatio, setSingleAspectRatio] = useState<number | null>(null);

  const allImages = useMemo(() => {
    const main = detail?.imageUrl ?? item?.imageUrl ?? null;
    const extras = (detail?.images ?? []).filter(u => u !== main);
    return main ? [main, ...extras] : extras;
  }, [detail, item?.imageUrl]);

  const isSingle = allImages.length === 1;

  useEffect(() => {
    if (!isSingle) { setSingleAspectRatio(null); return; }
    Image.getSize(
      allImages[0],
      (w, h) => { if (w > 0 && h > 0) setSingleAspectRatio(w / h); },
      () => setSingleAspectRatio(4 / 3),
    );
  }, [isSingle, allImages[0]]);

  useEffect(() => {
    if (!item || !visible) {
      setDetail(null);
      setOverviewExpanded(false);
      setProgramExpanded(false);
      setPhotoIndex(0);
      setSingleAspectRatio(null);
      return;
    }
    setLoading(true);
    tourismApi
      .getTourismDetail({ contentId: item.contentId, contentTypeId: item.contentTypeId ?? "15" })
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item?.contentId, visible]);

  const handleAddToItinerary = async () => {
    if (!onAddToItinerary || !item) return;
    const title = detail?.title ?? item.title;
    const address = detail?.address ?? item.address;
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
        address: address ?? undefined,
        hasCoords: !!coords,
      });
      locationId = loc.id;
    } catch {}
    onAddToItinerary({
      title,
      description: detail?.overview ?? undefined,
      location: address ?? title,
      locationId,
      category: ItineraryCategory.SIGHTSEEING,
      matchedDate: item.matchedDate ?? undefined,
      locationLat: coords?.lat,
      locationLng: coords?.lng,
      eventStartDate: item.eventStartDate ?? undefined,
      eventEndDate: item.eventEndDate ?? undefined,
      playtime: detail?.playtime ?? undefined,
    });
    onClose();
  };

  if (!item) return null;

  const badge = LCLSSYSTM2_MAP[item.lclsSystm2 ?? ""] ?? DEFAULT_BADGE;
  const mapCoords =
    detail?.mapx && detail?.mapy
      ? { lat: detail.mapy, lng: detail.mapx }
      : item.mapx && item.mapy
        ? { lat: item.mapy, lng: item.mapx }
        : null;

  const period = (() => {
    if (detail?.eventdate) return detail.eventdate;
    const s = fmtDate(item.eventStartDate);
    const e = fmtDate(item.eventEndDate);
    if (s && e) return `${s} – ${e}`;
    return s || e || null;
  })();

  const iconRows: { label: string; value: string; icon: "calendar" | "clock" | "won" }[] = [];
  if (period) iconRows.push({ label: "행사기간", value: period, icon: "calendar" });
  if (detail?.playtime) iconRows.push({ label: "행사시간", value: detail.playtime, icon: "clock" });
  if (detail?.usetimefestival) iconRows.push({ label: "이용요금", value: detail.usetimefestival, icon: "won" });

  const tableRows: { label: string; value: string }[] = [];
  if (detail?.eventplace) tableRows.push({ label: "행사장소", value: detail.eventplace });
  const addr = detail?.address ?? item.address;
  if (addr) tableRows.push({ label: "주소", value: addr });
  if (detail?.agelimit) tableRows.push({ label: "관람연령", value: detail.agelimit });

  const infoRows: { label: string; value: string }[] = [];
  if (detail?.sponsor1) infoRows.push({ label: "주최", value: detail.sponsor1 });
  if (detail?.sponsor2) infoRows.push({ label: "주관", value: detail.sponsor2 });
  const contact = detail?.tel || detail?.infocenter;
  if (contact) infoRows.push({ label: "문의", value: contact });

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
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Pressable style={styles.actionButton} onPress={onClose} hitSlop={8}>
            <CloseIcon width={20} height={20} color={colors.gray600} />
          </Pressable>
        </View>

        {/* 제목 + 주소 */}
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{detail?.title ?? item.title}</Text>
          {addr && (
            <View style={styles.addressRow}>
              <LocationIcon width={12} height={12} color={colors.gray500} />
              <Text style={styles.metaText}>{addr}</Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* 이미지 갤러리 */}
        {allImages.length > 0 && (() => {
          const galleryHeight = isSingle && singleAspectRatio && photoWidth > 0
            ? photoWidth / singleAspectRatio
            : 180;
          return (
          <View
            style={[styles.gallery, { height: galleryHeight }]}
            onLayout={e => setPhotoWidth(e.nativeEvent.layout.width)}
          >
            {photoWidth > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / photoWidth);
                  setPhotoIndex(idx);
                }}
              >
                {allImages.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={[styles.galleryImage, { width: photoWidth, height: galleryHeight }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}
            {allImages.length > 1 && (
              <View style={styles.dotRow}>
                {allImages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
          );
        })()}

        {/* 아이콘 행 */}
        {iconRows.length > 0 && (
          <View style={styles.iconRowContainer}>
            {iconRows.map((row, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconBox}>
                  {row.icon === "calendar" ? (
                    <CalendarIcon width={20} height={20} color={colors.primary} />
                  ) : row.icon === "clock" ? (
                    <TimeIcon width={20} height={20} color={colors.primary} />
                  ) : (
                    <WonIcon width={20} height={20} color={colors.primary} />
                  )}
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

        {/* 프로그램 */}
        {!loading && detail?.program && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>프로그램</Text>
            <Text style={styles.overviewText} numberOfLines={programExpanded ? undefined : 3}>
              {detail.program}
            </Text>
            <Pressable onPress={() => setProgramExpanded(p => !p)}>
              <Text style={styles.expandBtn}>{programExpanded ? "접기" : "더보기"}</Text>
            </Pressable>
          </View>
        )}

        {/* 장소 */}
        {!loading && (mapCoords || tableRows.length > 0) && (
          <View style={styles.placeSection}>
            <Text style={styles.sectionTitle}>장소</Text>
            {mapCoords && (
              <MiniMapView latitude={mapCoords.lat} longitude={mapCoords.lng} name={item.title} />
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

        {/* 관람 정보 */}
        {!loading && (infoRows.length > 0 || detail?.homepage) && (
          <View style={styles.placeSection}>
            <Text style={styles.sectionTitle}>관람 정보</Text>
            <View style={styles.table}>
              {infoRows.map((row, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{row.label}</Text>
                  {row.label === "문의" ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${row.value}`)}>
                      <Text style={[styles.tableValue, styles.link]}>{row.value}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.tableValue}>{row.value}</Text>
                  )}
                </View>
              ))}
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
        {!loading && detail && <Text style={styles.attribution}>출처: ⓒ한국관광공사</Text>}
      </ScrollView>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.addButton, (loading || !detail) && styles.addButtonDisabled]}
          onPress={handleAddToItinerary}
          disabled={loading || !detail}
        >
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
  badgeText: { fontSize: 12, fontWeight: "600" } as any,
  title: {
    ...textStyles.h3,
    color: colors.gray900,
  },
  titleGroup: { gap: spacing.xs },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    ...textStyles.body5,
    color: colors.gray500,
    flex: 1,
  },
  loadingRow: { alignItems: "center", paddingVertical: spacing.lg },
  gallery: {
    height: 180,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.gray200,
  },
  galleryImage: {
    height: 180,
  },
  dotRow: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 14,
    borderRadius: 3,
  },
  iconRowContainer: { gap: spacing.sm },
  iconRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: "rgb(234, 241, 254)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  iconRowTextCol: { flex: 1, justifyContent: "center", gap: 2 },
  iconRowLabel: { ...textStyles.body5, color: colors.gray600 },
  iconRowValue: { ...textStyles.body4, color: colors.gray900 },
  sectionTitle: { ...textStyles.h8, color: colors.gray900 },
  overviewSection: { gap: spacing.xs },
  overviewText: { ...textStyles.body5, color: colors.gray700, lineHeight: 20 },
  expandBtn: { ...textStyles.body5, color: colors.primary, marginTop: 2 },
  placeSection: { gap: spacing.sm },
  table: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  tableValue: { ...textStyles.body5, color: colors.gray700, flex: 1 },
  link: { color: colors.primary, textDecorationLine: "underline" },
  attribution: {
    ...textStyles.body6,
    color: colors.gray500,
    textAlign: "right",
  } as any,
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  addButton: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { ...textStyles.h5, color: colors.white },
});
