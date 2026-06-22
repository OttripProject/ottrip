import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import api from "@/services/api";
import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import GradientBackground from "@/ui/components/GradientBackground";
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
} from "react-native";

import DetailsPanel from "@/components/panels/DetailsPanel";
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
    activeTab || selectedItinerary || selectedFlight || selectedAccommodation
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
  const innerGap = 16;
  const leftTopHeight = Math.max(
    240,
    Math.floor((availableHeight - innerGap) * 0.7),
  );
  const leftBottomHeight = Math.max(
    160,
    availableHeight - innerGap - leftTopHeight,
  );

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

  const handleItineraryAdd = async (newItinerary: any) => {
    setSelectedItinerary(newItinerary);
    setActiveTab("itinerary");
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    if (selectedPlanId) {
      planData.addItinerary(newItinerary);
    }
  };

  const handleFlightAdd = async (newFlight: any) => {
    if (selectedPlanId) {
      planData.addFlight(newFlight);
      setSelectedFlight(newFlight);
      setActiveTab("flight");
    }
  };

  const handleAccommodationAdd = async (newAccommodation: any) => {
    if (selectedPlanId) {
      planData.addAccommodation(newAccommodation);
      setSelectedAccommodation(newAccommodation);
      setActiveTab("accommodation");
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    if (selectedPlanId) {
      planData.addExpense(newExpense);
    }
  };

  const handleDetailsPanelTabChange = useCallback(
    (tab: "itinerary" | "flight" | "accommodation") => {
      setActiveTab(tab);
      setSelectedItinerary(null);
      setSelectedFlight(null);
      setSelectedAccommodation(null);
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
            checkoutDate: checkoutDate ?? dayjs(date).add(1, "day").format("YYYY-MM-DD"),
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
              { flex: ratio.left, height: availableHeight },
            ]}
          >
            {/* 2. 주간 스케줄 모달 (70% 높이) */}
            <View style={[styles.scheduleModal, { height: leftTopHeight }]}>
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
                      navigation.navigate("PLAN", { publicId: trip.publicId });
                    } else {
                      // @ts-ignore
                      navigation.navigate("OTTRIP");
                    }
                  } else {
                    if (trip?.publicId) {
                      // @ts-ignore
                      navigation.navigate("PLAN", { publicId: trip.publicId });
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
            </View>

            {/* 하단 모달들 (30% 높이) */}
            <View style={[styles.bottomRow, { height: leftBottomHeight }]}>
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
                <AIAssistantPanel publicId={planData.plan?.publicId || null} />
              </View>
            </View>
          </View>

          {/* 우측 영역 (동적 비율) */}
          {!isMobile && showRightPanel && (
            <Animated.View
              style={[
                styles.rightArea,
                { flex: animRightFlex, height: availableHeight, overflow: "hidden" },
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
  scheduleModal: {
    flex: 0.8,
    minHeight: 0,
    overflow: "hidden",
  },
  bottomRow: {
    flex: 0.2,
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
});
