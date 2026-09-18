import LoginPromptModal from "@/components/modals/LoginPromptModal";
import TripDeleteConfirmModal from "@/components/modals/TripDeleteConfirmModal";
import ViewerDetailPanel from "@/components/panels/ViewerDetailPanel";
import ViewerHeaderPanel from "@/components/panels/ViewerHeaderPanel";
import ViewerHintPanel from "@/components/panels/ViewerHintPanel";
import ViewerPlanSummaryPanel from "@/components/panels/ViewerPlanSummaryPanel";
import ViewerSchedulePanel from "@/components/panels/ViewerSchedulePanel";
import AIAssistantPanel from "@/components/panels/aiassistant/AIAssistantPanel";
import ExpensesPanel from "@/components/panels/expenses/ExpensesPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ExportAccommodation,
  type ExportFlight,
  type ExportItinerary,
  type PlanExportSnapshot,
  plansApi,
} from "@/services/plans";
import GradientBackground from "@/ui/components/GradientBackground";
import { breakpoints } from "@/ui/tokens/breakpoints";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";


export default function TripViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();

  const publicId: string = route.params?.publicId ?? "";

  const [snapshot, setSnapshot] = useState<PlanExportSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedType, setSelectedType] = useState<
    "itinerary" | "flight" | "accommodation" | null
  >(null);
  const [selectedItinerary, setSelectedItinerary] =
    useState<ExportItinerary | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<ExportFlight | null>(
    null,
  );
  const [selectedAccommodation, setSelectedAccommodation] =
    useState<ExportAccommodation | null>(null);

  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [savedPlanPublicId, setSavedPlanPublicId] = useState<string | null>(
    null,
  );
  const [mainLayoutHeight, setMainLayoutHeight] = useState(600);
  const [hintHeight, setHintHeight] = useState(48);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const isMobile = width < breakpoints.compact;

  const innerGap = 16;

  const getResponsiveRatio = () => {
    if (isMobile) return { left: 1, right: 0 };
    if (width < breakpoints.stacked) return { left: 0.6, right: 0.4 };
    if (width < breakpoints.wide) return { left: 0.7, right: 0.3 };
    return { left: 0.8, right: 0.2 };
  };
  const ratio = getResponsiveRatio();

  useEffect(() => {
    if (!publicId) return;
    setIsLoading(true);
    plansApi
      .getExport(publicId)
      .then(data => setSnapshot(data))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, [publicId]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const result = await plansApi.saveExport(publicId);
      setSavedPlanPublicId(result.planPublicId);
      setSaveSuccessVisible(true);
    } catch {
      setSaveSuccessVisible(false);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleLoginPress = () => {
    setLoginPromptOpen(false);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("pendingSavePublicId", publicId);
      } catch {}
    }
    navigation.navigate("로그인");
  };

  const handleItinerarySelect = (it: ExportItinerary) => {
    setSelectedItinerary(it);
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    setSelectedType("itinerary");
  };

  const handleFlightSelect = (f: ExportFlight) => {
    setSelectedFlight(f);
    setSelectedItinerary(null);
    setSelectedAccommodation(null);
    setSelectedType("flight");
  };

  const handleAccommodationSelect = (acc: ExportAccommodation) => {
    setSelectedAccommodation(acc);
    setSelectedItinerary(null);
    setSelectedFlight(null);
    setSelectedType("accommodation");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (loadError) {
    return (
      <TripDeleteConfirmModal
        visible={true}
        tripName=""
        title="일정을 불러오지 못했습니다"
        description="잠시 후 다시 시도해주세요."
        confirmLabel="닫기"
        confirmButtonColor="#1F1F1F"
        onClose={() => navigation.goBack()}
        onConfirm={() => navigation.goBack()}
      />
    );
  }

  if (!snapshot) return null;

  const { plan, itineraries, flights, accommodations, expenses, checklist } =
    snapshot.snapshot;

  const hasExpenses = expenses !== null && expenses !== undefined;
  const hasChecklist = checklist !== null && checklist !== undefined;
  const hasBottomPanel = hasExpenses || hasChecklist;

  const bottomPanelCount = (hasExpenses ? 1 : 0) + (hasChecklist ? 1 : 0);
  const stackBottomPanels = isMobile && bottomPanelCount > 1;

  const leftContentHeight = mainLayoutHeight - hintHeight - innerGap;
  const availableHeight = hasBottomPanel
    ? leftContentHeight - innerGap
    : leftContentHeight;

  const isScrollMode = isMobile;

  let leftTopHeight: number;
  let leftBottomHeight: number;

  if (!hasBottomPanel) {
    leftTopHeight = leftContentHeight;
    leftBottomHeight = 0;
  } else if (isScrollMode) {
    leftTopHeight = 400;
    leftBottomHeight = stackBottomPanels
      ? 200 * bottomPanelCount + innerGap * (bottomPanelCount - 1)
      : 200;
  } else {
    leftBottomHeight = Math.round(availableHeight * 0.2);
    leftTopHeight = availableHeight - leftBottomHeight;
  }

  const expensePanelData = hasExpenses
    ? {
        plan: {
          id: 0,
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
        },
        expenses: (expenses ?? []).map((e, i) => ({
          id: String(i),
          category: e.category,
          amount: Number(e.amount),
          description: e.description ?? "",
          exDate: e.exDate,
          currency: e.currency,
        })),
        attachments: [],
        isLoading: false,
        error: null,
        refreshExpenses: async () => {},
      }
    : undefined;

  return (
    <GradientBackground
      colors={["#D7D0FF33", "#CBDDFF80"]}
      locations={[0.2, 0.502]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <View style={styles.headerWrapper}>
        <ViewerHeaderPanel
          planTitle={plan.title}
          onSave={handleSave}
          saving={isSaving}
        />
      </View>

      {isScrollMode ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            onLayout={e => setHintHeight(e.nativeEvent.layout.height)}
          >
            <ViewerHintPanel />
          </View>

            <View style={[styles.scheduleWrapper, { height: leftTopHeight }]}>
              <ViewerSchedulePanel
                itineraries={itineraries}
                flights={flights}
                accommodations={accommodations}
                planStartDate={plan.startDate}
                height={leftTopHeight}
                onItinerarySelect={handleItinerarySelect}
                onFlightSelect={handleFlightSelect}
                onAccommodationSelect={handleAccommodationSelect}
              />
            </View>

            {hasBottomPanel && (
              <View
                style={[
                  styles.bottomRow,
                  styles.bottomColumn,
                  { height: leftBottomHeight },
                ]}
              >
                {hasExpenses && expensePanelData ? (
                  <View style={styles.bottomCellStacked}>
                    <ExpensesPanel planData={expensePanelData} readOnly />
                  </View>
                ) : null}
                {hasChecklist ? (
                  <View style={styles.bottomCellStacked}>
                    <AIAssistantPanel
                      publicId={null}
                      readOnly
                      initialChecklist={checklist as any}
                    />
                  </View>
                ) : null}
              </View>
            )}

            <ViewerPlanSummaryPanel plan={plan} />
            <ViewerDetailPanel
              selectedType={selectedType}
              selectedItinerary={selectedItinerary}
              selectedFlight={selectedFlight}
              selectedAccommodation={selectedAccommodation}
              expenses={expenses}
            />
          </ScrollView>
        ) : (
          <View style={styles.container}>
            <View
              style={styles.mainLayout}
              onLayout={e => setMainLayoutHeight(e.nativeEvent.layout.height)}
            >
              <View style={[styles.leftArea, { flex: ratio.left }]}>
                <View
                  style={styles.hintRow}
                  onLayout={e => setHintHeight(e.nativeEvent.layout.height)}
                >
                  <ViewerHintPanel />
                </View>

                <View style={[styles.scheduleWrapper, { height: leftTopHeight }]}>
                  <ViewerSchedulePanel
                    itineraries={itineraries}
                    flights={flights}
                    accommodations={accommodations}
                    planStartDate={plan.startDate}
                    height={leftTopHeight}
                    onItinerarySelect={handleItinerarySelect}
                    onFlightSelect={handleFlightSelect}
                    onAccommodationSelect={handleAccommodationSelect}
                  />
                </View>

                {hasBottomPanel && (
                  <View
                    style={[
                      styles.bottomRow,
                      stackBottomPanels && styles.bottomColumn,
                      { height: leftBottomHeight },
                    ]}
                  >
                    {hasExpenses && expensePanelData ? (
                      <View
                        style={
                          stackBottomPanels
                            ? styles.bottomCellStacked
                            : styles.bottomCell
                        }
                      >
                        <ExpensesPanel planData={expensePanelData} readOnly />
                      </View>
                    ) : null}
                    {hasChecklist ? (
                      <View
                        style={
                          stackBottomPanels
                            ? styles.bottomCellStacked
                            : styles.bottomCell
                        }
                      >
                        <AIAssistantPanel
                          publicId={null}
                          readOnly
                          initialChecklist={checklist as any}
                        />
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              <View style={[styles.rightArea, { flex: ratio.right, height: mainLayoutHeight }]}>
                <View style={styles.summaryWrapper}>
                  <ViewerPlanSummaryPanel plan={plan} />
                </View>
                <View style={styles.detailWrapper}>
                  <ViewerDetailPanel
                    selectedType={selectedType}
                    selectedItinerary={selectedItinerary}
                    selectedFlight={selectedFlight}
                    selectedAccommodation={selectedAccommodation}
                    expenses={expenses}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

      <LoginPromptModal
        visible={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onLoginPress={handleLoginPress}
      />

      <TripDeleteConfirmModal
        visible={saveSuccessVisible}
        tripName=""
        title="내 일정으로 저장됐어요"
        description="저장된 일정으로 이동하시겠어요?"
        confirmLabel="이동하기"
        confirmButtonColor="#1F1F1F"
        onClose={() => setSaveSuccessVisible(false)}
        onConfirm={() => {
          setSaveSuccessVisible(false);
          if (savedPlanPublicId) {
            navigation.reset({
              index: 0,
              routes: [
                { name: "PLAN", params: { publicId: savedPlanPublicId } },
              ],
            });
          }
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerWrapper: {
    width: "100%",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  hintRow: {
    flexShrink: 0,
  },
  mainLayout: {
    flexDirection: "row",
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  scrollArea: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  leftArea: {
    gap: 16,
    minHeight: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  scheduleWrapper: {
    minHeight: 0,
    overflow: "hidden",
  },
  bottomRow: {
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
    overflow: "hidden",
  },
  bottomCell: {
    flex: 1,
    minHeight: 0,
  },
  bottomColumn: {
    flexDirection: "column",
  },
  bottomCellStacked: {
    flex: 1,
    minHeight: 0,
  },
  rightArea: {
    gap: 16,
    minHeight: 0,
    flexShrink: 1,
    overflow: "hidden",
  },
  summaryWrapper: {
    flexShrink: 0,
  },
  detailWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
});
