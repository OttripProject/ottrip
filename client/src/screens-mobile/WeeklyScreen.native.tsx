import axios from "axios";

import AddPlanModal from "@/components/modals/mobile/AddPlanModal.native";
import PlanLoadingOverlay from "@/components/PlanLoadingOverlay.native";
import AddScheduleMethodModal from "@/components/modals/mobile/AddScheduleMethodModal.native";
import AddScheduleModal from "@/components/modals/mobile/AddScheduleModal.native";
import AddScheduleWithAiModal from "@/components/modals/mobile/AddScheduleWithAiModal.native";
import PlanSelectModal from "@/components/modals/mobile/PlanSelectModal.native";
import ProfileModal from "@/components/modals/mobile/ProfileModal.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import type {
  Accommodation,
  FlightRead,
  FlightSegmentReadDto,
  Itinerary,
  Plan,
} from "@/types/api";
import { itineraryCategoryColors } from "@/types/itinerary";
import { getAirportLabel } from "@/utils/airportList";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { shadows } from "@/ui/tokens/shadows";
import { textStyles } from "@/ui/tokens/typography";
import {
  convertUTCToLocalTime,
  formatTime,
  getWeekCalendar,
} from "@/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AddScheduleFlow = "closed" | "method" | "direct" | "ai";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const toEasing = (cubicBezier: string) => {
  const [x1, y1, x2, y2] = (cubicBezier.match(/[\d.]+/g) ?? []).map(Number);
  return Easing.bezier(x1, y1, x2, y2);
};
const jellyEasing = toEasing(motion.easing.ease);
const JELLY_STEPS = [0, 0.3, 0.55, 0.75, 1];
const DAY_TABS = ["일정", "체크리스트", "숙박·항공"] as const;
const PRESSED_SCALE = 0.96;
import WeeklyChecklistCard from "@/components/cards/WeeklyChecklistCard.native";
import AccommodationDetailModal from "@/components/modals/mobile/AccommodationDetailModal.native";
import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import FlightDetailModal from "@/components/modals/mobile/FlightDetailModal.native";
import FlightEditModal from "@/components/modals/mobile/FlightEditModal.native";
import ItineraryDetailModal from "@/components/modals/mobile/ItineraryDetailModal.native";
import ItineraryEditModal, { type ItineraryEditPrefill } from "@/components/modals/mobile/ItineraryEditModal.native";
import TourismDetailModal from "@/components/modals/TourismDetailModal";
import TravelInfoModal from "@/components/modals/mobile/TravelInfoModal.native";
import { useMe } from "@/hooks/useMe";
import { accommodationsApi } from "@/services/accommodations";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import CalendarModal from "@/ui/components/CalendarModal.native";
import { extendPlanIfNeeded } from "@/utils/extendPlanIfNeeded";
import { collectPlanItemDates, shrinkPlanIfNeeded } from "@/utils/shrinkPlanIfNeeded";
import { guestPrompt } from "@/utils/guestPrompt";
import FlightIcon from "../../assets/airplane.svg";
import LocationIcon from "../../assets/mobile_location.svg";
import LeftArrowIcon from "../../assets/left_arrow.svg";
import AccommodationIcon from "../../assets/mobile_accomodation.svg";
import CalendarIcon from "../../assets/mobile_calendar_black.svg";
import CautionIcon from "../../assets/mobile_caution.svg";
import DotsIcon from "../../assets/dots.svg";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import PlusIcon from "../../assets/mobile_plus2.svg";
import RightArrowIcon from "../../assets/right_arrow.svg";

function PulseDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const half = motion.duration.pulse / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseDot, { opacity }]} />;
}

function DayTabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number, duration: number, easing: string) => {
    Animated.timing(scale, {
      toValue,
      duration,
      easing: toEasing(easing),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      style={[styles.dayTab, isActive && styles.dayTabActive]}
      onPress={onPress}
      onPressIn={() =>
        animateScale(PRESSED_SCALE, motion.duration.press, motion.easing.ease)
      }
      onPressOut={() =>
        animateScale(1, motion.duration.slow, motion.easing.spring)
      }
    >
      <Animated.Text
        style={[
          styles.dayTabText,
          isActive && styles.dayTabTextActive,
          { transform: [{ scale }] },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export default function WeeklyScreen() {
  const insets = useSafeAreaInsets();
  const { data: me } = useMe();
  const plansQuery = usePlansQuery();
  const queryClient = useQueryClient();
  const { selectedPlan, setSelectedPlan } = useSelectedPlan();
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [addScheduleFlow, setAddScheduleFlow] =
    useState<AddScheduleFlow>("closed");
  const [travelInfoModalVisible, setTravelInfoModalVisible] = useState(false);
  const [weekBaseDate, setWeekBaseDate] = useState<dayjs.Dayjs | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showItineraryDetail, setShowItineraryDetail] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(
    null,
  );
  const [showItineraryEdit, setShowItineraryEdit] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [itineraryPrefill, setItineraryPrefill] = useState<ItineraryEditPrefill | null>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<import("@/services/tourism").NearbyAttraction | null>(null);
  const [tourismDetailVisible, setTourismDetailVisible] = useState(false);
  const reopenDetailAfterTourismRef = useRef(true);
  const [showFlightDetail, setShowFlightDetail] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightRead | null>(null);
  const [selectedFlightSegment, setSelectedFlightSegment] =
    useState<FlightSegmentReadDto | null>(null);
  const [showFlightEdit, setShowFlightEdit] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightRead | null>(null);
  const [selectedAccommodation, setSelectedAccommodation] =
    useState<Accommodation | null>(null);
  const [showAccommodationDetail, setShowAccommodationDetail] = useState(false);
  const [showAccommodationEdit, setShowAccommodationEdit] = useState(false);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);
  useEffect(() => {
    return guestPrompt.registerBeforeSignUpNavigation(() => {
      setProfileModalVisible(false);
      setTravelInfoModalVisible(false);
      setShowItineraryEdit(false);
      setShowAccommodationEdit(false);
      setShowFlightEdit(false);
      setAddScheduleFlow("closed");
    });
  }, []);

  const planData = usePlanDataQuery(selectedPlan?.publicId || null);

  const resolvedWeekBaseDate = weekBaseDate ?? dayjs();

  const weekCalendar = useMemo(() => {
    return getWeekCalendar(resolvedWeekBaseDate);
  }, [resolvedWeekBaseDate]);

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(() => dayjs());
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };
  const jellyProgress = useRef(new Animated.Value(1)).current;
  const selectedDateKey = selectedDate.format("YYYY-MM-DD");
  const isFirstSelectionRef = useRef(true);

  useEffect(() => {
    if (isFirstSelectionRef.current) {
      isFirstSelectionRef.current = false;
      return;
    }
    jellyProgress.setValue(0);
    Animated.timing(jellyProgress, {
      toValue: 1,
      duration: motion.duration.jelly,
      easing: jellyEasing,
      useNativeDriver: true,
    }).start();
  }, [selectedDateKey, jellyProgress]);

  const jellyStyle = {
    transform: [
      {
        scaleX: jellyProgress.interpolate({
          inputRange: JELLY_STEPS,
          outputRange: [1, 1.06, 0.97, 1.02, 1],
        }),
      },
      {
        scaleY: jellyProgress.interpolate({
          inputRange: JELLY_STEPS,
          outputRange: [1, 0.94, 1.03, 0.98, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    if (selectedPlan) {
      setSelectedDate(dayjs());
      setWeekBaseDate(dayjs());
    }
  }, [selectedPlan?.id]);

  const handlePrevWeek = () => {
    const newBase = resolvedWeekBaseDate.subtract(7, "day");
    setWeekBaseDate(newBase);
    const newWeek = getWeekCalendar(newBase);
    setSelectedDate(newWeek[6].fullDate);
  };

  const handleNextWeek = () => {
    const newBase = resolvedWeekBaseDate.add(7, "day");
    setWeekBaseDate(newBase);
    const newWeek = getWeekCalendar(newBase);
    setSelectedDate(newWeek[0].fullDate);
  };

  const handleCalendarDayPress = (day: { dateString: string }) => {
    const d = dayjs(day.dateString);
    setSelectedDate(d);
    setWeekBaseDate(d);
    setCalendarModalVisible(false);
  };

  const selectedDateDisplay = useMemo(() => {
    const weekdays = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ];
    return {
      weekday: weekdays[selectedDate.day()],
    };
  }, [selectedDate]);

  const selectedDateItineraries = useMemo(() => {
    if (!planData.itineraries) return [];
    return planData.itineraries.filter((itinerary: Itinerary) =>
      dayjs(itinerary.itineraryDate).isSame(selectedDate, "day"),
    );
  }, [planData.itineraries, selectedDate]);

  const selectedDateSchedules = useMemo(() => {
    const schedules: Array<{
      type: "itinerary" | "flight" | "accommodation";
      id: number | string;
      time: string;
      endTime?: string;
      data: Itinerary | FlightRead | Accommodation;
      segment?: any;
      segmentIndex?: number;
    }> = [];

    selectedDateItineraries.forEach((itinerary: Itinerary) => {
      schedules.push({
        type: "itinerary",
        id: itinerary.id,
        time: formatTime(itinerary.startTime || "00:00"),
        endTime: formatTime(itinerary.endTime || "00:00"),
        data: itinerary,
      });
    });

    if (planData.flights) {
      planData.flights.forEach((flight: FlightRead) => {
        if (flight.flightSegments?.length) {
          const sortedSegments = [...flight.flightSegments].sort(
            (a, b) => a.order - b.order,
          );
          sortedSegments.forEach((segment, index) => {
            const departureTime = dayjs(segment.departureTime);
            if (departureTime.isSame(selectedDate, "day")) {
              schedules.push({
                type: "flight",
                id: `${flight.id}-segment-${segment.id}`,
                time: convertUTCToLocalTime(segment.departureTime),
                endTime: convertUTCToLocalTime(segment.arrivalTime),
                data: flight,
                segment,
                segmentIndex: index,
              });
            }
          });
        }
      });
    }

    if (planData.accommodations) {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      planData.accommodations.forEach((accommodation: Accommodation) => {
        const checkinDate = dayjs(accommodation.checkinDate).format(
          "YYYY-MM-DD",
        );
        const checkoutDate = dayjs(accommodation.checkoutDate).format(
          "YYYY-MM-DD",
        );
        if (checkinDate <= dateStr && checkoutDate >= dateStr) {
          schedules.push({
            type: "accommodation",
            id: accommodation.id,
            time: formatTime(accommodation.checkinTime || "00:00"),
            data: accommodation,
          });
        }
      });
    }

    return schedules.sort((a, b) => a.time.localeCompare(b.time));
  }, [
    selectedDateItineraries,
    planData.flights,
    planData.accommodations,
    selectedDate,
  ]);

  const timelineItems = useMemo(
    () => selectedDateSchedules.filter(item => item.type !== "accommodation"),
    [selectedDateSchedules],
  );

  const timelineRows = useMemo(() => {
    const dateStr = selectedDate.format("YYYY-MM-DD");
    return timelineItems.map(schedule => {
      const isFlight = schedule.type === "flight" && !!schedule.segment;
      const itinerary = schedule.data as Itinerary;
      let showNextDay = false;
      if (isFlight) {
        showNextDay =
          dayjs(schedule.segment.departureTime).format("YYYY-MM-DD") !==
          dayjs(schedule.segment.arrivalTime).format("YYYY-MM-DD");
      } else if (schedule.endTime && schedule.time) {
        showNextDay = schedule.endTime < schedule.time;
      }
      const start = dayjs(`${dateStr} ${schedule.time}`);
      const endBase = dayjs(`${dateStr} ${schedule.endTime ?? schedule.time}`);
      return {
        schedule,
        isFlight,
        showNextDay,
        start,
        end: showNextDay ? endBase.add(1, "day") : endBase,
        title: isFlight
          ? `${schedule.segment.departureAirport} → ${schedule.segment.arrivalAirport}`
          : itinerary.title,
        subText: isFlight
          ? (getAirportLabel(schedule.segment.arrivalAirport) ??
            schedule.segment.arrivalAirport)
          : itinerary.location?.name,
        barColor: isFlight
          ? colors.categoryFlight
          : itinerary.category
            ? itineraryCategoryColors[itinerary.category]
            : colors.categoryEtc,
      };
    });
  }, [timelineItems, selectedDate]);

  const currentRows = useMemo(() => {
    const now = dayjs();
    if (!selectedDate.isSame(now, "day")) return [];
    return timelineRows.filter(
      row => !now.isBefore(row.start) && now.isBefore(row.end),
    );
  }, [timelineRows, selectedDate]);

  const openScheduleDetail = (row: (typeof timelineRows)[number]) => {
    if (row.isFlight) {
      setSelectedFlight(row.schedule.data as FlightRead);
      setSelectedFlightSegment(row.schedule.segment);
      setShowFlightDetail(true);
    } else {
      setSelectedItinerary(row.schedule.data as Itinerary);
      setShowItineraryDetail(true);
    }
  };

  const nextTimelineIndex = useMemo(() => {
    const now = dayjs();
    if (!selectedDate.isSame(now, "day")) return -1;
    const dateStr = selectedDate.format("YYYY-MM-DD");
    return timelineItems.findIndex(item =>
      now.isBefore(dayjs(`${dateStr} ${item.time}`)),
    );
  }, [timelineItems, selectedDate]);

  const scheduleCount = selectedDateSchedules.filter(
    s => s.type !== "accommodation",
  ).length;

  const selectedDateAccommodations = useMemo(
    () =>
      selectedDateSchedules
        .filter(s => s.type === "accommodation")
        .map(s => s.data as Accommodation),
    [selectedDateSchedules],
  );

  const selectedDateFlights = useMemo(
    () => selectedDateSchedules.filter(s => s.type === "flight"),
    [selectedDateSchedules],
  );

  const selectedDateSegment = useMemo(() => {
    const segments = planData.plan?.segments;
    if (!segments) return null;
    const dateStr = selectedDate.format("YYYY-MM-DD");
    return (
      segments.find(
        seg => seg.startDate <= dateStr && dateStr <= seg.endDate,
      ) ?? null
    );
  }, [planData.plan?.segments, selectedDate]);

  const datesWithItems = useMemo(() => {
    const set = new Set<string>();
    planData.itineraries?.forEach((item: Itinerary) => {
      if (item.itineraryDate)
        set.add(dayjs(item.itineraryDate).format("YYYY-MM-DD"));
    });
    planData.flights?.forEach((flight: FlightRead) => {
      flight.flightSegments?.forEach(seg => {
        if (seg.departureTime)
          set.add(dayjs(seg.departureTime).format("YYYY-MM-DD"));
      });
    });
    planData.accommodations?.forEach((acc: Accommodation) => {
      if (acc.checkinDate) set.add(dayjs(acc.checkinDate).format("YYYY-MM-DD"));
      if (acc.checkoutDate)
        set.add(dayjs(acc.checkoutDate).format("YYYY-MM-DD"));
    });
    return set;
  }, [planData.itineraries, planData.flights, planData.accommodations]);

  if (!plansQuery.isLoading && plansQuery.plans.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 만든 여행이 없어요</Text>
          <Text style={styles.emptySubtext}>
            여행을 먼저 생성한 후에{"\n"}그 안에 일정·항공·숙소를 추가할 수
            있어요{"\n"}오늘 탭에서 여행을 만들 수 있어요
          </Text>
        </View>
      </View>
    );
  }

  const renderRefreshControl = () => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          await plansQuery.fetchPlans();
          if (selectedPlan?.publicId) {
            await planData.fetchPlanData(selectedPlan.publicId);
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
          }
        } finally {
          setRefreshing(false);
        }
      }}
      tintColor={colors.white}
      colors={[colors.white]}
    />
  );

  const planMinMax = selectedPlan
    ? {
        minDate: selectedPlan.startDate,
        maxDate: selectedPlan.endDate,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.planSelector}
            onPress={() => setShowPlanSelector(true)}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedPlan?.title || "여행 선택"}
            </Text>
            {selectedPlan && (
              <Text style={styles.headerPeriod}>
                {dayjs(selectedPlan.startDate).format("M.D")} –{" "}
                {dayjs(selectedPlan.endDate).format("M.D")}
              </Text>
            )}
            <DropdownIcon width={15} height={15} color={colors.gray900} />
          </Pressable>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="지도로 일정 보기"
            >
              <LocationIcon width={20} height={20} color={colors.gray900} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="달력에서 날짜 선택"
              onPress={() => setCalendarModalVisible(true)}
            >
              <CalendarIcon width={20} height={20} color={colors.gray900} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="더보기"
              onPress={() => setProfileModalVisible(true)}
            >
              <DotsIcon width={20} height={20} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.dayTabsWrap}>
        <View style={styles.dayTabs}>
          {DAY_TABS.map((label, index) => {
            return (
              <DayTabButton
                key={label}
                label={label}
                isActive={activeTab === index}
                onPress={() => handleTabPress(index)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.weekSelector}>
        <Pressable
          style={styles.weekArrow}
          accessibilityLabel="이전 주"
          onPress={handlePrevWeek}
        >
          <LeftArrowIcon width={20} height={20} color={colors.paletteFg3} />
        </Pressable>
        <View style={styles.weekDays}>
          {weekCalendar.map(item => {
            const isSelected = selectedDate.isSame(item.fullDate, "day");
            const hasItems = datesWithItems.has(
              item.fullDate.format("YYYY-MM-DD"),
            );
            return (
              <AnimatedPressable
                key={`${item.year}-${item.month}-${item.date}`}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                  isSelected && jellyStyle,
                ]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    !hasItems && !isSelected && styles.dayDateEmpty,
                    isSelected && styles.dayDateSelected,
                  ]}
                >
                  {item.date}
                </Text>
                {hasItems && (
                  <View
                    style={[
                      styles.dateDot,
                      isSelected && styles.dateDotSelected,
                    ]}
                  />
                )}
              </AnimatedPressable>
            );
          })}
        </View>
        <Pressable
          style={styles.weekArrow}
          accessibilityLabel="다음 주"
          onPress={handleNextWeek}
        >
          <RightArrowIcon width={20} height={20} color={colors.paletteFg3} />
        </Pressable>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.dayPager}
        initialPage={0}
        onPageSelected={e => setActiveTab(e.nativeEvent.position)}
      >
        <ScrollView
          key="schedule"
          style={styles.scheduleList}
          contentContainerStyle={styles.scheduleContent}
          showsVerticalScrollIndicator={false}
          refreshControl={renderRefreshControl()}
        >
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleDateDay}>
              {selectedDate.format("M월 D일")}
            </Text>
            <Text style={styles.scheduleDateWeekday}>
              {selectedDateDisplay.weekday}
            </Text>
            {selectedDate.isSame(dayjs(), "day") && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>오늘</Text>
              </View>
            )}
            {scheduleCount > 0 && (
              <View style={styles.scheduleCountBadge}>
                <Text style={styles.scheduleCountText}>
                  {scheduleCount}개의 일정
                </Text>
              </View>
            )}
          </View>
          {scheduleCount === 0 && (
            <View style={styles.emptyScheduleContainer}>
              <CautionIcon width={24} height={24} color={colors.gray600} />
              <Text style={styles.emptyScheduleText}>
                등록된 일정이 없습니다.
              </Text>
            </View>
          )}
          {currentRows.map(row => (
            <Pressable
              key={row.schedule.id}
              style={styles.currentCard}
              onPress={() => openScheduleDetail(row)}
            >
              <View style={styles.currentHeader}>
                <PulseDot />
                <Text style={styles.currentLabel}>진행 중</Text>
                {row.schedule.endTime && (
                  <View style={styles.currentEndPill}>
                    <Text style={styles.currentEndText}>
                      {row.schedule.endTime} 종료
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.currentTitle} numberOfLines={1}>
                {row.title}
              </Text>
              {!!row.subText && (
                <View style={styles.currentSub}>
                  <LocationIcon
                    width={13}
                    height={13}
                    color={colors.paletteFg3}
                  />
                  <Text style={styles.currentSubText} numberOfLines={1}>
                    {row.subText}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
          {scheduleCount > 0 && (
            <View style={styles.listCard}>
              {timelineRows.map((row, index) => {
                const { schedule } = row;
                const now = dayjs();
                const isEnded =
                  selectedDate.isBefore(now, "day") ||
                  (selectedDate.isSame(now, "day") && !now.isBefore(row.end));
                const isNext = index === nextTimelineIndex;

                return (
                  <Pressable
                    key={schedule.id}
                    style={[styles.listRow, isEnded && styles.listRowEnded]}
                    onPress={() => openScheduleDetail(row)}
                  >
                    <View style={styles.listTime}>
                      <Text style={styles.listStartTime}>{schedule.time}</Text>
                      {schedule.endTime && (
                        <Text style={styles.listEndTime}>
                          {schedule.endTime}
                          {row.showNextDay && " +1"}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[styles.listBar, { backgroundColor: row.barColor }]}
                    />
                    <View
                      style={[
                        styles.listBody,
                        index > 0 && styles.listBodyDivider,
                      ]}
                    >
                      <View style={styles.listText}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {row.title}
                        </Text>
                        {!!row.subText && (
                          <View style={styles.listSub}>
                            <LocationIcon
                              width={12}
                              height={12}
                              color={colors.paletteFg3}
                            />
                            <Text style={styles.listSubText} numberOfLines={1}>
                              {row.subText}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isNext ? (
                        <View style={styles.listBadge}>
                          <Text style={styles.listBadgeText}>다음</Text>
                        </View>
                      ) : (
                        isEnded && (
                          <Text style={styles.listEndedText}>종료</Text>
                        )
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <ScrollView
          key="checklist"
          style={styles.scheduleList}
          contentContainerStyle={styles.scheduleContent}
          showsVerticalScrollIndicator={false}
          refreshControl={renderRefreshControl()}
        >
          {selectedPlan && (
            <View style={styles.checklistWrapper}>
              <WeeklyChecklistCard
                planPublicId={selectedPlan.publicId}
                selectedDate={selectedDate}
                itineraries={planData.itineraries}
              />
            </View>
          )}
        </ScrollView>
        <ScrollView
          key="travel"
          style={styles.scheduleList}
          contentContainerStyle={styles.scheduleContent}
          showsVerticalScrollIndicator={false}
          refreshControl={renderRefreshControl()}
        >
          {selectedDateAccommodations.length === 0 &&
            selectedDateFlights.length === 0 && (
              <View style={styles.emptyScheduleContainer}>
                <CautionIcon width={24} height={24} color={colors.gray600} />
                <Text style={styles.emptyScheduleText}>
                  등록된 숙박·항공이 없습니다.
                </Text>
              </View>
            )}
          {(selectedDateAccommodations.length > 0 ||
            selectedDateFlights.length > 0) && (
            <View
              style={[styles.travelInfoSection, styles.travelInfoSectionAlone]}
            >
              <Text style={styles.travelInfoTitle}>여행 정보 (Reference)</Text>
              {selectedDateAccommodations.map((accommodation: Accommodation) => {
                const isCheckout =
                  dayjs(accommodation.checkoutDate).format("YYYY-MM-DD") ===
                  selectedDate.format("YYYY-MM-DD");
                return (
                  <Pressable
                    key={accommodation.id}
                    style={styles.travelInfoCard}
                    onPress={() => {
                      setSelectedAccommodation(accommodation);
                      setShowAccommodationDetail(true);
                    }}
                  >
                    <View style={styles.travelInfoCardHeader}>
                      <View style={styles.travelInfoIconBox}>
                        <AccommodationIcon
                          width={20}
                          height={20}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.travelInfoHeaderText}>
                        <Text style={styles.travelInfoLabel}>
                          {isCheckout ? "오늘 체크아웃" : "오늘의 숙소"}
                        </Text>
                        <Text style={styles.travelInfoName}>
                          {accommodation.name}
                        </Text>
                        <Text style={styles.travelInfoSub}>
                          {isCheckout
                            ? `체크아웃 ${formatTime(accommodation.checkoutTime)}`
                            : `체크인 ${formatTime(accommodation.checkinTime)}`}
                        </Text>
                      </View>
                    </View>
                    <RightArrowIcon
                      width={12}
                      height={12}
                      color={colors.gray600}
                    />
                  </Pressable>
                );
              })}
              {selectedDateFlights.map(item => (
                <Pressable
                  key={item.id}
                  style={styles.travelInfoCard}
                  onPress={() => {
                    setSelectedFlight(item.data as FlightRead);
                    setSelectedFlightSegment(item.segment);
                    setShowFlightDetail(true);
                  }}
                >
                  <View style={styles.travelInfoCardHeader}>
                    <View style={styles.travelInfoIconBox}>
                      <FlightIcon width={20} height={20} color={colors.primary} />
                    </View>
                    <View style={styles.travelInfoHeaderText}>
                      <Text style={styles.travelInfoLabel}>오늘의 항공</Text>
                      <Text style={styles.travelInfoName}>
                        {item.segment.departureAirport} →{" "}
                        {item.segment.arrivalAirport}
                      </Text>
                      <Text style={styles.travelInfoSub}>
                        출발 {item.time}
                        {item.segment.flightNumber &&
                          ` · ${item.segment.flightNumber}`}
                      </Text>
                    </View>
                  </View>
                  <RightArrowIcon width={12} height={12} color={colors.gray600} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </PagerView>

      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
        />
      </Modal>

      <PlanSelectModal
        visible={showPlanSelector}
        onClose={() => setShowPlanSelector(false)}
        plans={plansQuery.plans || []}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        addPlan={plansQuery.addPlan}
        onAddTripPress={() => {
          setEditingPlan(null);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onEditPlan={plan => {
          setEditingPlan(plan);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onDeletePlan={async plan => {
          try {
            await plansQuery.deletePlan(plan.id);
            if (selectedPlan?.id === plan.id) {
              const remaining = (plansQuery.plans || []).filter(
                p => p.id !== plan.id,
              );
              setSelectedPlan(remaining[0] ?? null);
            }
            setShowPlanSelector(false);
            Alert.alert("성공", "여행이 삭제되었습니다");
          } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
              Alert.alert("알림", "이 여행을 삭제할 권한이 없습니다");
            } else {
              Alert.alert("알림", "여행 삭제에 실패했습니다");
            }
          }
        }}
      />

      {plansQuery.addPlan && (
        <AddPlanModal
          visible={showAddPlanModal}
          onClose={() => {
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setShowPlanSelector(true);
          }}
          onPlanCreated={plan => {
            setSelectedPlan(plan);
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setTimeout(() => setShowPlanSelector(false), 300);
          }}
          addPlan={plansQuery.addPlan}
          planToEdit={editingPlan}
          updatePlan={plansQuery.updatePlan}
        />
      )}

      <CalendarModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
        selectedDate={selectedDate.format("YYYY-MM-DD")}
        onDayPress={handleCalendarDayPress}
        minDate={planMinMax?.minDate}
        maxDate={planMinMax?.maxDate}
        datesWithItems={datesWithItems}
      />

      {selectedPlan && (
        <Pressable
          style={styles.fab}
          onPress={() => setAddScheduleFlow("method")}
          hitSlop={8}
        >
          <PlusIcon width={24} height={24} color={colors.white} />
        </Pressable>
      )}

      <AddScheduleMethodModal
        visible={addScheduleFlow === "method"}
        onClose={() => setAddScheduleFlow("closed")}
        onSelectDirectAdd={() => setAddScheduleFlow("direct")}
        onSelectAiAdd={() => {
          if (me?.isGuest) {
            setAddScheduleFlow("closed");
            setTimeout(() => guestPrompt.show(), 300);
            return;
          }
          setAddScheduleFlow("ai");
        }}
      />

      <AddScheduleWithAiModal
        visible={addScheduleFlow === "ai"}
        onClose={() => setAddScheduleFlow("method")}
        planId={selectedPlan?.id ?? 0}
        planPublicId={selectedPlan?.publicId ?? ""}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        onPlanDatesExtended={async (newStart, newEnd) => {
          if (selectedPlan?.id) {
            const extended = await extendPlanIfNeeded(selectedPlan.id, planData.plan, [newStart, newEnd]);
            queryClient.invalidateQueries({ queryKey: ["plans"] });
          }
        }}
        onSaved={() => {
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["plan", selectedPlan.publicId],
            });
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
          }
        }}
      />

      <AddScheduleModal
        visible={addScheduleFlow === "direct"}
        onClose={() => setAddScheduleFlow("method")}
        onSaved={() => setAddScheduleFlow("closed")}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        selectedDate={selectedDate}
        defaultCountry={selectedDateSegment?.country}
        defaultCity={selectedDateSegment?.city}
        planData={{
          addItinerary: planData.addItinerary,
          addAccommodation: planData.addAccommodation,
          addFlight: planData.addFlight,
          removeItinerary: planData.removeItinerary,
          removeAccommodation: planData.removeAccommodation,
          removeFlight: planData.removeFlight,
        }}
        onRefresh={() => {
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["plan", selectedPlan.publicId],
            });
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
          }
        }}
      />

      <ItineraryDetailModal
        visible={showItineraryDetail}
        onClose={() => {
          setShowItineraryDetail(false);
          setSelectedItinerary(null);
        }}
        itinerary={selectedItinerary}
        planExpenses={planData.expenses ?? []}
        attachments={planData.attachments ?? []}
        onEdit={itinerary => {
          setShowItineraryDetail(false);
          setEditingItinerary(itinerary);
          setItineraryPrefill(null);
          setShowItineraryEdit(true);
        }}
        onAttractionSelect={attraction => {
          reopenDetailAfterTourismRef.current = true;
          setShowItineraryDetail(false);
          setSelectedAttraction(attraction);
          setTimeout(() => setTourismDetailVisible(true), 300);
        }}
        onDelete={async itinerary => {
          try {
            await itinerariesApi.deleteItinerary(itinerary.id);
            const remainingDates = collectPlanItemDates(
              planData.itineraries.filter(it => it.id !== itinerary.id),
              planData.flights,
              planData.accommodations,
            );
            await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
            planData.removeItinerary(itinerary.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["checklist", selectedPlan.publicId],
              });
              queryClient.invalidateQueries({
                queryKey: ["plan", selectedPlan.publicId],
              });
            }
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            Alert.alert("삭제완료", "일정이 삭제되었습니다");
          } catch {
            Alert.alert("알림", "일정 삭제에 실패했습니다");
          }
        }}
      />

      <ItineraryEditModal
        visible={showItineraryEdit}
        onClose={opts => {
          const itineraryToShow = editingItinerary;
          setShowItineraryEdit(false);
          setEditingItinerary(null);
          setItineraryPrefill(null);
          if (!opts?.fromSave && itineraryToShow) {
            setSelectedItinerary(itineraryToShow);
            setShowItineraryDetail(true);
          }
        }}
        itinerary={editingItinerary}
        planId={selectedPlan?.id ?? 0}
        defaultCountry={selectedDateSegment?.country}
        defaultCity={selectedDateSegment?.city}
        prefill={itineraryPrefill ?? undefined}
        onSave={async itinerary => {
          planData.addItinerary(itinerary);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
          }
          planData.refreshAttachments();
        }}
        onDelete={async itineraryId => {
          const remainingDates = collectPlanItemDates(
            planData.itineraries.filter(it => it.id !== itineraryId),
            planData.flights,
            planData.accommodations,
          );
          await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
          planData.removeItinerary(itineraryId);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
            queryClient.invalidateQueries({
              queryKey: ["plan", selectedPlan.publicId],
            });
          }
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          planData.refreshAttachments();
        }}
      />

      <TourismDetailModal
        visible={tourismDetailVisible}
        onClose={() => {
          setTourismDetailVisible(false);
          setSelectedAttraction(null);
          if (reopenDetailAfterTourismRef.current) {
            setTimeout(() => setShowItineraryDetail(true), 300);
          }
          reopenDetailAfterTourismRef.current = true;
        }}
        item={selectedAttraction}
        itineraryLocation={
          selectedItinerary?.location?.latitude != null
            ? { latitude: selectedItinerary.location.latitude, longitude: selectedItinerary.location.longitude }
            : null
        }
        itinerary={selectedItinerary}
        onOpenNewItinerary={draft => {
          reopenDetailAfterTourismRef.current = false;
          setEditingItinerary(null);
          setItineraryPrefill(draft);
          setShowItineraryEdit(true);
        }}
      />

      <FlightDetailModal
        visible={showFlightDetail}
        onClose={() => {
          setShowFlightDetail(false);
          setSelectedFlight(null);
          setSelectedFlightSegment(null);
        }}
        flight={selectedFlight}
        segment={selectedFlightSegment}
        attachments={planData.attachments ?? []}
        onEdit={flight => {
          setShowFlightDetail(false);
          setEditingFlight(flight);
          setShowFlightEdit(true);
        }}
        onDelete={async flight => {
          try {
            await flightsApi.deleteFlight(flight.id);
            const remainingDates = collectPlanItemDates(
              planData.itineraries,
              planData.flights.filter(f => f.id !== flight.id),
              planData.accommodations,
            );
            await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
            planData.removeFlight(flight.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["checklist", selectedPlan.publicId],
              });
              queryClient.invalidateQueries({
                queryKey: ["plan", selectedPlan.publicId],
              });
            }
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            Alert.alert("삭제완료", "항공편이 삭제되었습니다");
          } catch {
            Alert.alert("알림", "항공 편 삭제에 실패했습니다");
          }
        }}
      />

      <FlightEditModal
        visible={showFlightEdit}
        onClose={opts => {
          const flightToShow = editingFlight;
          setShowFlightEdit(false);
          setEditingFlight(null);
          if (!opts?.fromSave && flightToShow) {
            setSelectedFlight(flightToShow);
            setSelectedFlightSegment(null);
            setShowFlightDetail(true);
          }
        }}
        flight={editingFlight}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        onSave={async updated => {
          planData.addFlight(updated);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
          }
          planData.refreshAttachments();
        }}
        onDelete={async flightId => {
          const remainingDates = collectPlanItemDates(
            planData.itineraries,
            planData.flights.filter(f => f.id !== flightId),
            planData.accommodations,
          );
          await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
          planData.removeFlight(flightId);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
            queryClient.invalidateQueries({
              queryKey: ["plan", selectedPlan.publicId],
            });
          }
          queryClient.invalidateQueries({ queryKey: ["plans"] });
        }}
      />

      <AccommodationDetailModal
        visible={showAccommodationDetail}
        onClose={() => {
          setShowAccommodationDetail(false);
          setSelectedAccommodation(null);
        }}
        accommodation={selectedAccommodation}
        attachments={planData.attachments ?? []}
        onEdit={accommodation => {
          setShowAccommodationDetail(false);
          setEditingAccommodation(accommodation);
          setShowAccommodationEdit(true);
        }}
        onDelete={async accommodation => {
          try {
            await accommodationsApi.deleteAccommodation(accommodation.id);
            const remainingDates = collectPlanItemDates(
              planData.itineraries,
              planData.flights,
              planData.accommodations.filter(acc => acc.id !== accommodation.id),
            );
            await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
            planData.removeAccommodation(accommodation.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["plan", selectedPlan.publicId],
              });
            }
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            Alert.alert("삭제완료", "숙소가 삭제되었습니다.");
          } catch {
            Alert.alert("알림", "숙소 삭제에 실패했습니다.");
          }
        }}
      />

      <AccommodationEditModal
        visible={showAccommodationEdit}
        onClose={opts => {
          const accommodationToShow = editingAccommodation;
          setShowAccommodationEdit(false);
          setEditingAccommodation(null);
          if (!opts?.fromSave && accommodationToShow) {
            setSelectedAccommodation(accommodationToShow);
            setShowAccommodationDetail(true);
          }
        }}
        accommodation={editingAccommodation}
        planId={selectedPlan?.id ?? 0}
        defaultCountry={selectedDateSegment?.country}
        defaultCity={selectedDateSegment?.city}
        onSave={async updated => {
          planData.addAccommodation(updated);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
          }
          planData.refreshAttachments();
        }}
        onDelete={async accommodationId => {
          const remainingDates = collectPlanItemDates(
            planData.itineraries,
            planData.flights,
            planData.accommodations.filter(acc => acc.id !== accommodationId),
          );
          await shrinkPlanIfNeeded(selectedPlan!.id, planData.plan, remainingDates);
          planData.removeAccommodation(accommodationId);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["plan", selectedPlan.publicId],
            });
          }
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          planData.refreshAttachments();
        }}
      />

      {selectedPlan && (
        <TravelInfoModal
          visible={travelInfoModalVisible}
          onClose={() => setTravelInfoModalVisible(false)}
          plan={planData.plan ?? selectedPlan}
          itineraries={planData.itineraries ?? []}
          accommodations={planData.accommodations ?? []}
          flights={planData.flights ?? []}
          expenses={planData.expenses ?? []}
          attachments={planData.attachments ?? []}
          memberCount={planData.shares?.length ?? 0}
          planPublicId={selectedPlan.publicId}
          planId={selectedPlan.id}
          planStartDate={selectedPlan.startDate}
          planEndDate={selectedPlan.endDate}
          onExpenseAdd={expense => planData.addExpense?.(expense)}
          onRefreshExpenses={async () => {
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
            }
          }}
          onRefreshPlan={async () => {
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["plan", selectedPlan.publicId],
              });
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
            }
          }}
        />
      )}

      <PlanLoadingOverlay visible={plansQuery.isLoading || planData.isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 8,
  },
  emptySubtext: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planSelector: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.gray900,
    flexShrink: 1,
  },
  headerPeriod: {
    ...textStyles.h7,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: -spacing.md,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  weekArrow: {
    width: 24,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDays: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 2,
  },
  dayColumn: {
    flex: 1,
    height: 48,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },
  dayColumnSelected: {
    backgroundColor: colors.primary,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientPrimary[0]} 0%, ${colors.gradientPrimary[1]} 100%)`,
    ...shadows.primaryRaised,
  },
  dayLabel: {
    ...textStyles.body6,
    lineHeight: 14,
    color: colors.paletteFg3,
  },
  dayLabelSelected: {
    color: colors.onDarkStrong,
  },
  dayDate: {
    ...textStyles.h6,
    lineHeight: 20,
    color: colors.gray900,
    fontVariant: ["tabular-nums"],
  },
  dayDateEmpty: {
    ...textStyles.body3,
    lineHeight: 20,
    color: colors.paletteFg3,
  },
  dayDateSelected: {
    color: colors.white,
  },
  dateDot: {
    position: "absolute",
    bottom: spacing.xs,
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  dateDotSelected: {
    backgroundColor: colors.white,
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  scheduleDateDay: {
    ...textStyles.h3,
    color: colors.paletteInk,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  scheduleDateWeekday: {
    ...textStyles.body3,
    color: colors.paletteFg2,
    marginLeft: spacing.sm,
  },
  todayBadge: {
    height: 20,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xs,
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
  },
  todayBadgeText: {
    ...textStyles.h8,
    color: colors.primary,
  },
  scheduleCountBadge: {
    height: 20,
    marginLeft: "auto",
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xs,
    justifyContent: "center",
    backgroundColor: colors.paletteFill2,
  },
  scheduleCountText: {
    ...textStyles.h8,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },

  currentCard: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radii["2xl"],
    backgroundColor: colors.primarySoft,
    ...shadows.soft,
  },
  currentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    boxShadow: `0 0 0 4px ${colors.primaryTint}`,
  },
  currentLabel: {
    ...textStyles.h7,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  currentEndPill: {
    marginLeft: "auto",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  currentEndText: {
    ...textStyles.h8,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  currentTitle: {
    ...textStyles.h3,
    color: colors.paletteInk,
    letterSpacing: -0.2,
  },
  currentSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  currentSubText: {
    ...textStyles.h7,
    color: colors.paletteFg2,
    flexShrink: 1,
  },
  listCard: {
    marginHorizontal: spacing.sm,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  listRowEnded: {
    opacity: 0.55,
  },
  listTime: {
    width: 44,
    paddingVertical: spacing.lg,
  },
  listStartTime: {
    ...textStyles.h6,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  listEndTime: {
    ...textStyles.body5,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  listBar: {
    width: 3,
    marginVertical: 18,
    borderRadius: radii.pill,
  },
  listBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  listBodyDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.paletteLine,
  },
  listText: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  listSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0,
  },
  listSubText: {
    ...textStyles.body4,
    color: colors.paletteFg2,
    flexShrink: 1,
  },
  listEndedText: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  listBadge: {
    height: 20,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
  },
  listBadgeText: {
    ...textStyles.h8,
    color: colors.primary,
  },
  dayTabsWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  dayTabs: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill2,
  },
  dayTab: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTabActive: {
    backgroundColor: colors.white,
  },
  dayTabText: {
    ...textStyles.body3,
    color: colors.paletteFg3,
  },
  dayTabTextActive: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  dayPager: {
    flex: 1,
  },
  scheduleList: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scheduleContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyScheduleContainer: {
    marginTop: 100,
    alignItems: "center",
    gap: 8,
  },
  emptyScheduleText: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  checklistWrapper: {
    marginVertical: 16,
  },

  scheduleNote: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  fab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  travelInfoSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  travelInfoSectionAlone: {
    marginTop: 24,
  },
  travelInfoTitle: {
    ...textStyles.h5,
    color: colors.black,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  travelInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.gray700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  travelInfoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  travelInfoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1F`,
    alignItems: "center",
    justifyContent: "center",
  },
  travelInfoHeaderText: {
    flex: 1,
  },
  travelInfoLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  travelInfoName: {
    ...textStyles.h6,
    color: colors.black,
    marginBottom: 4,
  },
  travelInfoSub: {
    ...textStyles.body4,
    color: colors.gray600,
  },
});
