import AccommodationDetailModal from "@/components/modals/mobile/AccommodationDetailModal.native";
import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import AddExpenseModal from "@/components/modals/mobile/AddExpenseModal.native";
import AddPlanModal from "@/components/modals/mobile/AddPlanModal.native";
import AddScheduleMethodModal from "@/components/modals/mobile/AddScheduleMethodModal.native";
import AddScheduleModal from "@/components/modals/mobile/AddScheduleModal.native";
import AddScheduleWithAiModal from "@/components/modals/mobile/AddScheduleWithAiModal.native";
import ExpenseDetailModal from "@/components/modals/mobile/ExpenseDetailModal.native";
import FlightDetailModal from "@/components/modals/mobile/FlightDetailModal.native";
import FlightEditModal from "@/components/modals/mobile/FlightEditModal.native";
import ItineraryDetailModal from "@/components/modals/mobile/ItineraryDetailModal.native";
import ItineraryEditModal from "@/components/modals/mobile/ItineraryEditModal.native";
import PlanSelectModal from "@/components/modals/mobile/PlanSelectModal.native";
import ProfileModal from "@/components/modals/mobile/ProfileModal.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { useExpensesQuery } from "@/hooks/useExpensesQuery";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import type {
  Accommodation,
  DocumentUploadAnalyzeResponse,
  FlightRead,
  FlightSegmentReadDto,
  Itinerary,
  LocalFile,
  Plan,
} from "@/types/api";
import { categoryLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import {
  convertUTCToLocalTime,
  formatKoreanDate,
  formatTime,
  getTodayKoreanDate,
} from "@/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type AddScheduleFlow = "closed" | "method" | "direct" | "ai";
import WeeklyChecklistCard from "@/components/cards/WeeklyChecklistCard.native";
import { useMe } from "@/hooks/useMe";
import { accommodationsApi } from "@/services/accommodations";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import { guestPrompt } from "@/utils/guestPrompt";
import FlightIcon from "../../assets/airplane.svg";
import AccommodationIcon from "../../assets/mobile_accomodation.svg";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import ExpenseIcon from "../../assets/mobile_expense.svg";
import LocationIcon from "../../assets/mobile_location.svg";
import PlusIcon from "../../assets/mobile_plus2.svg";
import SettingIcon from "../../assets/mobile_setting.svg";
import RightArrowIcon from "../../assets/right_arrow.svg";

type ScheduleItem =
  | {
      type: "itinerary";
      id: number;
      time: string;
      endTime: string;
      data: Itinerary;
    }
  | {
      type: "flight";
      id: string;
      time: string;
      endTime: string;
      data: FlightRead;
      segment: any;
      segmentIndex: number;
    };

function buildSchedulesForDate(
  dateStr: string,
  itineraries: Itinerary[] | undefined,
  flights: FlightRead[] | undefined,
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  (itineraries || [])
    .filter(it => dayjs(it.itineraryDate).format("YYYY-MM-DD") === dateStr)
    .sort((a, b) =>
      (a.startTime || "00:00:00").localeCompare(b.startTime || "00:00:00"),
    )
    .forEach(itinerary => {
      items.push({
        type: "itinerary",
        id: itinerary.id,
        time: formatTime(itinerary.startTime || "00:00:00"),
        endTime: formatTime(itinerary.endTime || "00:00:00"),
        data: itinerary,
      });
    });
  (flights || []).forEach(flight => {
    if (!flight.flightSegments?.length) return;
    flight.flightSegments.forEach((segment: any, index: number) => {
      const departureTime = dayjs(segment.departureTime);
      if (departureTime.format("YYYY-MM-DD") !== dateStr) return;
      items.push({
        type: "flight",
        id: `${flight.id}-segment-${index}`,
        time: convertUTCToLocalTime(segment.departureTime),
        endTime: convertUTCToLocalTime(segment.arrivalTime),
        data: flight,
        segment,
        segmentIndex: index,
      });
    });
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** 캘린더 `calendarTodayStr`보다 이후 중, 일정이 있는 가장 빠른 날 (이터너리·항공 출발일·숙박 숙박일) */
function collectNearestFutureScheduleDateStr(
  calendarTodayStr: string,
  itineraries: Itinerary[] | undefined,
  flights: FlightRead[] | undefined,
  accommodations: Accommodation[] | undefined,
): string | null {
  const dates = new Set<string>();
  (itineraries || []).forEach(it => {
    dates.add(dayjs(it.itineraryDate).format("YYYY-MM-DD"));
  });
  (flights || []).forEach(f => {
    f.flightSegments?.forEach((seg: any) => {
      dates.add(dayjs(seg.departureTime).format("YYYY-MM-DD"));
    });
  });
  (accommodations || []).forEach(acc => {
    let d = dayjs(acc.checkinDate).startOf("day");
    const end = dayjs(acc.checkoutDate).startOf("day");
    while (d.isBefore(end)) {
      dates.add(d.format("YYYY-MM-DD"));
      d = d.add(1, "day");
    }
  });
  const sorted = [...dates].filter(x => x > calendarTodayStr).sort();
  return sorted[0] ?? null;
}

export default function TodayScreen() {
  const { data: me } = useMe();
  const { selectedPlan, setSelectedPlan } = useSelectedPlan();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(
    null,
  );
  const [showItineraryDetail, setShowItineraryDetail] = useState(false);
  const [showItineraryEdit, setShowItineraryEdit] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(
    null,
  );
  const [selectedAccommodation, setSelectedAccommodation] =
    useState<Accommodation | null>(null);
  const [showAccommodationDetail, setShowAccommodationDetail] = useState(false);
  const [showAccommodationEdit, setShowAccommodationEdit] = useState(false);
  const [editingAccommodation, setEditingAccommodation] =
    useState<Accommodation | null>(null);
  const [showFlightDetail, setShowFlightDetail] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightRead | null>(null);
  const [selectedFlightSegment, setSelectedFlightSegment] =
    useState<FlightSegmentReadDto | null>(null);
  const [showFlightEdit, setShowFlightEdit] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightRead | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpenseFromDetail, setShowAddExpenseFromDetail] =
    useState(false);
  const [pendingMismatchResult, setPendingMismatchResult] = useState<{
    result: DocumentUploadAnalyzeResponse;
    filename?: string;
    pendingFiles?: LocalFile[];
  } | null>(null);
  const [addScheduleFlow, setAddScheduleFlow] =
    useState<AddScheduleFlow>("closed");
  const [timelineViewDate, setTimelineViewDate] = useState<dayjs.Dayjs | null>(
    null,
  );

  useEffect(() => {
    setTimelineViewDate(null);
  }, [selectedPlan?.id]);

  useEffect(() => {
    return guestPrompt.registerBeforeSignUpNavigation(() => {
      setProfileModalVisible(false);
      setShowItineraryEdit(false);
      setShowAccommodationEdit(false);
      setShowFlightEdit(false);
      setAddScheduleFlow("closed");
      setTimelineViewDate(null);
    });
  }, []);

  const queryClient = useQueryClient();
  const plansQuery = usePlansQuery();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);

  const calendarTodayStr = currentTime.format("YYYY-MM-DD");
  const timelineDateStr =
    timelineViewDate?.format("YYYY-MM-DD") ?? calendarTodayStr;
  const viewingCalendarToday = calendarTodayStr === timelineDateStr;
  const headerDateLabel = timelineViewDate
    ? formatKoreanDate(timelineViewDate)
    : getTodayKoreanDate();
  const timelineDayForCards = timelineViewDate ?? currentTime;

  const { data: todayExpensesFromApi = [], refetch: refetchTodayExpenses } =
    useExpensesQuery(selectedPlan?.id, timelineDateStr);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);

  useEffect(() => {
    const checkSchedule = () => {
      const now = dayjs();
      setCurrentTime(prevTime => {
        const prevDateStr = prevTime.format("YYYY-MM-DD");
        const prevTimeStr = prevTime.format("HH:mm:ss");
        const nowDateStr = now.format("YYYY-MM-DD");
        const nowTimeStr = now.format("HH:mm:ss");

        if (prevDateStr !== nowDateStr || prevTimeStr !== nowTimeStr) {
          return now;
        }
        return prevTime;
      });
    };

    const timer = setInterval(checkSchedule, 1000);

    return () => clearInterval(timer);
  }, []);

  const realTodaySchedules = useMemo(
    () =>
      buildSchedulesForDate(
        calendarTodayStr,
        planData.itineraries,
        planData.flights,
      ),
    [calendarTodayStr, planData.itineraries, planData.flights],
  );

  const todaySchedules = useMemo(
    () =>
      buildSchedulesForDate(
        timelineDateStr,
        planData.itineraries,
        planData.flights,
      ),
    [timelineDateStr, planData.itineraries, planData.flights],
  );

  const nearestFutureScheduleDateStr = useMemo(
    () =>
      collectNearestFutureScheduleDateStr(
        calendarTodayStr,
        planData.itineraries,
        planData.flights,
        planData.accommodations,
      ),
    [
      calendarTodayStr,
      planData.itineraries,
      planData.flights,
      planData.accommodations,
    ],
  );

  const hasAnyFlightSegment = useMemo(() => {
    return (planData.flights || []).some(
      (f: FlightRead) =>
        Array.isArray(f.flightSegments) && f.flightSegments.length > 0,
    );
  }, [planData.flights]);

  /** 플랜은 있으나 이터너리·항공 구간·숙소가 하나도 없을 때 */
  const planHasNoSchedulesYet = useMemo(() => {
    if (!selectedPlan) return false;
    const noItineraries = !planData.itineraries?.length;
    const noAccommodations = !planData.accommodations?.length;
    return noItineraries && !hasAnyFlightSegment && noAccommodations;
  }, [
    selectedPlan,
    planData.itineraries,
    hasAnyFlightSegment,
    planData.accommodations,
  ]);

  const currentActivity = useMemo((): ScheduleItem | null => {
    if (!viewingCalendarToday) return null;
    return (
      todaySchedules.find((item: ScheduleItem) => {
        if (item.type === "itinerary") {
          const startDateTime = dayjs(`${timelineDateStr} ${item.time}`);
          let endDateTime = dayjs(`${timelineDateStr} ${item.endTime}`);
          if (item.endTime < item.time) endDateTime = endDateTime.add(1, "day");
          return (
            currentTime.isAfter(startDateTime) &&
            currentTime.isBefore(endDateTime)
          );
        }
        const dep = dayjs(item.segment.departureTime);
        const arr = dayjs(item.segment.arrivalTime);
        return currentTime.isAfter(dep) && currentTime.isBefore(arr);
      }) ?? null
    );
  }, [viewingCalendarToday, todaySchedules, timelineDateStr, currentTime]);

  const nextActivityIndex = useMemo(() => {
    if (!viewingCalendarToday) {
      return todaySchedules.length > 0 ? 0 : -1;
    }
    return todaySchedules.findIndex((item: ScheduleItem) => {
      if (item.type === "itinerary") {
        const startDateTime = dayjs(`${timelineDateStr} ${item.time}`);
        return currentTime.isBefore(startDateTime);
      }
      const dep = dayjs(item.segment.departureTime);
      return currentTime.isBefore(dep);
    });
  }, [viewingCalendarToday, todaySchedules, timelineDateStr, currentTime]);

  const todayAccommodations = useMemo(() => {
    if (!planData.accommodations || planData.accommodations.length === 0) {
      return [];
    }

    return planData.accommodations.filter((accommodation: any) => {
      const checkinDate = dayjs(accommodation.checkinDate).format("YYYY-MM-DD");
      const checkoutDate = dayjs(accommodation.checkoutDate).format(
        "YYYY-MM-DD",
      );
      return checkinDate <= timelineDateStr && checkoutDate >= timelineDateStr;
    });
  }, [planData.accommodations, timelineDateStr]);

  /** 실제 오늘(calendarTodayStr)에 해당하는 숙박 — 빈 상태 카드 판별용 */
  const realTodayAccommodations = useMemo(() => {
    if (!planData.accommodations?.length) return [];
    return planData.accommodations.filter((accommodation: any) => {
      const checkinDate = dayjs(accommodation.checkinDate).format("YYYY-MM-DD");
      const checkoutDate = dayjs(accommodation.checkoutDate).format(
        "YYYY-MM-DD",
      );
      return checkinDate <= calendarTodayStr && checkoutDate >= calendarTodayStr;
    });
  }, [planData.accommodations, calendarTodayStr]);

  /** 조회일에 타임라인 항목 또는 당일 숙박이 있으면 체크리스트·비용 노출 */
  const showTodayTimelineExtras =
    !!selectedPlan &&
    !planData.isLoading &&
    (todaySchedules.length > 0 || todayAccommodations.length > 0);

  /** 실제 오늘: 타임라인·당일 숙박 모두 없고, 플랜에는 다른 데이터가 있을 때 */
  const showNoTodayScheduleOtherDaysCard =
    !!selectedPlan &&
    !planData.isLoading &&
    !timelineViewDate &&
    realTodaySchedules.length === 0 &&
    realTodayAccommodations.length === 0 &&
    !planHasNoSchedulesYet;

  const todayFlights = useMemo(
    () =>
      todaySchedules.filter(
        (item): item is Extract<ScheduleItem, { type: "flight" }> =>
          item.type === "flight",
      ),
    [todaySchedules],
  );

  const timelineDateSegment = useMemo(() => {
    const segments = planData.plan?.segments;
    if (!segments) return null;
    return segments.find(
      seg => seg.startDate <= timelineDateStr && timelineDateStr <= seg.endDate,
    ) ?? null;
  }, [planData.plan?.segments, timelineDateStr]);

  const todayExpenses = useMemo(() => {
    let total = 0;
    const byCategory: Record<string, number> = {};

    if (todayExpensesFromApi && Array.isArray(todayExpensesFromApi)) {
      todayExpensesFromApi.forEach((expense: any) => {
        const amount = expense.amount || 0;
        total += amount;
        const category = expense.category || "기타";
        byCategory[category] = (byCategory[category] || 0) + amount;
      });
    }

    return { total, byCategory };
  }, [todayExpensesFromApi]);

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString("ko-KR")}`;
  };

  const _formatExpenseDetail = () => {
    const categories = Object.entries(todayExpenses.byCategory);
    if (categories.length === 0) return "지출 내역이 없습니다";

    return categories
      .map(([category, amount]) => {
        const categoryLabel =
          categoryLabels[category as keyof typeof categoryLabels] || category;
        return `${categoryLabel} ${formatCurrency(amount)}`;
      })
      .join(" · ");
  };

  const handleDeleteItinerary = useCallback(
    async (itinerary: Itinerary) => {
      try {
        await itinerariesApi.deleteItinerary(itinerary.id);
        planData.removeItinerary(itinerary.id);
        queryClient.invalidateQueries({
          queryKey: ["expenses", selectedPlan?.id],
        });
        Alert.alert("삭제완료", "일정이 삭제되었습니다.");
      } catch {
        Alert.alert("알림", "일정 삭제에 실패했습니다.");
      }
    },
    [planData, queryClient, selectedPlan?.id],
  );

  const handleDeleteFlight = useCallback(
    async (flight: FlightRead) => {
      try {
        await flightsApi.deleteFlight(flight.id);
        planData.removeFlight(flight.id);
        queryClient.invalidateQueries({
          queryKey: ["expenses", selectedPlan?.id],
        });
        Alert.alert("삭제완료", "항공편이 삭제되었습니다.");
      } catch {
        Alert.alert("알림", "항공편 삭제에 실패했습니다.");
      }
    },
    [planData, queryClient, selectedPlan?.id],
  );

  const handleRouteMismatchResult = useCallback(
    (result: DocumentUploadAnalyzeResponse, filename?: string, pendingFiles?: LocalFile[]) => {
      const targetType = result.inferredItemType ?? result.draft?.itemType;
      setShowItineraryEdit(false);
      setEditingItinerary(null);
      setShowAccommodationEdit(false);
      setEditingAccommodation(null);
      setShowFlightEdit(false);
      setEditingFlight(null);
      setShowAddExpenseFromDetail(false);
      setPendingMismatchResult({ result, filename, pendingFiles });
      if (targetType === "flight") setShowFlightEdit(true);
      else if (targetType === "accommodation") setShowAccommodationEdit(true);
      else if (targetType === "itinerary") setShowItineraryEdit(true);
      else if (targetType === "expense") setShowAddExpenseFromDetail(true);
    },
    [],
  );

  const timelineSwipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const activeTimelineSwipeKey = useRef<string | null>(null);

  const closeOpenTimelineSwipe = useCallback(() => {
    const key = activeTimelineSwipeKey.current;
    if (key == null) return;
    timelineSwipeRefs.current.get(key)?.close();
    activeTimelineSwipeKey.current = null;
  }, []);

  const openAddScheduleFlow = useCallback(() => {
    closeOpenTimelineSwipe();
    setAddScheduleFlow("method");
  }, [closeOpenTimelineSwipe]);

  if (plansQuery.isLoading && plansQuery.plans.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (plansQuery.plans.length === 0) {
    const noPlanFeatures = [
      "여행 일정 관리에 최적화된 솔루션",
      "AI로 체크리스트 추천",
      "친구들과 일정 공유",
    ] as const;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.noPlanScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await plansQuery.fetchPlans();
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.noPlanHeader}>
            <View style={styles.noPlanHeaderSpacer} />
            <Pressable
              style={styles.settingsButton}
              onPress={() => setProfileModalVisible(true)}
              hitSlop={8}
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
                {noPlanFeatures.map(line => (
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
          transparent={true}
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeOpenTimelineSwipe}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([
                  plansQuery.fetchPlans(),
                  selectedPlan?.publicId
                    ? planData.fetchPlanData(selectedPlan.publicId)
                    : Promise.resolve(),
                  refetchTodayExpenses(),
                  queryClient.refetchQueries({
                    queryKey: ["checklist", selectedPlan?.publicId],
                  }),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.white}
            colors={[colors.white]}
          />
        }
      >
        <Pressable
          style={styles.scrollContentPressable}
          onPress={closeOpenTimelineSwipe}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.date}>{headerDateLabel}</Text>
                {timelineViewDate && (
                  <View style={styles.timelinePreviewBanner}>
                    <Text style={styles.timelinePreviewHint}>
                      오늘이 아닌 {formatKoreanDate(timelineViewDate)} 일정을
                      보고 있어요
                    </Text>
                    <Pressable
                      onPress={() => {
                        closeOpenTimelineSwipe();
                        setTimelineViewDate(null);
                      }}
                      hitSlop={8}
                      style={styles.backToTodayLink}
                    >
                      <Text style={styles.backToTodayLinkText}>
                        오늘로 이동
                      </Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.tripTitleWrapper}>
                  <Pressable
                    style={styles.tripTitleContainer}
                    onPress={() => {
                      closeOpenTimelineSwipe();
                      setShowPlanSelector(true);
                    }}
                  >
                    <Text style={styles.tripTitle}>
                      {selectedPlan?.title || "여행을 선택해주세요"}
                    </Text>
                    <DropdownIcon
                      width={20}
                      height={20}
                      color={colors.gray600}
                    />
                  </Pressable>
                </View>
                <Text style={styles.greeting}>오늘의 일정 준비되셨나요?</Text>
              </View>
              <Pressable
                style={styles.settingsButton}
                onPress={() => {
                  closeOpenTimelineSwipe();
                  setProfileModalVisible(true);
                }}
              >
                <SettingIcon width={24} height={24} color={colors.gray600} />
              </Pressable>
            </View>
          </View>

          {/* 현재 진행 중 활동 카드 */}
          {currentActivity && (
            <Pressable
              style={[styles.cardBase, styles.currentCard]}
              onPress={() => {
                closeOpenTimelineSwipe();
                if (currentActivity.type === "flight") {
                  setSelectedFlight(currentActivity.data);
                  setSelectedFlightSegment(currentActivity.segment);
                  setShowFlightDetail(true);
                } else {
                  setSelectedItinerary(currentActivity.data);
                  setShowItineraryDetail(true);
                }
              }}
            >
              <View style={styles.currentCardHeader}>
                <View style={styles.statusBadge}>
                  <Animated.View
                    style={[
                      styles.pulse,
                      {
                        opacity: pulseAnim,
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>진행 중</Text>
                </View>
                {currentActivity.endTime && (
                  <View style={styles.endTimeBox}>
                    <Text style={styles.endTime}>
                      {currentActivity.endTime} 종료
                    </Text>
                  </View>
                )}
              </View>

              {currentActivity.type === "flight" ? (
                <>
                  <View style={styles.flightTitleRow}>
                    <View style={styles.flightIconWrap}>
                      <FlightIcon width={20} height={20} color={colors.black} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {currentActivity.segment.departureAirport} →{" "}
                      {currentActivity.segment.arrivalAirport}
                    </Text>
                  </View>
                  {currentActivity.segment.flightNumber && (
                    <Text style={styles.cardLocation} numberOfLines={1}>
                      {currentActivity.segment.flightNumber}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentActivity.data.title || "활동"}
                  </Text>
                  {currentActivity.data.location && (
                    <View style={styles.locationRow}>
                      <LocationIcon
                        width={16}
                        height={16}
                        color={colors.gray600}
                      />
                      <Text
                        style={styles.cardLocation}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {currentActivity.data.location}
                      </Text>
                    </View>
                  )}
                  {currentActivity.data.description && (
                    <View style={styles.noteBox}>
                      <Text
                        style={styles.note}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        "{currentActivity.data.description}"
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          )}

          {/* 타임라인 섹션 (이터너리·항공 또는 당일 숙박이 있으면 헤더 노출) */}
          {(todaySchedules.length > 0 || todayAccommodations.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>타임라인</Text>

              {todaySchedules.length > 0 &&
                todaySchedules.map((item: ScheduleItem, index: number) => {
                  const isDone =
                    currentActivity &&
                    (currentActivity.type === "itinerary"
                      ? item.type === "itinerary" &&
                        item.id === currentActivity.id
                      : item.type === "flight" &&
                        item.id === currentActivity.id)
                      ? false
                      : index <
                        (nextActivityIndex === -1
                          ? todaySchedules.length
                          : nextActivityIndex);
                  const isNext = index === nextActivityIndex;
                  const startTime = item.time;

                  if (item.type === "flight") {
                    const flightSwipeKey = `flight-${item.id}`;
                    const flight = item.data;
                    return (
                      <View
                        key={item.id}
                        style={[styles.timelineItem, isDone && styles.doneItem]}
                      >
                        <View style={styles.swipeItineraryShadow}>
                          <View style={styles.swipeItineraryClip}>
                            <Swipeable
                              ref={el => {
                                if (el) {
                                  timelineSwipeRefs.current.set(
                                    flightSwipeKey,
                                    el,
                                  );
                                } else {
                                  timelineSwipeRefs.current.delete(
                                    flightSwipeKey,
                                  );
                                }
                              }}
                              friction={2}
                              overshootRight={false}
                              containerStyle={styles.swipeItinerarySwipeable}
                              onSwipeableOpen={() => {
                                const prev = activeTimelineSwipeKey.current;
                                if (prev !== null && prev !== flightSwipeKey) {
                                  timelineSwipeRefs.current.get(prev)?.close();
                                }
                                activeTimelineSwipeKey.current = flightSwipeKey;
                              }}
                              onSwipeableClose={() => {
                                if (
                                  activeTimelineSwipeKey.current ===
                                  flightSwipeKey
                                ) {
                                  activeTimelineSwipeKey.current = null;
                                }
                              }}
                              renderRightActions={() => (
                                <View style={styles.swipeDeleteContainer}>
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="항공편 삭제"
                                    style={styles.swipeDeleteButton}
                                    onPress={() => handleDeleteFlight(flight)}
                                  >
                                    <Text style={styles.swipeDeleteLabel}>
                                      삭제
                                    </Text>
                                  </Pressable>
                                </View>
                              )}
                            >
                              <Pressable
                                style={styles.timelineItineraryCard}
                                onPress={() => {
                                  const hadSwipeOpenHere =
                                    activeTimelineSwipeKey.current ===
                                    flightSwipeKey;
                                  closeOpenTimelineSwipe();
                                  if (hadSwipeOpenHere) return;
                                  setSelectedFlight(flight);
                                  setSelectedFlightSegment(item.segment);
                                  setShowFlightDetail(true);
                                }}
                              >
                                <View style={styles.timelineCardHeader}>
                                  <Text
                                    style={[
                                      styles.timelineTime,
                                      isNext && styles.nextTime,
                                    ]}
                                  >
                                    {startTime}
                                  </Text>
                                  {isNext && (
                                    <View style={styles.nextButton}>
                                      <Text style={styles.nextButtonText}>
                                        다음
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.flightTitleRow}>
                                  <View style={styles.flightIconWrap}>
                                    <FlightIcon
                                      width={16}
                                      height={16}
                                      color={colors.black}
                                    />
                                  </View>
                                  <Text
                                    style={styles.itemTitle}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {item.segment.departureAirport} →{" "}
                                    {item.segment.arrivalAirport}
                                  </Text>
                                </View>
                                {item.segment.flightNumber && (
                                  <Text
                                    style={styles.itemLocation}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {item.segment.flightNumber}
                                  </Text>
                                )}
                              </Pressable>
                            </Swipeable>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  const itinerary = item.data;
                  const itinerarySwipeKey = `itinerary-${itinerary.id}`;
                  return (
                    <View
                      key={item.id}
                      style={[styles.timelineItem, isDone && styles.doneItem]}
                    >
                      <View style={styles.swipeItineraryShadow}>
                        <View style={styles.swipeItineraryClip}>
                          <Swipeable
                            ref={el => {
                              if (el) {
                                timelineSwipeRefs.current.set(
                                  itinerarySwipeKey,
                                  el,
                                );
                              } else {
                                timelineSwipeRefs.current.delete(
                                  itinerarySwipeKey,
                                );
                              }
                            }}
                            friction={2}
                            overshootRight={false}
                            containerStyle={styles.swipeItinerarySwipeable}
                            onSwipeableOpen={() => {
                              const prev = activeTimelineSwipeKey.current;
                              if (prev !== null && prev !== itinerarySwipeKey) {
                                timelineSwipeRefs.current.get(prev)?.close();
                              }
                              activeTimelineSwipeKey.current =
                                itinerarySwipeKey;
                            }}
                            onSwipeableClose={() => {
                              if (
                                activeTimelineSwipeKey.current ===
                                itinerarySwipeKey
                              ) {
                                activeTimelineSwipeKey.current = null;
                              }
                            }}
                            renderRightActions={() => (
                              <View style={styles.swipeDeleteContainer}>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="일정 삭제"
                                  style={styles.swipeDeleteButton}
                                  onPress={() =>
                                    handleDeleteItinerary(itinerary)
                                  }
                                >
                                  <Text style={styles.swipeDeleteLabel}>
                                    삭제
                                  </Text>
                                </Pressable>
                              </View>
                            )}
                          >
                            <Pressable
                              style={styles.timelineItineraryCard}
                              onPress={() => {
                                const hadSwipeOpenHere =
                                  activeTimelineSwipeKey.current ===
                                  itinerarySwipeKey;
                                closeOpenTimelineSwipe();
                                if (hadSwipeOpenHere) return;
                                setSelectedItinerary(itinerary);
                                setShowItineraryDetail(true);
                              }}
                            >
                              <View style={styles.timelineCardHeader}>
                                <Text
                                  style={[
                                    styles.timelineTime,
                                    isNext && styles.nextTime,
                                  ]}
                                >
                                  {startTime}
                                </Text>
                                {isNext && (
                                  <Pressable style={styles.nextButton}>
                                    <Text style={styles.nextButtonText}>
                                      다음
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                              <Text
                                style={styles.itemTitle}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {itinerary.title || "활동"}
                              </Text>
                              {itinerary.location && (
                                <Text
                                  style={styles.itemLocation}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {itinerary.location}
                                </Text>
                              )}
                              {itinerary.description && (
                                <Text
                                  style={styles.itemDescription}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {itinerary.description}
                                </Text>
                              )}
                            </Pressable>
                          </Swipeable>
                        </View>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          {showNoTodayScheduleOtherDaysCard && (
            <View style={styles.section}>
              <View style={[styles.cardBase, styles.scheduleEmptyStateCard]}>
                <Text style={styles.scheduleEmptyStateTitle}>
                  해당 여행의 오늘 일정은 없어요!
                </Text>
                <Text style={styles.scheduleEmptyStateSubtitle}>
                  다른 날짜의 일정을 보거나 오늘 일정을 추가할 수 있어요
                </Text>
                {nearestFutureScheduleDateStr ? (
                  <>
                    <Pressable
                      style={[
                        styles.scheduleEmptyStateSecondaryButton,
                        styles.scheduleEmptyStateButtonFullWidth,
                      ]}
                      onPress={() => {
                        setTimelineViewDate(
                          dayjs(nearestFutureScheduleDateStr),
                        );
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="가장 가까운 일정으로 이동"
                    >
                      <Text
                        style={styles.scheduleEmptyStateSecondaryButtonLabel}
                      >
                        가장 가까운 일정으로 이동
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.scheduleEmptyStatePrimaryButton,
                        styles.scheduleEmptyStatePrimaryButtonStacked,
                      ]}
                      onPress={openAddScheduleFlow}
                      accessibilityRole="button"
                      accessibilityLabel="오늘 일정 추가"
                    >
                      <Text style={styles.scheduleEmptyStatePrimaryButtonLabel}>
                        오늘 일정 추가
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={[
                      styles.scheduleEmptyStatePrimaryButton,
                      styles.scheduleEmptyStatePrimaryButtonFirst,
                    ]}
                    onPress={openAddScheduleFlow}
                    accessibilityRole="button"
                    accessibilityLabel="오늘 일정 추가"
                  >
                    <Text style={styles.scheduleEmptyStatePrimaryButtonLabel}>
                      오늘 일정 추가
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {planHasNoSchedulesYet && selectedPlan && !planData.isLoading && (
            <View style={styles.section}>
              <View style={[styles.cardBase, styles.scheduleEmptyStateCard]}>
                <Text style={styles.scheduleEmptyStateTitle}>
                  해당 여행에 저장된 일정이 없어요!
                </Text>
                <Text style={styles.scheduleEmptyStateSubtitle}>
                  일정을 추가해보세요
                </Text>
                <Pressable
                  style={[
                    styles.scheduleEmptyStatePrimaryButton,
                    styles.scheduleEmptyStatePrimaryButtonFirst,
                  ]}
                  onPress={openAddScheduleFlow}
                  accessibilityRole="button"
                  accessibilityLabel="일정 추가"
                >
                  <Text style={styles.scheduleEmptyStatePrimaryButtonLabel}>
                    일정 추가
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {showTodayTimelineExtras && (
            <View style={styles.checklistWrapper}>
              <WeeklyChecklistCard
                planPublicId={selectedPlan?.publicId}
                selectedDate={timelineDayForCards}
                itineraries={planData.itineraries}
              />
            </View>
          )}

          {/* 오늘의 비용 섹션 */}
          {showTodayTimelineExtras && (
            <View style={styles.section}>
              <Pressable
                style={[styles.cardBase, styles.costCardPrimary]}
                onPress={() => {
                  closeOpenTimelineSwipe();
                  setShowExpenseDetail(true);
                }}
              >
                <View style={styles.costCardHeader}>
                  <View style={styles.costCardHeaderLeft}>
                    <ExpenseIcon width={20} height={20} color={colors.white} />
                    <Text style={styles.costCardHeaderTitle}>
                      오늘의 여행 비용
                    </Text>
                  </View>
                  <RightArrowIcon width={20} height={20} color={colors.white} />
                </View>
                {todayExpenses.total > 0 ? (
                  <>
                    <Text style={styles.costAmountPrimary}>
                      {formatCurrency(todayExpenses.total)}
                    </Text>
                    <Text style={styles.costDetailPrimary}>
                      터치하여 상세 내역 확인
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.costAmountPrimary}>0원</Text>
                    <Text style={styles.costDetailPrimary}>
                      터치하여 상세 내역 확인
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* 여행 정보(숙박/항공) 섹션 - 데이터 있을 때만 노출 */}
          {(todayAccommodations.length > 0 || todayFlights.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>여행 정보 (Reference)</Text>
              {todayAccommodations.map((accommodation: Accommodation) => {
                const isCheckout =
                  dayjs(accommodation.checkoutDate).format("YYYY-MM-DD") ===
                  timelineDateStr;
                return (
                  <Pressable
                    key={accommodation.id}
                    style={[styles.cardBase, styles.accommodationCard]}
                    onPress={() => {
                      closeOpenTimelineSwipe();
                      setSelectedAccommodation(accommodation);
                      setShowAccommodationDetail(true);
                    }}
                  >
                    <View style={styles.accommodationHeader}>
                      <View style={styles.accommodationIconBox}>
                        <AccommodationIcon
                          width={20}
                          height={20}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.accommodationHeaderText}>
                        <Text style={styles.accommodationLabel}>
                          {isCheckout ? "오늘 체크아웃" : "오늘의 숙소"}
                        </Text>
                        <Text style={styles.itemTitle}>
                          {accommodation.name}
                        </Text>
                        <Text style={styles.accommodationCheckin}>
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
              {todayFlights.map(item => (
                <Pressable
                  key={item.id}
                  style={[styles.cardBase, styles.accommodationCard]}
                  onPress={() => {
                    closeOpenTimelineSwipe();
                    setSelectedFlight(item.data);
                    setSelectedFlightSegment(item.segment);
                    setShowFlightDetail(true);
                  }}
                >
                  <View style={styles.accommodationHeader}>
                    <View style={styles.accommodationIconBox}>
                      <FlightIcon
                        width={20}
                        height={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.accommodationHeaderText}>
                      <Text style={styles.accommodationLabel}>오늘의 항공</Text>
                      <Text style={styles.itemTitle}>
                        {item.segment.departureAirport} →{" "}
                        {item.segment.arrivalAirport}
                      </Text>
                      <Text style={styles.accommodationCheckin}>
                        출발 {item.time}
                        {item.segment.flightNumber &&
                          ` · ${item.segment.flightNumber}`}
                      </Text>
                    </View>
                  </View>
                  <RightArrowIcon
                    width={12}
                    height={12}
                    color={colors.gray600}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent={true}
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
        plans={plansQuery.plans}
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
              const remaining = plansQuery.plans.filter(p => p.id !== plan.id);
              setSelectedPlan(remaining[0] ?? null);
            }
            setShowPlanSelector(false);
            Alert.alert("성공", "여행이 삭제되었습니다.");
          } catch (_error) {
            Alert.alert("알림", "여행 삭제에 실패했습니다.");
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

      <ExpenseDetailModal
        visible={showExpenseDetail && !showAddExpenseFromDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={todayExpensesFromApi ?? []}
        total={todayExpenses.total}
        byCategory={todayExpenses.byCategory}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        exDate={timelineDateStr}
        onExpenseAdd={() => {
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onAddExpensePress={() => {
          setShowExpenseDetail(false);
          setShowAddExpenseFromDetail(true);
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseFromDetail}
        onClose={opts => {
          setPendingMismatchResult(null);
          setShowAddExpenseFromDetail(false);
          if (opts?.fromSave) {
            setShowExpenseDetail(false);
          } else {
            setShowExpenseDetail(true);
          }
        }}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        defaultExDate={timelineDateStr}
        onExpenseAdd={expense => {
          planData.addExpense?.(expense);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
          setShowExpenseDetail(false);
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
        onEdit={itinerary => {
          setShowItineraryDetail(false);
          setEditingItinerary(itinerary);
          setShowItineraryEdit(true);
        }}
        onDelete={handleDeleteItinerary}
      />

      <ItineraryEditModal
        visible={showItineraryEdit}
        onClose={opts => {
          setPendingMismatchResult(null);
          const itineraryToShow = editingItinerary;
          setShowItineraryEdit(false);
          setEditingItinerary(null);
          if (!opts?.fromSave && itineraryToShow) {
            setSelectedItinerary(itineraryToShow);
            setShowItineraryDetail(true);
          }
        }}
        itinerary={editingItinerary}
        planId={selectedPlan?.id ?? 0}
        defaultCountry={timelineDateSegment?.country}
        defaultCity={timelineDateSegment?.city}
        onSave={async itinerary => {
          planData.addItinerary(itinerary);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onDelete={async itineraryId => {
          planData.removeItinerary(itineraryId);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        pendingAiResult={pendingMismatchResult}
        onRouteMismatchResult={handleRouteMismatchResult}
      />

      <AccommodationDetailModal
        visible={showAccommodationDetail}
        onClose={() => {
          setShowAccommodationDetail(false);
          setSelectedAccommodation(null);
        }}
        accommodation={selectedAccommodation}
        onEdit={accommodation => {
          setShowAccommodationDetail(false);
          setEditingAccommodation(accommodation);
          setShowAccommodationEdit(true);
        }}
        onDelete={async accommodation => {
          try {
            await accommodationsApi.deleteAccommodation(accommodation.id);
            planData.removeAccommodation(accommodation.id);
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan?.id],
            });
            Alert.alert("삭제완료", "숙소가 삭제되었습니다.");
          } catch (_error) {
            Alert.alert("알림", "숙소 삭제에 실패했습니다.");
          }
        }}
      />

      <AccommodationEditModal
        visible={showAccommodationEdit}
        onClose={opts => {
          setPendingMismatchResult(null);
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
        defaultCountry={timelineDateSegment?.country}
        defaultCity={timelineDateSegment?.city}
        onSave={async updated => {
          planData.addAccommodation(updated);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onDelete={async accommodationId => {
          planData.removeAccommodation(accommodationId);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        pendingAiResult={pendingMismatchResult}
        onRouteMismatchResult={handleRouteMismatchResult}
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
        onEdit={flight => {
          setShowFlightDetail(false);
          setEditingFlight(flight);
          setShowFlightEdit(true);
        }}
        onDelete={handleDeleteFlight}
      />

      <FlightEditModal
        visible={showFlightEdit}
        onClose={opts => {
          setPendingMismatchResult(null);
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
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        onDelete={async flightId => {
          planData.removeFlight(flightId);
          queryClient.invalidateQueries({
            queryKey: ["expenses", selectedPlan?.id],
          });
        }}
        pendingAiResult={pendingMismatchResult}
        onRouteMismatchResult={handleRouteMismatchResult}
      />

      {selectedPlan && (
        <Pressable style={styles.fab} onPress={openAddScheduleFlow} hitSlop={8}>
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
        selectedDate={timelineViewDate ?? dayjs(calendarTodayStr)}
        defaultCountry={timelineDateSegment?.country}
        defaultCity={timelineDateSegment?.city}
        planData={{
          addItinerary: planData.addItinerary,
          addAccommodation: planData.addAccommodation,
          addFlight: planData.addFlight,
          removeItinerary: planData.removeItinerary,
          removeAccommodation: planData.removeAccommodation,
          removeFlight: planData.removeFlight,
        }}
        onRefresh={async () => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPlanScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  noPlanHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  noPlanHeaderSpacer: {
    flex: 1,
  },
  noPlanCardWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 32,
  },
  noPlanCard: {
    width: "100%",
    marginHorizontal: 30,
    alignSelf: "center",
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
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
    marginBottom: 12,
  },
  noPlanSubcopy: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: "center",
    marginBottom: 32,
  },
  noPlanFeatureBox: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 8,
  },
  noPlanFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noPlanBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray700,
    marginTop: 8,
  },
  noPlanFeatureText: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  noPlanCta: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
  },
  noPlanCtaDisabled: {
    opacity: 0.5,
  },
  noPlanCtaLabel: {
    ...textStyles.h5,
    color: colors.white,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  scrollContentPressable: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: colors.gray300,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextContainer: {
    flex: 1,
  },
  settingsButton: {
    padding: 4,
    marginTop: -4,
  },
  date: {
    ...textStyles.h7,
    color: colors.gray700,
    marginBottom: 8,
  },
  timelinePreviewBanner: {
    alignSelf: "stretch",
    marginTop: -4,
    marginBottom: 8,
  },
  timelinePreviewHint: {
    ...textStyles.body4,
    color: colors.primary,
    marginBottom: 6,
  },
  backToTodayLink: {
    alignSelf: "flex-start",
  },
  backToTodayLinkText: {
    ...textStyles.h7,
    color: colors.primary,
  },
  tripTitleWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  tripTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginRight: 8,
  },
  greeting: {
    ...textStyles.body3,
    color: colors.black,
  },

  cardBase: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: colors.gray700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  /** 플랜 일정 비어 있음 / 오늘만 비어 있음 등 공통 안내 카드 */
  scheduleEmptyStateCard: {
    alignItems: "center",
    paddingVertical: 20,
  },
  scheduleEmptyStateTitle: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: "center",
  },
  scheduleEmptyStateSubtitle: {
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  scheduleEmptyStateButtonFullWidth: {
    width: "100%",
  },
  scheduleEmptyStateSecondaryButton: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleEmptyStateSecondaryButtonLabel: {
    ...textStyles.h5,
    color: colors.black,
  },
  scheduleEmptyStatePrimaryButton: {
    width: "100%",
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleEmptyStatePrimaryButtonFirst: {
    marginTop: 20,
  },
  scheduleEmptyStatePrimaryButtonStacked: {
    marginTop: 8,
  },
  scheduleEmptyStatePrimaryButtonLabel: {
    ...textStyles.h5,
    color: colors.white,
  },
  currentCard: {
    marginBottom: 16,
  },
  currentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  statusText: {
    ...textStyles.h7,
    color: colors.primary,
  },
  endTimeBox: {
    backgroundColor: colors.gray300,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  endTime: {
    ...textStyles.h9,
    color: colors.gray700,
  },
  cardTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLocation: {
    ...textStyles.body3,
    color: colors.gray600,
    marginLeft: 4,
  },
  noteBox: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  note: {
    ...textStyles.body3,
    color: colors.primary,
  },

  checklistWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: -4,
  },
  section: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.black,
    marginBottom: 16,
    marginHorizontal: 16,
  },

  swipeItineraryShadow: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    shadowColor: colors.gray700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  swipeItineraryClip: {
    borderRadius: 16,
    overflow: "hidden",
  },
  swipeItinerarySwipeable: {
    backgroundColor: colors.white,
  },
  swipeDeleteContainer: {
    width: 50,
    alignSelf: "stretch",
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineItineraryCard: {
    padding: 20,
    backgroundColor: colors.white,
  },
  swipeDeleteLabel: {
    ...textStyles.h9,
    color: colors.white,
    fontWeight: "600",
  },
  timelineItem: {
    marginBottom: 12,
  },
  doneItem: {
    opacity: 0.5,
  },
  timelineTime: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  nextTime: {
    color: colors.primary,
  },
  itemTitle: {
    ...textStyles.h6,
    color: colors.black,
    marginBottom: 4,
  },
  itemLocation: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  itemDescription: {
    ...textStyles.body4,
    color: colors.gray500,
    marginTop: 4,
  },
  flightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flightIconWrap: {
    marginTop: -4,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextButtonText: {
    ...textStyles.h9,
    color: colors.primary,
  },

  accommodationCard: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accommodationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  accommodationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0, 122, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  accommodationHeaderText: {
    flex: 1,
  },
  accommodationLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  accommodationCheckin: {
    ...textStyles.body4,
    color: colors.gray600,
    marginTop: 4,
  },
  accommodationDates: {
    marginTop: 8,
    gap: 8,
  },
  accommodationDateText: {
    ...textStyles.body4,
    color: colors.gray600,
  },

  costCardPrimary: {
    backgroundColor: colors.primary,
    padding: 20,
  },
  costCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  costCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  costCardHeaderTitle: {
    ...textStyles.h6,
    color: colors.white,
  },
  costAmountPrimary: {
    ...textStyles.h2,
    color: colors.white,
    marginBottom: 8,
  },
  costDetailPrimary: {
    ...textStyles.body3,
    color: colors.white,
    opacity: 0.9,
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
  emptyText: {
    ...textStyles.body3,
    color: colors.gray500,
    textAlign: "center",
    paddingVertical: 8,
  },
});
