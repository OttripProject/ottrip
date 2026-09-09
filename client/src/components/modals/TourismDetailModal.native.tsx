import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import MiniMapView from "@/ui/components/MiniMapView";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
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

function getKeyFields(detail: TourismDetail): { label: string; value: string }[] {
  const r = (label: string, v: string | null | undefined) =>
    v ? { label, value: v } : null;
  const t = detail.contentTypeId;
  const rows: ({ label: string; value: string } | null)[] = [];

  if (t === "12" || t === "관광지") {
    rows.push(r("이용시간", detail.usetime), r("휴관일", detail.restdate), r("주차", detail.parking));
  } else if (t === "14" || t === "문화시설") {
    rows.push(r("이용시간", detail.usetimeculture), r("휴관일", detail.restdateculture), r("이용요금", detail.usefee), r("주차", detail.parkingculture));
  } else if (t === "15" || t === "축제·공연") {
    rows.push(r("행사기간", detail.eventdate), r("행사장소", detail.eventplace), r("공연시간", detail.playtime), r("이용요금", detail.usetimefestival));
  } else if (t === "25" || t === "여행코스") {
    rows.push(r("총거리", detail.distance), r("소요시간", detail.taketime), r("코스", detail.schedule));
  } else if (t === "28" || t === "레포츠") {
    rows.push(r("이용시간", detail.usetimeleports), r("휴관일", detail.restdateleports), r("이용요금", detail.usefeeleports));
  } else if (t === "38" || t === "쇼핑") {
    rows.push(r("영업시간", detail.opentime), r("휴무일", detail.restdateshopping), r("판매품목", detail.saleitem));
  } else if (t === "39" || t === "음식점") {
    rows.push(r("영업시간", detail.opentimefood), r("휴무일", detail.restdatefood), r("대표메뉴", detail.firstmenu));
  }

  return rows.filter(Boolean) as { label: string; value: string }[];
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

export default function TourismDetailModal({ visible, onClose, item }: Props) {
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, item?.contentId]);

  if (!item) return null;

  const badge = BADGE_COLORS[item.contentTypeId] ?? DEFAULT_BADGE;
  const hasMap = !!detail?.mapx && !!detail?.mapy;
  const keyFields = detail ? getKeyFields(detail) : [];

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.75}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 배지 + 제목 */}
        <View style={styles.titleRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {item.contentTypeId}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>

        {/* 주소 */}
        {(detail?.address ?? item.address) && (
          <Text style={styles.address}>{detail?.address ?? item.address}</Text>
        )}

        {/* 로딩 */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* 지도 */}
        {hasMap && (
          <MiniMapView
            latitude={detail!.mapy!}
            longitude={detail!.mapx!}
            name={item.title}
          />
        )}

        {/* 카테고리별 주요 정보 */}
        {keyFields.length > 0 && (
          <View style={styles.fieldsSection}>
            {keyFields.map((field, i) => (
              <View key={i} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 전화번호 */}
        {detail?.tel && (
          <Pressable
            style={styles.telRow}
            onPress={() => Linking.openURL(`tel:${detail.tel}`)}
          >
            <Text style={styles.telLabel}>전화</Text>
            <Text style={styles.telValue}>{detail.tel}</Text>
          </Pressable>
        )}

        {/* 소개 */}
        {detail?.overview && (
          <View style={styles.overviewSection}>
            <Text style={styles.overviewLabel}>소개</Text>
            <Text
              style={styles.overviewText}
              numberOfLines={overviewExpanded ? undefined : 4}
            >
              {detail.overview}
            </Text>
            {detail.overview.length > 150 && (
              <Pressable onPress={() => setOverviewExpanded(p => !p)}>
                <Text style={styles.overviewToggle}>
                  {overviewExpanded ? "접기" : "더보기"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 32,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    ...textStyles.h4,
    color: colors.gray900,
    marginTop: 6,
  },
  address: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  loadingRow: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  fieldsSection: {
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  fieldLabel: {
    ...textStyles.body5,
    color: colors.gray600,
    width: 72,
    flexShrink: 0,
  },
  fieldValue: {
    ...textStyles.body5,
    color: colors.gray900,
    flex: 1,
  },
  telRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  telLabel: {
    ...textStyles.body5,
    color: colors.gray600,
    width: 72,
  },
  telValue: {
    ...textStyles.body5,
    color: colors.primary,
    flex: 1,
  },
  overviewSection: {
    gap: spacing.xs,
  },
  overviewLabel: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  overviewText: {
    ...textStyles.body5,
    color: colors.gray800,
    lineHeight: 20,
  },
  overviewToggle: {
    ...textStyles.body5,
    color: colors.primary,
    marginTop: 2,
  },
});
