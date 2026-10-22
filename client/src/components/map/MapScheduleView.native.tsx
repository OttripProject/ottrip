import MapScheduleSheet, {
  type MapStop,
  getStopLabel,
} from "@/components/map/MapScheduleSheet.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import type { Accommodation, Itinerary, Location } from "@/types/api";
import {
  ItineraryCategory,
  itineraryCategoryColors,
  itineraryCategoryLabels,
  itineraryCategoryTints,
} from "@/types/itinerary";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatTime } from "@/utils/dateUtils";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackIcon from "../../../assets/left_arrow.svg";
import FitIcon from "../../../assets/map_fit.svg";
import RouteIcon from "../../../assets/map_route.svg";
import DropdownIcon from "../../../assets/mobile_dropdown.svg";

interface MapScheduleViewProps {
  onClose: () => void;
  onPlanPress: () => void;
}

const CONTROL_SIZE = 44;
const EXPANDED_RATIO = 0.47;
const MARKER_BORDER = 2;
const MARKER_CONTENT = 26;
const MARKER_SELECTED_CONTENT = 32;
const DASH_PATTERN_PX = [6, 4];
const DASH_PERIOD_PX = DASH_PATTERN_PX[0] + DASH_PATTERN_PX[1];
const MAX_DASH_SPANS = 2000;
const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEGREE = 111320;

type Coordinate = { latitude: number; longitude: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const getDistance = (a: Coordinate, b: Coordinate) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

const getPathLength = (coordinates: Coordinate[]) =>
  coordinates
    .slice(1)
    .reduce((sum, point, i) => sum + getDistance(coordinates[i], point), 0);

const toCoordinate = (location?: Location) =>
  location?.hasCoords && (location.latitude || location.longitude)
    ? { latitude: location.latitude, longitude: location.longitude }
    : undefined;

const toPadding = (value: number) =>
  Platform.OS === "android"
    ? PixelRatio.getPixelSizeForLayoutSize(value)
    : value;

const toItineraryStop = (
  itinerary: Itinerary,
  dayIndex: number,
): Omit<MapStop, "order"> => {
  const category = itinerary.category ?? ItineraryCategory.ETC;
  return {
    key: `itinerary-${itinerary.id}`,
    dayIndex,
    title: itinerary.title,
    startTime: formatTime(itinerary.startTime),
    endTime: formatTime(itinerary.endTime),
    categoryLabel: itineraryCategoryLabels[category],
    color: itineraryCategoryColors[category],
    tint: itineraryCategoryTints[category],
    placeName: itinerary.location?.name,
    coordinate: toCoordinate(itinerary.location),
  };
};

const toAccommodationStop = (
  accommodation: Accommodation,
  dayIndex: number,
  dateStr: string,
): Omit<MapStop, "order"> => ({
  key: `accommodation-${accommodation.id}-${dateStr}`,
  dayIndex,
  title: accommodation.name,
  startTime: formatTime(accommodation.checkinTime),
  categoryLabel: "숙박",
  color: colors.accommodationText,
  tint: colors.accommodationBg,
  placeName: accommodation.location?.name,
  coordinate: toCoordinate(accommodation.location),
});

const buildDayStops = (
  date: Dayjs,
  dayIndex: number,
  itineraries: Itinerary[],
  accommodations: Accommodation[],
): MapStop[] => {
  const dateStr = date.format("YYYY-MM-DD");
  const items = [
    ...itineraries
      .filter(it => dayjs(it.itineraryDate).format("YYYY-MM-DD") === dateStr)
      .map(it => toItineraryStop(it, dayIndex)),
    ...accommodations
      .filter(
        ac =>
          dayjs(ac.checkinDate).format("YYYY-MM-DD") <= dateStr &&
          dayjs(ac.checkoutDate).format("YYYY-MM-DD") >= dateStr,
      )
      .map(ac => toAccommodationStop(ac, dayIndex, dateStr)),
  ];
  return items
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((item, i) => ({ ...item, order: i + 1 }));
};

function StopMarker({
  stop,
  label,
  selected,
  onPress,
}: {
  stop: MapStop & { coordinate: { latitude: number; longitude: number } };
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={stop.coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 1 : 0}
      onPress={e => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={selected && styles.markerRing}>
        <View
          style={[
            styles.marker,
            selected && styles.markerSelected,
            { backgroundColor: stop.color },
          ]}
        >
          <Text style={styles.markerText}>{label}</Text>
        </View>
      </View>
    </Marker>
  );
}

export default function MapScheduleView({
  onClose,
  onPlanPress,
}: MapScheduleViewProps) {
  const insets = useSafeAreaInsets();
  const { selectedPlan } = useSelectedPlan();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  const mapRef = useRef<MapView>(null);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [routeVisible, setRouteVisible] = useState(true);
  const [mapWidth, setMapWidth] = useState(0);
  const [metersPerPixel, setMetersPerPixel] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [containerHeight, setContainerHeight] = useState(0);

  const plan = planData.plan ?? selectedPlan;
  const expandedHeight = containerHeight * EXPANDED_RATIO;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);

  const dates = useMemo(() => {
    if (!plan) return [];
    const start = dayjs(plan.startDate);
    const length = dayjs(plan.endDate).diff(start, "day") + 1;
    return Array.from({ length: Math.max(length, 0) }, (_, i) =>
      start.add(i, "day"),
    );
  }, [plan]);

  const allStops = useMemo(
    () =>
      dates.flatMap((date, index) =>
        buildDayStops(
          date,
          index,
          planData.itineraries ?? [],
          planData.accommodations ?? [],
        ),
      ),
    [dates, planData.itineraries, planData.accommodations],
  );

  const stops = useMemo(
    () =>
      dayIndex === null
        ? allStops
        : allStops.filter(stop => stop.dayIndex === dayIndex),
    [allStops, dayIndex],
  );

  const routes = useMemo(() => {
    const byDay = new Map<number, { latitude: number; longitude: number }[]>();
    for (const stop of stops) {
      if (!stop.coordinate) continue;
      byDay.set(stop.dayIndex, [
        ...(byDay.get(stop.dayIndex) ?? []),
        stop.coordinate,
      ]);
    }
    return [...byDay.entries()].filter(([, coords]) => coords.length > 1);
  }, [stops]);

  const dashPattern = useMemo(() => {
    if (Platform.OS !== "ios") return DASH_PATTERN_PX;
    if (!metersPerPixel) return null;
    const totalLength = routes.reduce(
      (sum, [, coordinates]) => sum + getPathLength(coordinates),
      0,
    );
    const period = Math.max(
      DASH_PERIOD_PX * metersPerPixel,
      (totalLength * DASH_PATTERN_PX.length) / MAX_DASH_SPANS,
    );
    return DASH_PATTERN_PX.map(px => (px / DASH_PERIOD_PX) * period);
  }, [routes, metersPerPixel]);

  const fitAll = useCallback(() => {
    const coordinates = stops.flatMap(stop =>
      stop.coordinate ? [stop.coordinate] : [],
    );
    if (coordinates.length === 0 || expandedHeight === 0) return;
    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: toPadding(CONTROL_SIZE * 2 + spacing.xl),
        right: toPadding(CONTROL_SIZE + spacing.xl),
        bottom: toPadding(expandedHeight + spacing.xl),
        left: toPadding(spacing.xl),
      },
      animated: true,
    });
  }, [stops, expandedHeight]);

  useEffect(() => {
    fitAll();
  }, [fitAll]);

  const focusStop = (stop: MapStop) => {
    setSelectedKey(stop.key);
    if (!stop.coordinate) return;
    mapRef.current?.animateCamera(
      { center: stop.coordinate, zoom: 15 },
      { duration: 300 },
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      onLayout={e => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <View
        style={styles.mapArea}
        onLayout={e => setMapWidth(e.nativeEvent.layout.width)}
      >
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          toolbarEnabled={false}
          onPress={() => setSelectedKey(null)}
          onRegionChangeComplete={region => {
            if (mapWidth === 0) return;
            setMetersPerPixel(
              (region.longitudeDelta *
                METERS_PER_DEGREE *
                Math.cos(toRadians(region.latitude))) /
                mapWidth,
            );
          }}
        >
          {routeVisible &&
            dashPattern &&
            routes.map(([day, coordinates]) => (
              <Polyline
                key={day}
                coordinates={coordinates}
                strokeColor={colors.mapRoute}
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
                lineDashPattern={dashPattern}
              />
            ))}
          {stops.map(stop => {
            if (!stop.coordinate) return null;
            const label = getStopLabel(stop, dayIndex);
            const selected = stop.key === selectedKey;
            return (
              <StopMarker
                key={`${stop.key}-${label}-${selected}`}
                stop={{ ...stop, coordinate: stop.coordinate }}
                label={label}
                selected={selected}
                onPress={() => {
                  setSelectedKey(stop.key);
                  setExpanded(true);
                }}
              />
            );
          })}
        </MapView>

        <View style={styles.topBar}>
          <Pressable
            style={styles.circleButton}
            onPress={onClose}
            accessibilityLabel="일정으로"
          >
            <BackIcon width={20} height={20} color={colors.paletteInk} />
          </Pressable>
          <Pressable style={styles.planPill} onPress={onPlanPress}>
            <Text style={styles.planTitle} numberOfLines={1}>
              {plan?.title || "여행 선택"}
            </Text>
            <DropdownIcon width={16} height={16} color={colors.paletteFg2} />
          </Pressable>
        </View>

        <View style={styles.sideControls}>
          <Pressable
            style={[styles.circleButton, routeVisible && styles.circleActive]}
            onPress={() => setRouteVisible(visible => !visible)}
            accessibilityLabel="이동 경로"
            accessibilityState={{ selected: routeVisible }}
          >
            <RouteIcon
              width={20}
              height={20}
              color={routeVisible ? colors.white : colors.paletteInk}
            />
          </Pressable>
          <Pressable
            style={styles.circleButton}
            onPress={fitAll}
            accessibilityLabel="전체 보기"
          >
            <FitIcon width={20} height={20} color={colors.paletteInk} />
          </Pressable>
        </View>

        {expandedHeight > 0 && (
          <MapScheduleSheet
            dayCount={dates.length}
            dayIndex={dayIndex}
            onDayChange={day => {
              setDayIndex(day);
              setSelectedKey(null);
            }}
            stops={stops}
            selectedKey={selectedKey}
            onStopPress={focusStop}
            expandedHeight={expandedHeight}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.white,
  },
  mapArea: {
    flex: 1,
    overflow: "hidden",
  },
  topBar: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  circleButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  circleActive: {
    backgroundColor: colors.paletteInk,
  },
  planPill: {
    flexShrink: 1,
    height: CONTROL_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  planTitle: {
    ...textStyles.h6,
    flexShrink: 1,
    color: colors.paletteInk,
  },
  sideControls: {
    position: "absolute",
    top: spacing.sm + CONTROL_SIZE + spacing.md,
    right: spacing.lg,
    gap: spacing.sm,
  },
  marker: {
    minWidth: MARKER_CONTENT + (spacing.sm + MARKER_BORDER) * 2,
    height: MARKER_CONTENT + MARKER_BORDER * 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: MARKER_BORDER,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  markerRing: {
    borderWidth: 3,
    borderColor: colors.mapMarkerRing,
    borderRadius: radii.pill,
  },
  markerSelected: {
    minWidth: MARKER_SELECTED_CONTENT + (spacing.sm + MARKER_BORDER) * 2,
    height: MARKER_SELECTED_CONTENT + MARKER_BORDER * 2,
  },
  markerText: {
    ...textStyles.h8,
    lineHeight: 16,
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
});
