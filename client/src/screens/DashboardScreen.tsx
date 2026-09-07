import CongestionBanner, { type CongestedItem } from "@/components/CongestionBanner";
import type { FestivalItem } from "@/services/tourism";
import { tourismApi } from "@/services/tourism";
import { useToast } from "@/contexts/ToastContext";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import api from "@/services/api";
import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import GradientBackground from "@/ui/components/GradientBackground";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Text
} from "react-native";


import DetailsPanel from "@/components/panels/DetailsPanel";
import EmptyPlanPanel from "@/components/panels/EmptyPlanPanel";
import FestivalsPanel from "@/components/panels/FestivalsPanel";
import HeaderPanel from "@/components/panels/HeaderPanel";
import WeeklySchedulePanel from "@/components/panels/WeeklySchedulePanel";
import AIAssistantPanel from "@/components/panels/aiassistant/AIAssistantPanel";
import ExpensesPanel from "@/components/panels/expenses/ExpensesPanel";

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "itinerary" | "flight" | "accommodation" | undefined
  >(undefined);
  const [openNewFlightForm, setOpenNewFlightForm] = useState<boolean>(false);
  const [openNewItineraryForm, setOpenNewItineraryForm] =
    useState<boolean>(false);
  const [selectedItineraryDate, setSelectedItineraryDate] =
    useState<Date | null>(null);
  const [openNewAccommodationForm, setOpenNewAccommodationForm] =
    useState<boolean>(false);
  const [newAccommodationDraft, setNewAccommodationDraft] = useState<
    any | null
  >(null);
  const [previewAccommodation, setPreviewAccommodation] = useState<any>(null);
  const [festivals, setFestivals] = useState<FestivalItem[]>([]);
  const [suggestFestivals, setSuggestFestivals] = useState<FestivalItem[]>([]);
  const [suggestFestivalsLoading, setSuggestFestivalsLoading] = useState(false);
  const [festivalsExpanded, setFestivalsExpanded] = useState(false);
  const [congestedItems, setCongestedItems] = useState<CongestedItem[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const documentAnalyzeSeqRef = useRef(0);
  const [stagedDocumentAnalyze, setStagedDocumentAnalyze] =
    useState<StagedDocumentAnalyzePayload | null>(null);
  const [carryoverPendingFiles, setCarryoverPendingFiles] = useState<
    LocalFile[] | null
  >(null);

  const onConsumeStagedDocumentAnalyze = useCallback(() => {
    setStagedDocumentAnalyze(null);
  }, []);

  const onConsumeCarryoverPendingFiles = useCallback(() => {
    setCarryoverPendingFiles(null);
  }, []);

  const { showToast } = useToast();

  /** 첨부 분석 성공 시: 결과 종류에 맞는 상세 탭으로 전환하고 확인 모달용 payload를 스테이징합니다. */
  const routeDocumentAnalyzeSuccess = useCallback(
    (
      res: DocumentUploadAnalyzeResponse,
      carryPendingFiles?: LocalFile[],
      originEntityType?: string,
    ): boolean => {
      const kind = res.inferredItemType ?? res.draft?.itemType;
      if (
        kind !== "itinerary" &&
        kind !== "flight" &&
        kind !== "accommodation"
      ) {
        return false;
      }
      if (carryPendingFiles && carryPendingFiles.length > 0) {
        setCarryoverPendingFiles([...carryPendingFiles]);
      } else {
        setCarryoverPendingFiles(null);
      }
      documentAnalyzeSeqRef.current += 1;
      setStagedDocumentAnalyze({
        result: res,
        seq: documentAnalyzeSeqRef.current,
        originEntityType,
      });

      if (kind === "itinerary") {
        setSelectedFlight(null);
        setSelectedAccommodation(null);
        setActiveTab("itinerary");
        if (!selectedItinerary?.id) {
          setSelectedItinerary(null);
          setOpenNewItineraryForm(true);
        }
      } else if (kind === "flight") {
        setSelectedItinerary(null);
        setSelectedAccommodation(null);
        setActiveTab("flight");
        if (!selectedFlight?.id) {
          setSelectedFlight(null);
          setOpenNewFlightForm(true);
        }
      } else {
        setSelectedItinerary(null);
        setSelectedFlight(null);
        setActiveTab("accommodation");
        if (!selectedAccommodation?.id) {
          setSelectedAccommodation({});
          setOpenNewAccommodationForm(true);
          setNewAccommodationDraft(null);
        }
      }
      return true;
    },
    [selectedItinerary?.id, selectedFlight?.id, selectedAccommodation?.id],
  );

  const isPanelActive = !!(
    activeTab ||
    selectedItinerary ||
    selectedFlight ||
    selectedAccommodation
  );

  const isMobile = width < 768;

  const getResponsiveRatio = () => {
    if (!isPanelActive || isMobile) {
      return { left: 1, right: 0 };
    } else if (width < 1024) {
      return { left: 0.6, right: 0.4 };
    } else if (width < 1440) {
      return { left: 0.7, right: 0.3 };
    } else {
      return { left: 0.75, right: 0.25 };
    }
  };

  const ratio = getResponsiveRatio();
  const targetRight = !isMobile && isPanelActive ? ratio.right : 0;

  const animRightFlex = useRef(new Animated.Value(targetRight)).current;
  const prevTargetRef = useRef(targetRight);
  const [showRightPanel, setShowRightPanel] = useState(targetRight > 0);

  useEffect(() => {
    if (prevTargetRef.current === targetRight) return;
    prevTargetRef.current = targetRight;

    if (targetRight > 0) {
      setShowRightPanel(true);
      Animated.timing(animRightFlex, {
        toValue: targetRight,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animRightFlex, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => setShowRightPanel(false));
    }
  }, [targetRight]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animBottomFlex, {
        toValue: festivalsExpanded ? 0.3 : 0.2,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animFestivalsFlex, {
        toValue: festivalsExpanded ? 1 : 0.5,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [festivalsExpanded]);

  const headerHeight = 56;
  const verticalPadding = 16 + 20;
  const availableHeight = Math.max(
    360,
    width
      ? (typeof window !== "undefined" ? window.innerHeight : 0) -
          verticalPadding -
          headerHeight
      : 600,
  );
  const animBottomFlex = useRef(new Animated.Value(0.2)).current;
  const animTopFlex = useRef(Animated.subtract(1, animBottomFlex)).current;
  const animFestivalsFlex = useRef(new Animated.Value(0.5)).current;
  // WeeklySchedulePanel height prop용 근사값
  const bottomFlexRatio = festivalsExpanded ? 0.3 : 0.2;
  const leftTopHeight = Math.round(availableHeight * (1 - bottomFlexRatio));
  const leftBottomHeight = Math.round(availableHeight * bottomFlexRatio);

  const plansQuery = usePlansQuery();

  const planData = usePlanDataQuery(
    selectedTrip?.publicId || route?.params?.publicId,
  );

  const trips = useMemo(
    () =>
      plansQuery.plans.map(plan => ({
        id: plan.id.toString(),
        publicId: plan.publicId,
        name: plan.title,
        startDate: plan.startDate,
        endDate: plan.endDate,
        segments: plan.segments?.map(s => ({
          country: s.country,
          city: s.city,
          startDate: s.startDate,
          endDate: s.endDate,
        })),
      })),
    [plansQuery.plans],
  );

  useEffect(() => {
    if (planData.plan) {
      setSelectedPlanId(planData.plan.id);

      if (!selectedTrip && route?.params?.publicId) {
        const tripData = {
          id: planData.plan.id.toString(),
          publicId: planData.plan.publicId,
          name: planData.plan.title,
          startDate: planData.plan.startDate,
          endDate: planData.plan.endDate,
        };
        setSelectedTrip(tripData);
      }
    }
  }, [planData.plan, selectedTrip, route?.params?.publicId]);

  useEffect(() => {
    setSelectedItinerary(null);
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    setActiveTab(undefined);
    setOpenNewFlightForm(false);
    setStagedDocumentAnalyze(null);
    setCarryoverPendingFiles(null);
  }, [selectedPlanId]);

  const itineraryKey = planData.itineraries
    .map((it: any) => `${it.id}-${it.location?.id ?? ""}`)
    .join(",");

  const prevFestivalsKeyRef = useRef("");

  useEffect(() => {
    setFestivals([]);
    setSuggestFestivals([]);
    setCongestedItems([]);
    setBannerDismissed(false);
  }, [selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId) return;
    tourismApi.getFestivalsForPlan(selectedPlanId).then(setFestivals).catch(() => {});
    setSuggestFestivalsLoading(true);
    tourismApi
      .getSuggestFestivals(selectedPlanId)
      .then(setSuggestFestivals)
      .catch(() => {})
      .finally(() => setSuggestFestivalsLoading(false));
  }, [selectedPlanId, itineraryKey]);

  useEffect(() => {
    if (!selectedPlanId || planData.itineraries.length === 0) return;
    const today = dayjs().startOf("day");
    const maxDate = today.add(30, "day");
    const eligible = planData.itineraries.filter((it: any) => {
      if (!it.location) return false;
      const d = dayjs(it.itineraryDate);
      return !d.isBefore(today) && !d.isAfter(maxDate);
    });
    if (eligible.length === 0) {
      setCongestedItems([]);
      return;
    }
    Promise.all(
      eligible.map((it: any) =>
        tourismApi
          .getCongestion(it.id)
          .then((items) =>
            items.length > 0
              ? { date: it.itineraryDate as string, locationName: it.location.name as string }
              : null,
          )
          .catch(() => null),
      ),
    ).then((results) => {
      setCongestedItems(results.filter((r): r is CongestedItem => r !== null));
    });
  }, [selectedPlanId, itineraryKey]);

  const prevCongestedKeyRef = useRef("");
  useEffect(() => {
    const key = congestedItems.map((c) => `${c.date}${c.locationName}`).sort().join(",");
    if (key && key !== prevCongestedKeyRef.current) {
      setBannerDismissed(false);
    }
    prevCongestedKeyRef.current = key;
  }, [congestedItems]);

  useEffect(() => {
    const key = festivals.map((f) => f.contentId).sort().join(",");
    if (key && key !== prevFestivalsKeyRef.current) {
      setBannerDismissed(false);
    }
    prevFestivalsKeyRef.current = key;
  }, [festivals]);

  useEffect(() => {
    if (selectedItinerary?.id && planData.itineraries.length > 0) {
      const updatedItinerary = planData.itineraries.find(
        (it: any) => it.id === selectedItinerary.id,
      );
      if (updatedItinerary && updatedItinerary.id === selectedItinerary.id) {
        if (updatedItinerary !== selectedItinerary) {
          setSelectedItinerary(updatedItinerary);
        }
      }
    }
  }, [planData.itineraries, selectedItinerary?.id]);

  useEffect(() => {
    if (selectedFlight?.id && planData.flights.length > 0) {
      const updatedFlight = planData.flights.find(
        (flight: any) => flight.id === selectedFlight.id,
      );
      if (updatedFlight && updatedFlight.id === selectedFlight.id) {
        if (updatedFlight !== selectedFlight) {
          setSelectedFlight(updatedFlight);
        }
      }
    }
  }, [planData.flights, selectedFlight?.id]);

  useEffect(() => {
    if (selectedAccommodation?.id && planData.accommodations.length > 0) {
      const updatedAccommodation = planData.accommodations.find(
        (acc: any) => acc.id === selectedAccommodation.id,
      );
      if (
        updatedAccommodation &&
        updatedAccommodation.id === selectedAccommodation.id
      ) {
        if (updatedAccommodation !== selectedAccommodation) {
          setSelectedAccommodation(updatedAccommodation);
        }
      }
    }
  }, [planData.accommodations, selectedAccommodation?.id]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash;
    if (hash && hash.startsWith("#invite=")) {
      const token = hash.replace("#invite=", "");
      const accept = async () => {
        try {
          await api.post(`/private/plans/invitations/${token}/accept`);
          Alert.alert("완료", "초대를 수락했습니다.");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("plans-refresh"));
          }
        } catch (e: any) {
          const msg = e?.response?.data?.detail || "초대 수락에 실패했습니다.";
          Alert.alert("알림", msg);
        } finally {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }
      };
      accept();
    }
  }, []);

  const extendPlanDateIfNeeded = async (..._dates: string[]) => {};

  const handleItineraryAdd = async (newItinerary: any) => {
    setSelectedItinerary(newItinerary);
    setActiveTab("itinerary");
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    if (selectedPlanId) {
      planData.addItinerary(newItinerary);
      await extendPlanDateIfNeeded(newItinerary.itineraryDate);
    }
    showToast("일정을 저장했습니다")
  };

  const handleFlightAdd = async (newFlight: any) => {
    if (selectedPlanId) {
      planData.addFlight(newFlight);
      setSelectedFlight(newFlight);
      setActiveTab("flight");
      const segments: any[] = newFlight.flightSegments ?? [];
      const dates = segments
        .flatMap((s: any) => [
          s.departureTime ? dayjs(s.departureTime).format("YYYY-MM-DD") : null,
          s.arrivalTime ? dayjs(s.arrivalTime).format("YYYY-MM-DD") : null,
        ])
        .filter(Boolean) as string[];
      if (dates.length) await extendPlanDateIfNeeded(...dates);
      showToast("항공편을 저장했습니다")
    }
  };

  const handleAccommodationAdd = async (newAccommodation: any) => {
    if (selectedPlanId) {
      planData.addAccommodation(newAccommodation);
      setSelectedAccommodation(newAccommodation);
      setActiveTab("accommodation");
      await extendPlanDateIfNeeded(
        newAccommodation.checkinDate,
        newAccommodation.checkoutDate,
      );
      showToast("숙박 일정을 저장했습니다")
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    if (selectedPlanId) {
      planData.addExpense(newExpense);
      planData.refreshAttachments();
      showToast("지출을 저장했습니다")
    }
  };

  const handleDetailsPanelTabChange = useCallback(
    (tab: "itinerary" | "flight" | "accommodation", draft?: any) => {
      setActiveTab(tab);
      setSelectedItinerary(null);
      setSelectedFlight(null);
      setSelectedAccommodation(null);
      if (tab === "accommodation" && draft) {
        setNewAccommodationDraft(draft);
        setOpenNewAccommodationForm(true);
      }
    },
    [],
  );

  const handleShowItineraryModal = useCallback(() => {
    setActiveTab("itinerary");

    setSelectedFlight(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowFlightModal = useCallback(() => {
    setActiveTab("flight");

    setSelectedItinerary(null);
    setSelectedAccommodation(null);
  }, []);

  const handleRequestNewFlight = useCallback(() => {
    setActiveTab("flight");
    setSelectedItinerary(null);
    setSelectedAccommodation(null);
    setSelectedFlight(null);
    setOpenNewFlightForm(true);
  }, []);

  const handleRequestNewItinerary = useCallback((date?: Date) => {
    setActiveTab("itinerary");
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    setSelectedItinerary(null);
    setOpenNewItineraryForm(true);
    if (date) {
      setSelectedItineraryDate(date);
    } else {
      setSelectedItineraryDate(null);
    }
  }, []);

  const handleShowAccommodationModal = useCallback(
    (accommodation: any, date?: string, checkoutDate?: string) => {
      setActiveTab("accommodation");

      setSelectedItinerary(null);
      setSelectedFlight(null);

      if (accommodation) {
        setSelectedAccommodation(accommodation);
        setOpenNewAccommodationForm(false);
        setNewAccommodationDraft(null);
      } else {
        setSelectedAccommodation(null);
        if (date) {
          const draft = {
            checkinDate: date,
            checkoutDate:
              checkoutDate ?? dayjs(date).add(1, "day").format("YYYY-MM-DD"),
            checkinTime: "15:00",
            checkoutTime: "11:00",
          };
          setSelectedAccommodation(draft);
          setNewAccommodationDraft(draft);
        }
        setOpenNewAccommodationForm(true);
      }
    },
    [],
  );

  const handleShowItineraryDetail = useCallback((itinerary: any) => {
    setSelectedItinerary(itinerary);
    setActiveTab("itinerary");

    setSelectedFlight(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowFlightDetail = useCallback((flight: any) => {
    setSelectedFlight(flight);
    setActiveTab("flight");

    setSelectedItinerary(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowAccommodationDetail = useCallback((accommodation: any) => {
    setSelectedAccommodation(accommodation);
    setActiveTab("accommodation");

    setSelectedItinerary(null);
    setSelectedFlight(null);
  }, []);

  useEffect(() => {
    if (previewAccommodation) {
      const isAccommodationCreating =
        activeTab === "accommodation" &&
        (!selectedAccommodation || !selectedAccommodation.id);
      if (!isAccommodationCreating) {
        setPreviewAccommodation(null);
      }
    }
  }, [activeTab, selectedAccommodation, previewAccommodation]);

  useEffect(() => {
    if (planData.errorStatus === 404) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: "NOT FOUND" }] });
    } else if (planData.errorStatus === 403) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: "FORBIDDEN" }] });
    }
  }, [planData.errorStatus]);

  if (planData.errorStatus === 404 || planData.errorStatus === 403) {
    return null;
  }

  const handleTripCreated = (trip: {
    id: string;
    publicId: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    setSelectedTrip(trip);
    setSelectedPlanId(Number.parseInt(trip.id));
    if (Platform.OS === "web") {
      if (trip.publicId) {
        // @ts-ignore
        navigation.navigate("PLAN", { publicId: trip.publicId });
      }
    }
  };

  return (
    <GradientBackground
      colors={["#D7D0FF33", "#CBDDFF80"]}
      locations={[0.2, 0.502]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      {/* 1. 헤더 모달 */}
      <View style={styles.headerModal}>
        <HeaderPanel />
      </View>

      {/* 메인 레이아웃 */}
      <View style={styles.container}>
        <View style={styles.mainLayout}>
          {/* 좌측 영역 (동적 비율) */}
          <View
            style={[
              styles.leftArea,
              { flex: ratio.left },
            ]}
          >
            {plansQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>여행을 불러오는 중입니다..</Text>
              </View>
            ) : trips.length === 0 && !plansQuery.isLoading ? (
              <EmptyPlanPanel
                onPlanAdd={plansQuery.addPlan}
                onTripCreated={handleTripCreated}
              />
            ) : (
              <>
                {/* 혼잡 배너 */}
                {!bannerDismissed && (festivals.length > 0 || congestedItems.length > 0) && (
                  <View style={styles.bannerWrapper}>
                    <CongestionBanner
                      festivals={festivals}
                      congestedItems={congestedItems}
                      onDismiss={() => setBannerDismissed(true)}
                    />
                  </View>
                )}
                {/* 2. 주간 스케줄 모달 (70% 높이) */}
                <Animated.View style={[styles.scheduleModal, { flex: animTopFlex }]}>
                  <WeeklySchedulePanel
                    itineraries={planData.itineraries}
                    flights={planData.flights}
                    height={leftTopHeight}
                    selectedTrip={selectedTrip}
                    planData={planData}
                    plans={plansQuery.plans}
                    trips={trips}
                    onPlansRefresh={plansQuery.fetchPlans}
                    onPlanAdd={plansQuery.addPlan}
                    onPlanUpdate={plansQuery.updatePlan}
                    onPlanDelete={plansQuery.deletePlan}
                    onItineraryAdd={handleItineraryAdd}
                    previewAccommodation={previewAccommodation}
                    onPreviewAccommodationChange={setPreviewAccommodation}
                    onPlanSelect={trip => {
                      setSelectedTrip(trip);
                      setSelectedPlanId(trip ? Number.parseInt(trip.id) : null);
                      if (Platform.OS === "web") {
                        if (trip?.publicId) {
                          // @ts-ignore
                          navigation.navigate("PLAN", {
                            publicId: trip.publicId,
                          });
                        } else {
                          // @ts-ignore
                          navigation.navigate("OTTRIP");
                        }
                      } else {
                        if (trip?.publicId) {
                          // @ts-ignore
                          navigation.navigate("PLAN", {
                            publicId: trip.publicId,
                          });
                        } else {
                          // @ts-ignore
                          navigation.navigate("OTTRIP");
                        }
                      }
                    }}
                    onItinerarySelect={setSelectedItinerary}
                    onFlightAdd={handleFlightAdd}
                    onAccommodationAdd={handleAccommodationAdd}
                    onShowItineraryModal={handleShowItineraryModal}
                    onShowFlightModal={handleShowFlightModal}
                    onRequestNewFlight={handleRequestNewFlight}
                    onRequestNewItinerary={handleRequestNewItinerary}
                    onShowAccommodationModal={handleShowAccommodationModal}
                    onShowItineraryDetail={handleShowItineraryDetail}
                    onShowFlightDetail={handleShowFlightDetail}
                    onShowAccommodationDetail={handleShowAccommodationDetail}
                    activeTab={activeTab}
                    selectedItinerary={selectedItinerary}
                  />
                </Animated.View>

                {/* 하단 모달들 (30% 높이) */}
                <Animated.View style={[styles.bottomRow, { flex: animBottomFlex }]}>
                  {/* 4. 비용 모달 (좌측 하단) */}
                  <View style={styles.expensesModal}>
                    <ExpensesPanel
                      planData={{
                        ...planData,
                        refreshItineraries: planData.refreshItineraries,
                        refreshFlights: planData.refreshFlights,
                        refreshAccommodations: planData.refreshAccommodations,
                      }}
                      onExpenseAdd={handleExpenseAdd}
                    />
                  </View>

                  {/* 5. AI 어시스턴트 모달 (우측 하단) */}
                  <View style={styles.aiModal}>
                    <AIAssistantPanel
                      publicId={planData.plan?.publicId || null}
                    />
                  </View>

                  {/* 6. 축제·공연 패널 */}
                  <Animated.View style={[styles.festivalsModal, { flex: animFestivalsFlex }]}>
                    <FestivalsPanel
                      festivals={suggestFestivals}
                      isLoading={suggestFestivalsLoading}
                      expanded={festivalsExpanded}
                      onToggle={() => setFestivalsExpanded(v => !v)}
                    />
                  </Animated.View>
                </Animated.View>
              </>
            )}
          </View>

          {/* 우측 영역 (동적 비율) */}
          {!isMobile && showRightPanel && (
            <Animated.View
              style={[
                styles.rightArea,
                {
                  flex: animRightFlex,
                  height: availableHeight,
                  overflow: "hidden",
                },
              ]}
              pointerEvents={isPanelActive ? "auto" : "none"}
            >
              {/* 3. 상세 정보 모달 (전체 높이) */}
              <View style={styles.detailsModal}>
                <DetailsPanel
                  planData={planData}
                  selectedItinerary={selectedItinerary}
                  selectedFlight={selectedFlight}
                  selectedAccommodation={selectedAccommodation}
                  activeTab={activeTab}
                  onTabChange={handleDetailsPanelTabChange}
                  stagedDocumentAnalyze={stagedDocumentAnalyze}
                  onConsumeStagedDocumentAnalyze={
                    onConsumeStagedDocumentAnalyze
                  }
                  routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
                  carryoverPendingFiles={carryoverPendingFiles}
                  onConsumeCarryoverPendingFiles={
                    onConsumeCarryoverPendingFiles
                  }
                  onItineraryAdd={handleItineraryAdd}
                  onItineraryClear={() => {
                    setSelectedItinerary(null);
                    setActiveTab(undefined);
                  }}
                  onFlightAdd={handleFlightAdd}
                  onFlightClear={() => {
                    setSelectedFlight(null);
                    setActiveTab(undefined);
                  }}
                  onAccommodationAdd={handleAccommodationAdd}
                  onAccommodationSelect={setSelectedAccommodation}
                  onAccommodationClear={() => {
                    setSelectedAccommodation(null);
                    setActiveTab(undefined);
                  }}
                  onExpenseAdd={handleExpenseAdd}
                  openNewFlightForm={openNewFlightForm}
                  onConsumeOpenNewFlightForm={() => setOpenNewFlightForm(false)}
                  openNewItineraryForm={openNewItineraryForm}
                  onConsumeOpenNewItineraryForm={() =>
                    setOpenNewItineraryForm(false)
                  }
                  selectedItineraryDate={selectedItineraryDate}
                  openNewAccommodationForm={openNewAccommodationForm}
                  onConsumeOpenNewAccommodationForm={() =>
                    setOpenNewAccommodationForm(false)
                  }
                  newAccommodationDraft={newAccommodationDraft}
                  onPreviewAccommodationChange={setPreviewAccommodation}
                />
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  headerModal: {
    width: "100%",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
  leftArea: {
    gap: 16,
    minHeight: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  rightArea: {
    minHeight: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  bannerWrapper: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  scheduleModal: {
    minHeight: 0,
    overflow: "hidden",
  },
  bottomRow: {
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
    overflow: "hidden",
  },
  detailsModal: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  expensesModal: {
    flex: 1,
  },
  aiModal: {
    flex: 1,
  },
  festivalsModal: {
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", 
  },
  loadingText: {
    marginTop: 16,
    color: colors.gray600,
    ...textStyles.body3,
  }
});


{/* <div role="status" style="pointer-events: auto; background: rgb(31, 31, 31); color: rgb(255, 255, 255); border-radius: 14px; padding: 14px 16px; min-width: 288px; max-width: 420px; box-shadow: rgba(0, 0, 0, 0.28) 0px 12px 32px; display: inline-flex; align-items: center; gap: 12px; font: 500 13px / 19px Pretendard; animation: 220ms ease-out 0s 1 normal none running ottripToastInR;"><span style="width:20px;height:20px;border-radius:999px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#0A84FF;"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2.5,6.5 5,9 9.5,3.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></span><span style="flex:1;text-wrap:pretty;">일정을 삭제했어요.</span><button data-a="" style="border:0;background:transparent;padding:2px 4px;margin-left:8px;color:#8FC1FF;font:600 12.5px/16px Pretendard;cursor:pointer;flex:none;">되돌리기</button><button data-c="" aria-label="닫기" style="border:0;background:transparent;padding:0;margin-left:2px;cursor:pointer;display:inline-flex;align-items:center;opacity:.55;flex:none;"><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"></path></svg></button></div> */}