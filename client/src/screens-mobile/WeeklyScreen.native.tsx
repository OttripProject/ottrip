import AddPlanModal from "@/components/modals/mobile/AddPlanModal.native";
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
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import {
  convertUTCToLocalTime,
  formatKoreanDate,
  formatTime,
  getWeekCalendar,
} from "@/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AddScheduleFlow = "closed" | "method" | "direct" | "ai";
import WeeklyChecklistCard from "@/components/cards/WeeklyChecklistCard.native";
import AccommodationDetailModal from "@/components/modals/mobile/AccommodationDetailModal.native";
import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import FlightDetailModal from "@/components/modals/mobile/FlightDetailModal.native";
import FlightEditModal from "@/components/modals/mobile/FlightEditModal.native";
import ItineraryDetailModal from "@/components/modals/mobile/ItineraryDetailModal.native";
import ItineraryEditModal from "@/components/modals/mobile/ItineraryEditModal.native";
import TravelInfoModal from "@/components/modals/mobile/TravelInfoModal.native";
import { useMe } from "@/hooks/useMe";
import { accommodationsApi } from "@/services/accommodations";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import CalendarModal from "@/ui/components/CalendarModal.native";
import { guestPrompt } from "@/utils/guestPrompt";
import FlightIcon from "../../assets/airplane.svg";
import LeftArrowIcon from "../../assets/left_arrow.svg";
import AccommodationIcon from "../../assets/mobile_accomodation.svg";
import CalendarIcon from "../../assets/mobile_calendar_black.svg";
import CautionIcon from "../../assets/mobile_caution.svg";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import InformIcon from "../../assets/mobile_inform.svg";
import PlusIcon from "../../assets/mobile_plus2.svg";
import RightArrowIcon from "../../assets/right_arrow.svg";

export default function WeeklyScreen() {
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
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(
    null,
  );
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
    const currentIndex = weekCalendar.findIndex(item =>
      item.fullDate.isSame(selectedDate, "day"),
    );
    const idx = currentIndex >= 0 ? currentIndex : 0;
    setSelectedDate(newWeek[idx].fullDate);
  };

  const handleNextWeek = () => {
    const newBase = resolvedWeekBaseDate.add(7, "day");
    setWeekBaseDate(newBase);
    const newWeek = getWeekCalendar(newBase);
    const currentIndex = weekCalendar.findIndex(item =>
      item.fullDate.isSame(selectedDate, "day"),
    );
    const idx = currentIndex >= 0 ? currentIndex : 0;
    setSelectedDate(newWeek[idx].fullDate);
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
      day: `${selectedDate.date()}일`,
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
          flight.flightSegments.forEach((segment, index) => {
            const departureTime = dayjs(segment.departureTime);
            if (departureTime.isSame(selectedDate, "day")) {
              schedules.push({
                type: "flight",
                id: `${flight.id}-segment-${index}`,
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

  if (plansQuery.isLoading || planData.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (plansQuery.plans.length === 0) {
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

  const planMinMax = selectedPlan
    ? {
        minDate: selectedPlan.startDate,
        maxDate: selectedPlan.endDate,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.todayDate}>{formatKoreanDate(selectedDate)}</Text>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => setCalendarModalVisible(true)}>
              <CalendarIcon width={24} height={24} color={colors.gray600} />
            </Pressable>
            <Pressable onPress={() => setTravelInfoModalVisible(true)}>
              <InformIcon width={24} height={24} />
            </Pressable>
          </View>
        </View>
        <Pressable
          style={styles.planSelector}
          onPress={() => setShowPlanSelector(true)}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedPlan?.title || "여행 선택"}
          </Text>
          <DropdownIcon width={20} height={20} color={colors.gray600} />
        </Pressable>
      </View>

      <View style={styles.weekSelector}>
        <Pressable style={{ marginLeft: 16 }} onPress={handlePrevWeek}>
          <LeftArrowIcon width={20} height={20} color={colors.gray600} />
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekScroll}
          contentContainerStyle={styles.weekContent}
        >
          {weekCalendar.map(item => {
            const isSelected = selectedDate.isSame(item.fullDate, "day");
            const hasItems = datesWithItems.has(
              item.fullDate.format("YYYY-MM-DD"),
            );
            return (
              <Pressable
                key={`${item.year}-${item.month}-${item.date}`}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                ]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <View style={styles.dateDotRow}>
                  {hasItems && (
                    <View
                      style={[
                        styles.dateDot,
                        isSelected && styles.dateDotSelected,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[styles.dayDate, isSelected && styles.dayDateSelected]}
                >
                  {item.date}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={{ marginRight: 16 }} onPress={handleNextWeek}>
          <RightArrowIcon width={20} height={20} color={colors.gray600} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scheduleList}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
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
        }
      >
        {scheduleCount === 0 && selectedDateAccommodations.length === 0 && (
          <View style={styles.emptyScheduleContainer}>
            <CautionIcon width={24} height={24} color={colors.gray600} />
            <Text style={styles.emptyScheduleText}>
              등록된 일정이 없습니다.
            </Text>
          </View>
        )}
        {scheduleCount > 0 && (
          <>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleDate}>
                <Text style={styles.scheduleDateDay}>
                  {selectedDateDisplay.day}
                </Text>
                <Text style={styles.scheduleDateWeekday}>
                  {selectedDateDisplay.weekday}
                </Text>
              </View>
              <View style={styles.scheduleCountBadge}>
                <Text style={styles.scheduleCountText}>
                  {scheduleCount}개의 일정
                </Text>
              </View>
            </View>
            <View style={styles.timelineWrapper}>
              <View style={styles.timelineTrack} />
              {selectedDateSchedules.map(schedule => {
                if (schedule.type === "accommodation") return null;

                const isCurrentTime =
                  dayjs().isSame(selectedDate, "day") &&
                  dayjs().isAfter(
                    dayjs(
                      `${selectedDate.format("YYYY-MM-DD")} ${schedule.time}`,
                    ),
                  ) &&
                  schedule.endTime &&
                  dayjs().isBefore(
                    dayjs(
                      `${selectedDate.format("YYYY-MM-DD")} ${schedule.endTime}`,
                    ),
                  );

                let showNextDay = false;
                if (schedule.type === "flight" && schedule.segment) {
                  const departureDate = dayjs(
                    schedule.segment.departureTime,
                  ).format("YYYY-MM-DD");
                  const arrivalDate = dayjs(
                    schedule.segment.arrivalTime,
                  ).format("YYYY-MM-DD");
                  showNextDay = departureDate !== arrivalDate;
                } else if (
                  schedule.type === "itinerary" &&
                  schedule.endTime &&
                  schedule.time
                ) {
                  const startParts = schedule.time.split(":").map(Number);
                  const endParts = schedule.endTime.split(":").map(Number);
                  const startMin = startParts[0] * 60 + (startParts[1] || 0);
                  const endMin = endParts[0] * 60 + (endParts[1] || 0);
                  showNextDay = endMin < startMin;
                }

                if (schedule.type === "flight" && schedule.segment) {
                  const flight = schedule.data as FlightRead;
                  const segment = schedule.segment;
                  const segmentIndex = schedule.segmentIndex ?? 0;
                  const totalSegments = flight.flightSegments?.length || 1;

                  return (
                    <View
                      key={`flight-${flight.id}-segment-${segmentIndex}`}
                      style={styles.scheduleItem}
                    >
                      <View style={styles.scheduleTime}>
                        <View style={styles.dotTimeRow}>
                          <View style={styles.timeDotRing}>
                            <View
                              style={[
                                styles.timeDot,
                                isCurrentTime && styles.timeDotNow,
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.scheduleTimeText,
                              isCurrentTime && styles.scheduleTimeTextNow,
                            ]}
                          >
                            {schedule.time}
                          </Text>
                          {showNextDay && schedule.endTime && (
                            <Text
                              style={[
                                styles.scheduleTimeText,
                                isCurrentTime && styles.scheduleTimeTextNow,
                              ]}
                            >
                              {" "}
                              → {schedule.endTime}
                            </Text>
                          )}
                          {isCurrentTime && (
                            <View style={styles.nowBadge}>
                              <Text style={styles.nowBadgeText}>NOW</Text>
                            </View>
                          )}
                        </View>
                        {showNextDay && (
                          <View style={styles.nextDayIndicator}>
                            <Text style={styles.nextDayText}>+1 day</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={[
                          styles.scheduleCard,
                          isCurrentTime && styles.currentCard,
                        ]}
                        onPress={() => {
                          setSelectedFlight(flight);
                          setSelectedFlightSegment(segment);
                          setShowFlightDetail(true);
                        }}
                      >
                        <View style={styles.scheduleCardRow}>
                          <Text
                            style={[
                              styles.scheduleCardTime,
                              isCurrentTime && styles.scheduleTimeTextNow,
                            ]}
                          >
                            {schedule.time}
                          </Text>
                          {totalSegments > 1 && (
                            <Text
                              style={[styles.flightSegments, { flexShrink: 0 }]}
                            >
                              구간 {segmentIndex + 1}/{totalSegments}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.scheduleTitle,
                            isCurrentTime && styles.scheduleTitleNow,
                          ]}
                        >
                          {segment.departureAirport} → {segment.arrivalAirport}
                        </Text>
                        {(segment.airline || segment.flightNumber) && (
                          <Text style={styles.scheduleLocation}>
                            {segment.flightNumber}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                }

                const itinerary = schedule.data as Itinerary;
                return (
                  <View
                    key={`itinerary-${itinerary.id}`}
                    style={styles.scheduleItem}
                  >
                    <View style={styles.scheduleTime}>
                      <View style={styles.dotTimeRow}>
                        <View style={styles.timeDotRing}>
                          <View
                            style={[
                              styles.timeDot,
                              isCurrentTime && styles.timeDotNow,
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.scheduleTimeText,
                            isCurrentTime && styles.scheduleTimeTextNow,
                          ]}
                        >
                          {schedule.time}
                        </Text>
                        {showNextDay && schedule.endTime && (
                          <Text
                            style={[
                              styles.scheduleTimeText,
                              isCurrentTime && styles.scheduleTimeTextNow,
                            ]}
                          >
                            {" "}
                            → {schedule.endTime}
                          </Text>
                        )}
                        {isCurrentTime && (
                          <View style={styles.nowBadge}>
                            <Text style={styles.nowBadgeText}>NOW</Text>
                          </View>
                        )}
                      </View>
                      {showNextDay && (
                        <View style={styles.nextDayIndicator}>
                          <Text style={styles.nextDayText}>+1 day</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      style={[
                        styles.scheduleCard,
                        isCurrentTime && styles.currentCard,
                      ]}
                      onPress={() => {
                        setSelectedItinerary(itinerary);
                        setShowItineraryDetail(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.scheduleCardTime,
                          isCurrentTime && styles.scheduleCardTimeNow,
                        ]}
                      >
                        {schedule.time}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTitle,
                          isCurrentTime && styles.scheduleTitleNow,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {itinerary.title}
                      </Text>
                      {itinerary.location && (
                        <Text
                          style={styles.scheduleLocation}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {itinerary.location}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <View style={styles.checklistWrapper}>
              <WeeklyChecklistCard
                planPublicId={selectedPlan?.publicId}
                selectedDate={selectedDate}
                itineraries={planData.itineraries}
              />
            </View>
          </>
        )}

        {(selectedDateAccommodations.length > 0 ||
          selectedDateFlights.length > 0) && (
          <View
            style={[
              styles.travelInfoSection,
              scheduleCount === 0 && styles.travelInfoSectionAlone,
            ]}
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
          setShowItineraryEdit(true);
        }}
        onDelete={async itinerary => {
          try {
            await itinerariesApi.deleteItinerary(itinerary.id);
            planData.removeItinerary(itinerary.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["checklist", selectedPlan.publicId],
              });
            }
            Alert.alert("삭제완료", "일정이 삭제되었습니다.");
          } catch {
            Alert.alert("알림", "일정 삭제에 실패했습니다.");
          }
        }}
      />

      <ItineraryEditModal
        visible={showItineraryEdit}
        onClose={opts => {
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
        defaultCountry={selectedDateSegment?.country}
        defaultCity={selectedDateSegment?.city}
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
          planData.removeItinerary(itineraryId);
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
            planData.removeFlight(flight.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
              queryClient.invalidateQueries({
                queryKey: ["checklist", selectedPlan.publicId],
              });
            }
            Alert.alert("삭제완료", "항공편이 삭제되었습니다.");
          } catch {
            Alert.alert("알림", "항공 편 삭제에 실패했습니다.");
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
          planData.removeFlight(flightId);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", selectedPlan.publicId],
            });
          }
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
            planData.removeAccommodation(accommodation.id);
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
            }
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
          planData.removeAccommodation(accommodationId);
          if (selectedPlan?.publicId) {
            queryClient.invalidateQueries({
              queryKey: ["expenses", selectedPlan.id],
            });
          }
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  todayDate: {
    ...textStyles.h7,
    color: colors.gray700,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.black,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  weekArrow: {
    alignItems: "center",
    justifyContent: "center",
  },
  weekScroll: {
    flex: 1,
  },
  weekContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayColumn: {
    width: 45,
    height: 73,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayColumnSelected: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 9,
  },
  dayLabelSelected: {
    color: colors.white,
  },
  dayDate: {
    ...textStyles.h5,
  },
  dayDateSelected: {
    color: colors.white,
  },
  dateDotRow: {
    height: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  dateDotSelected: {
    backgroundColor: colors.white,
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.gray300,
  },
  scheduleDate: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  scheduleDateDay: {
    ...textStyles.h4,
    color: colors.black,
  },
  scheduleDateWeekday: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  scheduleCountBadge: {
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleCountText: {
    ...textStyles.h9,
    color: colors.primary,
  },

  scheduleList: {
    flex: 1,
    backgroundColor: colors.gray300,
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
  timelineWrapper: {
    position: "relative",
  },
  timelineTrack: {
    position: "absolute",
    left: 10,
    top: 0,
    bottom: 16,
    width: 2,
    backgroundColor: colors.gray400,
  },
  scheduleItem: {
    flexDirection: "column",
    marginBottom: 16,
  },
  scheduleTime: {
    width: 90,
    marginTop: -4,
  },
  dotTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 3,
  },
  timeDotRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray400,
  },
  timeDotNow: {
    backgroundColor: colors.primary,
  },
  scheduleTimeText: {
    ...textStyles.h7,
    color: colors.gray700,
  },
  scheduleCardTime: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 4,
  },
  scheduleCardTimeNow: {
    color: colors.primary,
  },
  scheduleTimeTextNow: {
    color: colors.black,
  },
  nowBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nowBadgeText: {
    ...textStyles.h9,
    color: colors.white,
  },
  nextDayIndicator: {
    backgroundColor: colors.gray300,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginTop: 4,
  },
  nextDayText: {
    ...textStyles.body4,
    color: colors.gray600,
    fontSize: 9,
    fontWeight: "600",
  },

  scheduleCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  scheduleCard: {
    marginTop: 8,
    marginLeft: 36,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
  },
  currentCard: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleTitle: {
    ...textStyles.h6,
    color: colors.gray700,
    marginBottom: 4,
  },
  scheduleTitleNow: {
    color: colors.black,
  },
  scheduleLocation: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  scheduleNote: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  flightSegments: {
    ...textStyles.body6,
    color: colors.gray500,
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
