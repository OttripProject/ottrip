import LoginPromptModal from "@/components/modals/LoginPromptModal";
import ViewerDetailPanel from "@/components/panels/ViewerDetailPanel";
import ViewerHeaderPanel from "@/components/panels/ViewerHeaderPanel";
import ViewerHintPanel from "@/components/panels/ViewerHintPanel";
import ViewerPlanSummaryPanel from "@/components/panels/ViewerPlanSummaryPanel";
import ViewerSchedulePanel from "@/components/panels/ViewerSchedulePanel";
import AIAssistantPanel from "@/components/panels/aiassistant/AIAssistantPanel";
import ExpensesPanel from "@/components/panels/expenses/ExpensesPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  plansApi,
  type ExportAccommodation,
  type ExportFlight,
  type ExportItinerary,
  type PlanExportSnapshot,
} from "@/services/plans";
import GradientBackground from "@/ui/components/GradientBackground";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
  const [mainLayoutHeight, setMainLayoutHeight] = useState(600);
  const [hintHeight, setHintHeight] = useState(48);

  const isMobile = width < 768;

  const getResponsiveRatio = () => {
    if (isMobile) return { left: 1, right: 0 };
    if (width < 1024) return { left: 0.6, right: 0.4 };
    if (width < 1440) return { left: 0.7, right: 0.3 };
    return { left: 0.8, right: 0.2 };
  };
  const ratio = getResponsiveRatio();

  const innerGap = 16;

  useEffect(() => {
    if (!publicId) return;
    setIsLoading(true);
    plansApi
      .getExport(publicId)
      .then(data => setSnapshot(data))
      .catch(() => Alert.alert("오류", "일정을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [publicId]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }
    try {
      const result = await plansApi.saveExport(publicId);
      Alert.alert("완료", "내 일정으로 저장했습니다.", [
        {
          text: "확인",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "PLAN", params: { publicId: result.planPublicId } }],
            }),
        },
      ]);
    } catch {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  const handleLoginPress = () => {
    setLoginPromptOpen(false);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try { window.localStorage.setItem("pendingSavePublicId", publicId); } catch {}
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

  if (!snapshot) return null;

  const { plan, itineraries, flights, accommodations, expenses, checklist } =
    snapshot.snapshot;

  const hasExpenses = !!expenses && expenses.length > 0;
  const hasChecklist = !!checklist;
  const hasBottomPanel = hasExpenses || hasChecklist;

  const leftContentHeight = mainLayoutHeight - hintHeight - 2 * innerGap;
  const leftTopHeight = hasBottomPanel
    ? Math.max(200, Math.floor(leftContentHeight * 0.85))
    : Math.max(200, mainLayoutHeight - hintHeight - innerGap);
  const leftBottomHeight = hasBottomPanel
    ? Math.max(120, leftContentHeight - leftTopHeight)
    : 0;

  const expensePanelData = hasExpenses
    ? {
        plan: {
          id: 0,
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
        },
        expenses: expenses!.map((e, i) => ({
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
        <ViewerHeaderPanel planTitle={plan.title} onSave={handleSave} />
      </View>

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
              <View style={[styles.bottomRow, { height: leftBottomHeight }]}>
                {hasExpenses && expensePanelData ? (
                  <View style={styles.bottomCell}>
                    <ExpensesPanel planData={expensePanelData} readOnly />
                  </View>
                ) : null}
                {hasChecklist ? (
                  <View style={styles.bottomCell}>
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

          {!isMobile && (
            <View style={[styles.rightArea, { flex: ratio.right }]}>
              <View style={styles.summaryWrapper}>
                <ViewerPlanSummaryPanel plan={plan} />
              </View>
              <View style={styles.detailWrapper}>
                <ViewerDetailPanel
                  selectedType={selectedType}
                  selectedItinerary={selectedItinerary}
                  selectedFlight={selectedFlight}
                  selectedAccommodation={selectedAccommodation}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <LoginPromptModal
        visible={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onLoginPress={handleLoginPress}
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
