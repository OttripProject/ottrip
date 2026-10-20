import axios from "axios";

import AddExpenseModal from "@/components/modals/mobile/AddExpenseModal.native";
import AddPlanModal from "@/components/modals/mobile/AddPlanModal.native";
import ExpenseDetailModal from "@/components/modals/mobile/ExpenseDetailModal.native";
import PlanLoadingOverlay from "@/components/PlanLoadingOverlay.native";
import AddScheduleMethodModal from "@/components/modals/mobile/AddScheduleMethodModal.native";
import AddScheduleModal from "@/components/modals/mobile/AddScheduleModal.native";
import AddScheduleWithAiModal from "@/components/modals/mobile/AddScheduleWithAiModal.native";
import PlanSelectModal from "@/components/modals/mobile/PlanSelectModal.native";
import ProfileModal from "@/components/modals/mobile/ProfileModal.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { useExpensesQuery } from "@/hooks/useExpensesQuery";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import type {
  Accommodation,
  Expense,
  FlightRead,
  FlightSegmentReadDto,
  Itinerary,
  Plan,
} from "@/types/api";
import { currencySymbols } from "@/types/expense";
import { itineraryCategoryColors } from "@/types/itinerary";
import { getAirportLabel } from "@/utils/airportList";
import { findFestivalSlot } from "@/utils/festivalSlot";
import { summarizeExpenses } from "@/utils/summarizeExpenses";
import { colors } from "@/ui/tokens/colors";
import { toEasing, usePressScale } from "@/ui/effects/pressScale";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { shadows } from "@/ui/tokens/shadows";
import { textStyles, typography } from "@/ui/tokens/typography";
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
const jellyEasing = toEasing(motion.easing.ease);
const JELLY_STEPS = [0, 0.3, 0.55, 0.75, 1];
const PRIMARY_GRADIENT = `linear-gradient(180deg, ${colors.gradientPrimary[0]} 0%, ${colors.gradientPrimary[1]} 100%)`;
const DAY_TABS = ["일정", "체크리스트", "숙박·항공"] as const;
const SCHEDULE_TAB_INDEX = DAY_TABS.indexOf("일정");
const NO_PLAN_FEATURES = [
  "여행 일정 관리에 최적화된 솔루션",
  "AI로 체크리스트 추천",
  "친구들과 일정 공유",
] as const;
import AiSuggestionCard from "@/components/cards/AiSuggestionCard.native";
import CongestionBanner from "@/components/CongestionBanner.native";
import FestivalsCard from "@/components/cards/FestivalsCard.native";
import FestivalDetailModal from "@/components/modals/FestivalDetailModal.native";
import TripChecklistPanel from "@/components/cards/TripChecklistPanel.native";
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
import {
  type DaySuggestion,
  type FestivalItem,
  tourismApi,
} from "@/services/tourism";
import CalendarModal from "@/ui/components/CalendarModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { extendPlanIfNeeded } from "@/utils/extendPlanIfNeeded";
import { collectPlanItemDates, shrinkPlanIfNeeded } from "@/utils/shrinkPlanIfNeeded";
import { guestPrompt } from "@/utils/guestPrompt";
import FlightIcon from "../../assets/airplane.svg";
import LocationIcon from "../../assets/mobile_location.svg";
import LeftArrowIcon from "../../assets/left_arrow.svg";
import AccommodationIcon from "../../assets/mobile_accomodation.svg";
import CalendarIcon from "../../assets/mobile_calendar_black.svg";
import DotsIcon from "../../assets/dots.svg";
import ExpenseCardIcon from "../../assets/expense_card.svg";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import InfoCircleIcon from "../../assets/info_circle.svg";
import PersonIcon from "../../assets/person_outline.svg";
import PlusIcon from "../../assets/mobile_plus2.svg";
import RightArrowIcon from "../../assets/right_arrow.svg";
import SettingIcon from "../../assets/mobile_setting.svg";

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
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable
      style={[styles.dayTab, isActive && styles.dayTabActive]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
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
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [moreMenuTop, setMoreMenuTop] = useState(0);
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
  const [suggestions, setSuggestions] = useState<DaySuggestion[]>([]);
  const [festivals, setFestivals] = useState<FestivalItem[]>([]);
  const [matchedFestivals, setMatchedFestivals] = useState<FestivalItem[]>([]);
  const [congestedItems, setCongestedItems] = useState<
    { date: string; locationName: string }[]
  >([]);
  const [congestionDismissed, setCongestionDismissed] = useState(false);
  const prevCongestedKeyRef = useRef("");
  const [selectedFestival, setSelectedFestival] = useState<FestivalItem | null>(
    null,
  );
  const [dismissedSuggestionDates, setDismissedSuggestionDates] = useState<
    Set<string>
  >(new Set());
  const suggestionSlotRef = useRef<{ start: string; end: string } | null>(
    null,
  );
  const [itineraryEditFromRecommend, setItineraryEditFromRecommend] =
    useState(false);
  const snackbarAnim = useRef(new Animated.Value(0)).current;
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarUndoRef = useRef<(() => void) | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpenseFromDetail, setShowAddExpenseFromDetail] =
    useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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
      const today = dayjs();
      const isTodayInPlan =
        !today.isBefore(selectedPlan.startDate, "day") &&
        !today.isAfter(selectedPlan.endDate, "day");
      const initialDate = isTodayInPlan ? today : dayjs(selectedPlan.startDate);
      setSelectedDate(initialDate);
      setWeekBaseDate(initialDate);
    }
  }, [selectedPlan?.id]);

  const isKoreanPlan =
    planData.plan?.segments?.some(segment => segment.country === "대한민국") ??
    false;

  useEffect(() => {
    setDismissedSuggestionDates(new Set());
    if (!selectedPlan?.id || !isKoreanPlan) {
      setSuggestions([]);
      return;
    }
    tourismApi
      .getPlanSuggestions(selectedPlan.id)
      .then(setSuggestions)
      .catch(() => {});
  }, [selectedPlan?.id, isKoreanPlan]);

  useEffect(() => {
    if (!selectedPlan?.id || !isKoreanPlan) {
      setFestivals([]);
      return;
    }
    tourismApi
      .getSuggestFestivals(selectedPlan.id)
      .then(setFestivals)
      .catch(() => {});
  }, [selectedPlan?.id, isKoreanPlan]);

  useEffect(() => {
    if (!selectedPlan?.id || !isKoreanPlan) {
      setMatchedFestivals(prev => (prev.length ? [] : prev));
      return;
    }
    tourismApi
      .getFestivalsForPlan(selectedPlan.id)
      .then(setMatchedFestivals)
      .catch(() => {});
  }, [selectedPlan?.id, isKoreanPlan, planData.itineraries]);

  useEffect(() => {
    if (!selectedPlan?.id || !isKoreanPlan || !planData.itineraries?.length) {
      setCongestedItems(prev => (prev.length ? [] : prev));
      return;
    }
    const today = dayjs().startOf("day");
    const maxDate = today.add(30, "day");
    const eligible = planData.itineraries.filter((it: Itinerary) => {
      if (!it.location || it.category === "MEAL") return false;
      const d = dayjs(it.itineraryDate);
      return !d.isBefore(today) && !d.isAfter(maxDate);
    });
    if (eligible.length === 0) {
      setCongestedItems(prev => (prev.length ? [] : prev));
      return;
    }
    Promise.all(
      eligible.map((it: Itinerary) =>
        tourismApi
          .getCongestion(it.id)
          .then(items =>
            items.length > 0 && it.location
              ? {
                  date: dayjs(it.itineraryDate).format("YYYY-MM-DD"),
                  locationName: it.location.name,
                }
              : null,
          )
          .catch(() => null),
      ),
    ).then(results =>
      setCongestedItems(
        results.filter(
          (r): r is { date: string; locationName: string } => r !== null,
        ),
      ),
    );
  }, [selectedPlan?.id, isKoreanPlan, planData.itineraries]);

  useEffect(() => {
    const key = congestedItems
      .map(c => `${c.date}${c.locationName}`)
      .sort()
      .join(",");
    if (key && key !== prevCongestedKeyRef.current) {
      setCongestionDismissed(false);
    }
    prevCongestedKeyRef.current = key;
  }, [congestedItems]);

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    };
  }, []);

  const hideSnackbar = () => {
    Animated.timing(snackbarAnim, {
      toValue: 0,
      duration: motion.duration.toastOut,
      useNativeDriver: true,
    }).start();
  };

  const dismissSuggestion = (date: string) => {
    setDismissedSuggestionDates(prev => new Set([...prev, date]));
    snackbarUndoRef.current = () => restoreSuggestion(date);
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    snackbarAnim.setValue(0);
    Animated.timing(snackbarAnim, {
      toValue: 1,
      duration: motion.duration.toastIn,
      useNativeDriver: true,
    }).start();
    snackbarTimerRef.current = setTimeout(() => {
      hideSnackbar();
      snackbarUndoRef.current = null;
    }, 3000);
  };

  const restoreSuggestion = (date: string) => {
    setDismissedSuggestionDates(prev => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  };

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

  const selectedDateStr = selectedDate.format("YYYY-MM-DD");
  const { data: dayExpenses = [], refetch: refetchDayExpenses } =
    useExpensesQuery(selectedPlan?.id, selectedDateStr);
  const dayExpenseSummary = useMemo(
    () => summarizeExpenses(dayExpenses),
    [dayExpenses],
  );
  const daySuggestion =
    suggestions.find(suggestion => suggestion.date === selectedDateStr) ?? null;
  const isSuggestionDismissed = dismissedSuggestionDates.has(selectedDateStr);

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

  const suggestionVisible = !!daySuggestion && !isSuggestionDismissed;
  const suggestionIndex = daySuggestion
    ? timelineRows.findIndex(
        row => row.schedule.time >= daySuggestion.slotStart,
      )
    : -1;
  const splitIndex = !suggestionVisible
    ? timelineRows.length
    : suggestionIndex === -1
      ? timelineRows.length
      : suggestionIndex;
  const beforeRows = timelineRows.slice(0, splitIndex);
  const afterRows = timelineRows.slice(splitIndex);

  const renderListRow = (
    row: (typeof timelineRows)[number],
    index: number,
    showDivider: boolean,
  ) => {
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
            showDivider && styles.listBodyDivider,
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

  const congestionBanner = useMemo(() => {
    const dateKey = selectedDate.format("YYYY-MM-DD");
    const mealLocationNames = new Set(
      (planData.itineraries ?? [])
        .filter((it: Itinerary) => it.category === "MEAL" && it.location)
        .map((it: Itinerary) => it.location?.name),
    );
    const festivalLocations = matchedFestivals
      .filter(
        f =>
          f.matchedDate === dateKey &&
          f.matchedLocationName &&
          !mealLocationNames.has(f.matchedLocationName),
      )
      .map(f => f.matchedLocationName as string);
    const congestionLocations = congestedItems
      .filter(c => c.date === dateKey)
      .map(c => c.locationName);
    const locationNames = [
      ...new Set([...festivalLocations, ...congestionLocations]),
    ];
    if (locationNames.length === 0) return null;
    return {
      date: dateKey,
      locationNames,
      hasFestival: festivalLocations.length > 0,
      hasCongestion: congestionLocations.length > 0,
    };
  }, [selectedDate, planData.itineraries, matchedFestivals, congestedItems]);

  const tripAccommodations = useMemo(
    () =>
      [...(planData.accommodations ?? [])].sort((a, b) =>
        a.checkinDate.localeCompare(b.checkinDate),
      ),
    [planData.accommodations],
  );

  const tripNights = useMemo(
    () =>
      tripAccommodations.reduce(
        (acc, a) =>
          acc +
          Math.max(
            0,
            dayjs(a.checkoutDate)
              .startOf("day")
              .diff(dayjs(a.checkinDate).startOf("day"), "day"),
          ),
        0,
      ),
    [tripAccommodations],
  );

  const tripFlightSegments = useMemo(
    () =>
      (planData.flights ?? [])
        .flatMap((flight: FlightRead) =>
          [...(flight.flightSegments ?? [])]
            .sort((a, b) => a.order - b.order)
            .map((segment, index) => ({
              id: `${flight.id}-segment-${segment.id}`,
              flight,
              segment,
              isFirstSegment: index === 0,
            })),
        )
        .sort((a, b) =>
          a.segment.departureTime.localeCompare(b.segment.departureTime),
        ),
    [planData.flights],
  );

  const flightCostText = useMemo(() => {
    const totals = new Map<string, number>();
    for (const flight of planData.flights ?? []) {
      if (!flight.expense) continue;
      const { currency, amount } = flight.expense;
      totals.set(currency, (totals.get(currency) ?? 0) + Number(amount));
    }
    if (totals.size === 0) return `${currencySymbols.KRW}0`;
    return [...totals]
      .map(
        ([currency, amount]) =>
          `${currencySymbols[currency as keyof typeof currencySymbols] ?? currency}${amount.toLocaleString("ko-KR")}`,
      )
      .join(" · ");
  }, [planData.flights]);

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
      <View style={styles.noPlanContainer}>
        <ScrollView
          contentContainerStyle={styles.noPlanScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.noPlanHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => setProfileModalVisible(true)}
              hitSlop={8}
              accessibilityLabel="설정"
            >
              <SettingIcon width={24} height={24} color={colors.gray600} />
            </Pressable>
          </View>
          <View style={styles.noPlanCardWrap}>
            <View style={styles.noPlanCard}>
              <Text style={styles.noPlanEyebrow}>
                여행 일정 관리에 맞춘 서비스
              </Text>
              <Text style={styles.noPlanHeadline}>새 여행을 만들어보세요</Text>
              <Text style={styles.noPlanSubcopy}>
                일정·항공·숙소를 한 곳에서{"\n"}AI 체크리스트와 친구 공유까지
              </Text>
              <View style={styles.noPlanFeatureBox}>
                {NO_PLAN_FEATURES.map(line => (
                  <View key={line} style={styles.noPlanFeatureRow}>
                    <View style={styles.noPlanBullet} />
                    <Text style={styles.noPlanFeatureText}>{line}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[
                  styles.noPlanCta,
                  !plansQuery.addPlan && styles.noPlanCtaDisabled,
                ]}
                disabled={!plansQuery.addPlan}
                onPress={() => {
                  setEditingPlan(null);
                  setShowAddPlanModal(true);
                }}
              >
                <Text style={styles.noPlanCtaLabel}>여행 일정 생성</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

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

        {plansQuery.addPlan && (
          <AddPlanModal
            visible={showAddPlanModal}
            onClose={() => {
              setShowAddPlanModal(false);
              setEditingPlan(null);
            }}
            onPlanCreated={plan => {
              setSelectedPlan(plan);
              setShowAddPlanModal(false);
              setEditingPlan(null);
            }}
            addPlan={plansQuery.addPlan}
            planToEdit={editingPlan}
            updatePlan={plansQuery.updatePlan}
          />
        )}
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
        <View
          style={styles.headerTopRow}
          onLayout={e => {
            const { y, height } = e.nativeEvent.layout;
            setMoreMenuTop(y + height);
          }}
        >
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
              onPress={() => setMoreMenuVisible(true)}
            >
              <DotsIcon width={20} height={20} color={colors.black} />
            </Pressable>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.dayTabsWrap,
          activeTab !== SCHEDULE_TAB_INDEX && styles.dayTabsWrapCompact,
        ]}
      >
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

      <View
        style={[
          styles.weekSelector,
          activeTab !== SCHEDULE_TAB_INDEX && styles.weekSelectorHidden,
        ]}
      >
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
            const dateKey = item.fullDate.format("YYYY-MM-DD");
            const hasItems = datesWithItems.has(dateKey);
            const isInTrip =
              !!planMinMax &&
              dateKey >= planMinMax.minDate &&
              dateKey <= planMinMax.maxDate;
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
                    !hasItems && !isSelected && isInTrip && styles.dayDateEmptyInTrip,
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
          {congestionBanner && !congestionDismissed && (
            <CongestionBanner
              {...congestionBanner}
              onDismiss={() => setCongestionDismissed(true)}
            />
          )}
          {scheduleCount === 0 && (
            <View style={styles.emptyScheduleCard}>
              <Text style={styles.emptyScheduleCardText}>
                아직 등록된 일정이 없어요
              </Text>
              {selectedPlan && (
                <ScalePressable
                  style={styles.emptyScheduleButton}
                  onPress={() => setAddScheduleFlow("method")}
                >
                  <Text style={styles.emptyScheduleButtonText}>+ 일정 추가</Text>
                </ScalePressable>
              )}
            </View>
          )}
          {currentRows.map(row => (
            <ScalePressable
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
            </ScalePressable>
          ))}
          {(timelineRows.length > 0 || suggestionVisible) && (
            <View style={styles.listCard}>
              {beforeRows.map((row, index) =>
                renderListRow(row, index, index > 0),
              )}
              {daySuggestion && suggestionVisible && (
                <View>
                  {beforeRows.length > 0 && (
                    <View style={styles.suggestionDivider} />
                  )}
                <AiSuggestionCard
                  suggestion={daySuggestion}
                  onDismiss={() => dismissSuggestion(selectedDateStr)}
                  onPlacePress={place => {
                    setSelectedAttraction({
                      contentId: place.contentId,
                      contentTypeId: place.category ?? place.contentTypeId ?? "12",
                      categorySub: place.category,
                      title: place.title,
                      imageUrl: place.imageUrl,
                      address: null,
                      rank: null,
                      dist: place.dist,
                    });
                    suggestionSlotRef.current = {
                      start: daySuggestion.slotStart,
                      end: daySuggestion.slotEnd,
                    };
                    reopenDetailAfterTourismRef.current = false;
                    setTourismDetailVisible(true);
                  }}
                />
                </View>
              )}
              {afterRows.map((row, index) =>
                renderListRow(
                  row,
                  splitIndex + index,
                  index > 0 || suggestionVisible,
                ),
              )}
            </View>
          )}
          {daySuggestion && isSuggestionDismissed && (
            <Pressable
              style={styles.suggestionShowButton}
              onPress={() => restoreSuggestion(selectedDateStr)}
              hitSlop={8}
            >
              <Text style={styles.suggestionShowText}>AI 제안</Text>
            </Pressable>
          )}
          {festivals.length > 0 && (
            <View style={styles.festivalsWrap}>
              <FestivalsCard festivals={festivals} onPress={setSelectedFestival} />
            </View>
          )}
          {selectedPlan && (
            <ScalePressable
              style={styles.costCard}
              onPress={() => setShowExpenseDetail(true)}
            >
              <View style={styles.costHeader}>
                <ExpenseCardIcon width={19} height={19} color={colors.white} />
                <Text style={styles.costTitle}>
                  {selectedDate.isSame(dayjs(), "day")
                    ? "오늘의"
                    : selectedDate.format("M월 D일")}{" "}
                  여행 비용
                </Text>
                <RightArrowIcon width={15} height={15} color={colors.white} />
              </View>
              {(dayExpenseSummary.totalKrw > 0 ||
                dayExpenseSummary.totalUsd === 0) && (
                <Text style={styles.costAmount}>
                  {dayExpenseSummary.totalKrw.toLocaleString("ko-KR")} 원
                </Text>
              )}
              {dayExpenseSummary.totalUsd > 0 && (
                <Text style={styles.costAmount}>
                  {dayExpenseSummary.totalUsd.toLocaleString("en-US")} 달러
                </Text>
              )}
              <Text style={styles.costHint}>터치하여 상세 내역 확인</Text>
            </ScalePressable>
          )}
        </ScrollView>
        <ScrollView
          key="checklist"
          style={styles.scheduleList}
          contentContainerStyle={[styles.scheduleContent, styles.tabContentTop]}
          showsVerticalScrollIndicator={false}
          refreshControl={renderRefreshControl()}
        >
          {selectedPlan && (
            <TripChecklistPanel
              planPublicId={selectedPlan.publicId}
              itineraries={planData.itineraries}
            />
          )}
        </ScrollView>
        <ScrollView
          key="travel"
          style={styles.scheduleList}
          contentContainerStyle={[styles.scheduleContent, styles.tabContentTop]}
          showsVerticalScrollIndicator={false}
          refreshControl={renderRefreshControl()}
        >
          <View style={styles.travelSection}>
            <View style={styles.travelSectionHeader}>
              <Text style={styles.travelSectionTitle}>숙소</Text>
              <Text style={styles.travelSectionSummary}>
                {tripAccommodations.length}곳 · {tripNights}박
              </Text>
            </View>
            {tripAccommodations.map((accommodation: Accommodation) => {
              const nights = Math.max(
                0,
                dayjs(accommodation.checkoutDate)
                  .startOf("day")
                  .diff(dayjs(accommodation.checkinDate).startOf("day"), "day"),
              );
              const { expense } = accommodation;
              return (
                <Pressable
                  key={accommodation.id}
                  style={styles.stayCard}
                  onPress={() => {
                    setSelectedAccommodation(accommodation);
                    setShowAccommodationDetail(true);
                  }}
                >
                  <View style={styles.stayTop}>
                    <View style={styles.stayIconBox}>
                      <AccommodationIcon
                        width={21}
                        height={21}
                        color={colors.accommodationText}
                      />
                    </View>
                    <View style={styles.stayTitleWrap}>
                      <Text style={styles.stayName} numberOfLines={1}>
                        {accommodation.name}
                      </Text>
                      {!!accommodation.city && (
                        <Text style={styles.staySub} numberOfLines={1}>
                          {accommodation.city}
                        </Text>
                      )}
                    </View>
                    <View style={styles.stayPriceWrap}>
                      {!!expense && (
                        <Text style={styles.stayPrice}>
                          {currencySymbols[
                            expense.currency as keyof typeof currencySymbols
                          ] ?? expense.currency}
                          {Number(expense.amount).toLocaleString("ko-KR")}
                        </Text>
                      )}
                      <Text style={styles.staySub}>{nights}박</Text>
                    </View>
                  </View>
                  <View style={styles.stayDates}>
                    <View style={styles.stayDateCol}>
                      <Text style={styles.stayDateLabel}>체크인</Text>
                      <Text style={styles.stayDate}>
                        {dayjs(accommodation.checkinDate).format("MM. DD")}
                      </Text>
                      <Text style={styles.stayTime}>
                        {formatTime(accommodation.checkinTime)}
                      </Text>
                    </View>
                    <View style={styles.stayDivider} />
                    <View style={styles.stayDateCol}>
                      <Text style={styles.stayDateLabel}>체크아웃</Text>
                      <Text style={styles.stayDate}>
                        {dayjs(accommodation.checkoutDate).format("MM. DD")}
                      </Text>
                      <Text style={styles.stayTime}>
                        {formatTime(accommodation.checkoutTime)}
                      </Text>
                    </View>
                  </View>
                  {!!accommodation.description && (
                    <Text style={styles.stayNote}>
                      {accommodation.description}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.travelSection}>
            <View
              style={[styles.travelSectionHeader, styles.travelSectionHeaderNext]}
            >
              <Text style={styles.travelSectionTitle}>항공편</Text>
              <Text style={styles.travelSectionSummary}>
                {tripFlightSegments.length}편 · 총 {flightCostText}
              </Text>
            </View>
            {tripFlightSegments.map(item => {
              const { flight, segment, isFirstSegment } = item;
              const expense = isFirstSegment ? flight.expense : undefined;
              return (
                <Pressable
                  key={item.id}
                  style={styles.flightCard}
                  onPress={() => {
                    setSelectedFlight(flight);
                    setSelectedFlightSegment(segment);
                    setShowFlightDetail(true);
                  }}
                >
                  <View style={styles.flightTop}>
                    {!!segment.flightNumber && (
                      <View style={styles.flightBadge}>
                        <Text style={styles.flightBadgeText}>
                          {segment.flightNumber}
                        </Text>
                      </View>
                    )}
                    {!!segment.airline && (
                      <Text style={styles.flightAirline} numberOfLines={1}>
                        {segment.airline}
                      </Text>
                    )}
                    {!!expense && (
                      <Text style={styles.flightPrice}>
                        {currencySymbols[
                          expense.currency as keyof typeof currencySymbols
                        ] ?? expense.currency}
                        {Number(expense.amount).toLocaleString("ko-KR")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.flightRoute}>
                    <View>
                      <Text style={styles.flightAirport}>
                        {segment.departureAirport}
                      </Text>
                      <Text style={styles.flightTime}>
                        {convertUTCToLocalTime(segment.departureTime)}
                      </Text>
                    </View>
                    <View style={styles.flightPath}>
                      <View style={styles.flightPathDot} />
                      <View style={styles.flightPathLine} />
                      <FlightIcon width={14} height={14} color={colors.gray600} />
                      <View style={styles.flightPathLine} />
                      <View style={styles.flightPathDot} />
                    </View>
                    <View style={styles.flightEnd}>
                      <Text style={styles.flightAirport}>
                        {segment.arrivalAirport}
                      </Text>
                      <Text style={styles.flightTime}>
                        {convertUTCToLocalTime(segment.arrivalTime)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.flightMeta}>
                    <View style={styles.flightMetaCol}>
                      <Text style={styles.flightMetaLabel}>날짜</Text>
                      <Text style={styles.flightMetaValue}>
                        {dayjs(segment.departureTime).format("MM. DD")}
                      </Text>
                    </View>
                    <View style={styles.flightMetaCol}>
                      <Text style={styles.flightMetaLabel}>PNR</Text>
                      <Text style={styles.flightMetaValue}>
                        {flight.reservationNumber || "-"}
                      </Text>
                    </View>
                    <View style={[styles.flightMetaCol, styles.flightEnd]}>
                      <Text style={styles.flightMetaLabel}>좌석</Text>
                      <Text style={styles.flightMetaValue}>
                        {segment.seatNumber || "-"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </PagerView>

      <FestivalDetailModal
        visible={!!selectedFestival}
        onClose={() => setSelectedFestival(null)}
        item={selectedFestival}
        onAddToItinerary={draft => {
          const {
            matchedDate,
            eventStartDate,
            eventEndDate,
            playtime,
            ...restDraft
          } = draft;
          const segments = planData.plan?.segments;
          const segment = segments?.length
            ? ((matchedDate
                ? segments.find(
                    s => s.startDate <= matchedDate && matchedDate <= s.endDate,
                  )
                : null) ?? segments[0])
            : null;
          const slot = selectedPlan
            ? findFestivalSlot(
                eventStartDate,
                eventEndDate,
                selectedPlan.startDate,
                selectedPlan.endDate,
                planData.itineraries ?? [],
                playtime,
              )
            : null;

          setSelectedFestival(null);
          setEditingItinerary(null);
          setItineraryPrefill({
            ...restDraft,
            country: segment?.country,
            city: segment?.city,
            ...(slot ?? {}),
          });
          setItineraryEditFromRecommend(true);
          setShowItineraryEdit(true);
        }}
      />

      <ExpenseDetailModal
        visible={showExpenseDetail && !showAddExpenseFromDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={dayExpenses}
        attachments={planData.attachments ?? []}
        total={dayExpenseSummary.total}
        byCategory={dayExpenseSummary.byCategory}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        exDate={selectedDateStr}
        onExpenseDelete={async () => {
          await refetchDayExpenses();
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onExpenseAdd={() => {
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onAddExpensePress={() => {
          setEditingExpense(null);
          setShowExpenseDetail(false);
          setShowAddExpenseFromDetail(true);
        }}
        onExpensePress={expense => {
          setEditingExpense(expense);
          setShowAddExpenseFromDetail(true);
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseFromDetail}
        expense={editingExpense}
        onClose={opts => {
          setShowAddExpenseFromDetail(false);
          if (opts?.fromSave && !editingExpense) {
            setShowExpenseDetail(false);
          } else {
            setShowExpenseDetail(true);
          }
        }}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        defaultExDate={selectedDateStr}
        onExpenseAdd={expense => {
          planData.addExpense?.(expense);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
          setShowExpenseDetail(false);
        }}
        onExpenseUpdate={async () => {
          await refetchDayExpenses();
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
          planData.refreshAttachments();
        }}
        onExpenseDelete={async () => {
          await refetchDayExpenses();
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
          planData.refreshAttachments();
        }}
      />

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
          setItineraryEditFromRecommend(false);
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
        showRecommendToast={itineraryEditFromRecommend}
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
          const slot = suggestionSlotRef.current;
          suggestionSlotRef.current = null;
          setItineraryPrefill(
            slot ? { ...draft, startTime: slot.start, endTime: slot.end } : draft,
          );
          setItineraryEditFromRecommend(!!slot);
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

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.snackbar,
          { opacity: snackbarAnim, bottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.snackbarText}>
          {"AI 제안을 숨겼어요.\n다시 보려면 AI 제안 버튼을 눌러주세요."}
        </Text>
        <Pressable
          onPress={() => {
            snackbarUndoRef.current?.();
            snackbarUndoRef.current = null;
            if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
            hideSnackbar();
          }}
          hitSlop={8}
        >
          <Text style={styles.snackbarAction}>다시 보기</Text>
        </Pressable>
      </Animated.View>

      {moreMenuVisible && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMoreMenuVisible(false)}
          />
          <View
            accessibilityRole="menu"
            style={[styles.moreMenu, { top: moreMenuTop }]}
          >
            {[
              {
                label: "여행 정보",
                Icon: InfoCircleIcon,
                onPress: () => setTravelInfoModalVisible(true),
              },
              {
                label: "설정",
                Icon: PersonIcon,
                onPress: () => setProfileModalVisible(true),
              },
            ].map(({ label, Icon, onPress }) => (
              <Pressable
                key={label}
                accessibilityRole="menuitem"
                style={({ pressed }) => [
                  styles.moreMenuItem,
                  pressed && styles.moreMenuItemPressed,
                ]}
                onPress={() => {
                  setMoreMenuVisible(false);
                  onPress();
                }}
              >
                <Icon width={20} height={20} color={colors.paletteInk} />
                <Text style={styles.moreMenuText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
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
  noPlanContainer: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  noPlanScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  noPlanHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  noPlanCardWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: spacing["2xl"],
  },
  noPlanCard: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    paddingHorizontal: spacing.lgPlus,
    paddingTop: 56,
    paddingBottom: spacing.lgPlus,
    overflow: "hidden",
  },
  noPlanEyebrow: {
    ...textStyles.h7,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 6,
  },
  noPlanHeadline: {
    ...textStyles.h3,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  noPlanSubcopy: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: "center",
    marginBottom: spacing["2xl"],
  },
  noPlanFeatureBox: {
    backgroundColor: colors.gray200,
    borderRadius: radii.mdPlus,
    padding: spacing.lg,
    marginBottom: spacing["2xl"],
    gap: spacing.sm,
  },
  noPlanFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noPlanBullet: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gray700,
    marginTop: spacing.sm,
  },
  noPlanFeatureText: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  noPlanCta: {
    width: "100%",
    paddingVertical: spacing.lg,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  noPlanCtaDisabled: {
    opacity: 0.5,
  },
  noPlanCtaLabel: {
    ...textStyles.h5,
    color: colors.white,
  },
  suggestionDivider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.paletteLine,
  },
  suggestionShowButton: {
    alignSelf: "flex-end",
    height: 30,
    marginTop: spacing.xl,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.aiTint,
  },
  suggestionShowText: {
    ...textStyles.h8,
    color: colors.aiInk,
  },
  snackbar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.gray800,
  },
  snackbarText: {
    ...textStyles.h7,
    flex: 1,
    color: colors.white,
  },
  snackbarAction: {
    ...textStyles.h7,
    flexShrink: 0,
    color: colors.aiInk,
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
  moreMenu: {
    position: "absolute",
    right: spacing.md,
    minWidth: 176,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  moreMenuItemPressed: {
    backgroundColor: colors.paletteFill,
  },
  moreMenuText: {
    ...textStyles.body2,
    color: colors.paletteInk,
  },

  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  weekSelectorHidden: {
    display: "none",
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
    experimental_backgroundImage: PRIMARY_GRADIENT,
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
  dayDateEmptyInTrip: {
    color: colors.gray750,
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
  festivalsWrap: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.xl,
  },
  costCard: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.primary,
    experimental_backgroundImage: PRIMARY_GRADIENT,
    ...shadows.primaryRaised,
  },
  costHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  costTitle: {
    ...textStyles.h5,
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.white,
  },
  costAmount: {
    ...textStyles.h2,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    letterSpacing: -0.48,
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  costHint: {
    ...textStyles.h7,
    marginTop: spacing.md,
    color: colors.onDarkStrong,
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
  dayTabsWrapCompact: {
    paddingBottom: 0,
  },
  tabContentTop: {
    paddingTop: spacing.xl,
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
    fontFamily: typography.fontFamily.pretendardMedium,
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
  emptyScheduleCard: {
    alignItems: "center",
    marginHorizontal: spacing.sm,
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  emptyScheduleCardText: {
    ...textStyles.h7,
    color: colors.gray750,
  },
  emptyScheduleButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    experimental_backgroundImage: PRIMARY_GRADIENT,
    ...shadows.primaryRaised,
  },
  emptyScheduleButtonText: {
    ...textStyles.h7,
    color: colors.white,
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
  travelSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  travelSectionHeader: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  travelSectionHeaderNext: {
    paddingTop: spacing.sm,
  },
  travelSectionTitle: {
    ...textStyles.h3,
    color: colors.black,
  },
  travelSectionSummary: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  stayCard: {
    marginHorizontal: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  stayTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  stayIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.accommodationBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stayTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },
  stayName: {
    ...textStyles.h5,
    color: colors.black,
  },
  staySub: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
  },
  stayPriceWrap: {
    marginLeft: spacing.sm,
    alignItems: "flex-end",
  },
  stayPrice: {
    ...textStyles.h6,
    fontVariant: ["tabular-nums"],
    color: colors.black,
  },
  stayDates: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  stayDateCol: {
    flex: 1,
  },
  stayDivider: {
    width: 1,
    marginHorizontal: spacing.md,
    backgroundColor: colors.gray350,
  },
  stayDateLabel: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  stayDate: {
    ...textStyles.h7,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
    color: colors.black,
  },
  stayTime: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg2,
  },
  stayNote: {
    ...textStyles.body5,
    marginTop: spacing.md,
    color: colors.paletteFg2,
  },
  flightCard: {
    marginHorizontal: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  flightTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  flightBadge: {
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xs,
    backgroundColor: colors.flightBg,
  },
  flightBadgeText: {
    ...textStyles.h8,
    color: colors.flightText,
  },
  flightAirline: {
    ...textStyles.body5,
    flexShrink: 1,
    color: colors.paletteFg2,
  },
  flightPrice: {
    ...textStyles.h6,
    marginLeft: "auto",
    paddingLeft: spacing.sm,
    fontVariant: ["tabular-nums"],
    color: colors.black,
  },
  flightRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  flightAirport: {
    ...textStyles.h3,
    fontVariant: ["tabular-nums"],
    color: colors.black,
  },
  flightTime: {
    ...textStyles.h7,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg2,
  },
  flightPath: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  flightPathDot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gray600,
  },
  flightPathLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray600,
  },
  flightEnd: {
    alignItems: "flex-end",
  },
  flightMeta: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  flightMetaCol: {
    flex: 1,
  },
  flightMetaLabel: {
    ...textStyles.body5,
    color: colors.paletteFg3,
  },
  flightMetaValue: {
    ...textStyles.h8,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg2,
  },
});
