import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import PanelLayout from "./PanelLayout";
import AccommodationSection from "./accommodations/AccommodationSection";
import FlightSection from "./flights/FlightSection";
import ItinerarySection from "./itineraries/ItinerarySection";

interface DetailsPanelProps {
  planData?: {
    plan: any;
    itineraries: any[];
    flights: any[];
    accommodations: any[];
    expenses: any[];
    isLoading: boolean;
    error: string | null;
    refreshItineraries: () => Promise<void>;
    refreshFlights: () => Promise<void>;
    refreshAccommodations: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  selectedItinerary?: any;
  selectedFlight?: any;
  selectedAccommodation?: any;
  activeTab?: "itinerary" | "flight" | "accommodation" | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onItineraryClear?: () => void;
  onOpenNewItineraryFromExisting?: (draft: any) => void;
  onFlightAdd?: (flight: any) => void;
  onFlightClear?: () => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onAccommodationSelect?: (accommodation: any) => void;
  onAccommodationClear?: () => void;
  onExpenseAdd?: (expense: any) => void;
  // 외부에서 새 항공편 폼을 바로 열도록 트리거
  openNewFlightForm?: boolean;
  onConsumeOpenNewFlightForm?: () => void;
  openNewItineraryForm?: boolean;
  onConsumeOpenNewItineraryForm?: () => void;
  selectedItineraryDate?: Date | null;
  openNewAccommodationForm?: boolean;
  onConsumeOpenNewAccommodationForm?: () => void;
  newAccommodationDraft?: any | null;
  newItineraryDraft?: any | null;
  onPreviewAccommodationChange?: (preview: any) => void;
  onTabChange?: (tab: "itinerary" | "flight" | "accommodation", draft?: any) => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function DetailsPanel({
  planData,
  selectedItinerary,
  selectedFlight,
  selectedAccommodation,
  activeTab,
  onItineraryAdd,
  onItineraryClear,
  onOpenNewItineraryFromExisting,
  onFlightAdd,
  onFlightClear,
  onAccommodationAdd,
  onAccommodationSelect,
  onAccommodationClear,
  onExpenseAdd,
  openNewFlightForm,
  onConsumeOpenNewFlightForm,
  openNewItineraryForm,
  onConsumeOpenNewItineraryForm,
  selectedItineraryDate,
  openNewAccommodationForm,
  onConsumeOpenNewAccommodationForm,
  newAccommodationDraft,
  newItineraryDraft,
  onPreviewAccommodationChange,
  onTabChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: DetailsPanelProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentKey = `${activeTab ?? ""}-${selectedItinerary?.id ?? ""}-${selectedFlight?.id ?? ""}-${selectedAccommodation?.id ?? ""}`;
  const prevKeyRef = useRef(contentKey);

  useEffect(() => {
    if (prevKeyRef.current === contentKey) return;
    prevKeyRef.current = contentKey;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [contentKey]);

  if (!planData?.plan) {
    return (
      <PanelLayout style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </PanelLayout>
    );
  }

  // 활성 탭에 따라 표시할 내용 결정
  const renderContent = () => {
    // 단일 아이템이 선택된 경우 - 해당 섹션 컴포넌트에 전달
    if (selectedItinerary) {
      return (
        <ItinerarySection
          planData={planData}
          selectedItinerary={selectedItinerary}
          activeTab={activeTab}
          onItineraryAdd={onItineraryAdd}
          onItineraryClear={onItineraryClear}
          onOpenNewItineraryFromExisting={onOpenNewItineraryFromExisting}
          openNewItineraryForm={openNewItineraryForm}
          onConsumeOpenNewItineraryForm={onConsumeOpenNewItineraryForm}
          selectedItineraryDate={selectedItineraryDate}
          newItineraryDraft={newItineraryDraft}
          onTabChange={onTabChange}
          stagedDocumentAnalyze={stagedDocumentAnalyze}
          onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
          routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
          carryoverPendingFiles={carryoverPendingFiles}
          onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        />
      );
    }

    if (selectedFlight) {
      return (
        <FlightSection
          planData={planData}
          selectedFlight={selectedFlight}
          activeTab={activeTab}
          onFlightAdd={onFlightAdd}
          onFlightClear={onFlightClear}
          openNewFlightForm={openNewFlightForm}
          onConsumeOpenNewFlightForm={onConsumeOpenNewFlightForm}
          onTabChange={onTabChange}
          stagedDocumentAnalyze={stagedDocumentAnalyze}
          onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
          routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
          carryoverPendingFiles={carryoverPendingFiles}
          onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        />
      );
    }

    if (selectedAccommodation) {
      return (
        <AccommodationSection
          planData={planData}
          selectedAccommodation={selectedAccommodation}
          activeTab={activeTab}
          onAccommodationAdd={onAccommodationAdd}
          onAccommodationSelect={onAccommodationSelect}
          onAccommodationClear={onAccommodationClear}
          openNewAccommodationForm={openNewAccommodationForm}
          onConsumeOpenNewAccommodationForm={onConsumeOpenNewAccommodationForm}
          newAccommodationDraft={newAccommodationDraft}
          onPreviewChange={onPreviewAccommodationChange}
          onTabChange={onTabChange}
          stagedDocumentAnalyze={stagedDocumentAnalyze}
          onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
          routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
          carryoverPendingFiles={carryoverPendingFiles}
          onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        />
      );
    }

    // 아무것도 선택되지 않은 경우 - 리스트 표시
    if (!activeTab) {
      return <View style={styles.placeholder}></View>;
    }

    switch (activeTab) {
      case "itinerary":
        return (
          <ItinerarySection
            planData={planData}
            activeTab={activeTab}
            onItineraryAdd={onItineraryAdd}
            onItineraryClear={onItineraryClear}
            openNewItineraryForm={openNewItineraryForm}
            onConsumeOpenNewItineraryForm={onConsumeOpenNewItineraryForm}
            selectedItineraryDate={selectedItineraryDate}
            newItineraryDraft={newItineraryDraft}
            onTabChange={onTabChange}
            stagedDocumentAnalyze={stagedDocumentAnalyze}
            onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
            routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
            carryoverPendingFiles={carryoverPendingFiles}
            onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
          />
        );

      case "flight":
        return (
          <FlightSection
            planData={planData}
            activeTab={activeTab}
            onFlightAdd={onFlightAdd}
            onFlightClear={onFlightClear}
            openNewFlightForm={openNewFlightForm}
            onConsumeOpenNewFlightForm={onConsumeOpenNewFlightForm}
            onTabChange={onTabChange}
            stagedDocumentAnalyze={stagedDocumentAnalyze}
            onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
            routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
            carryoverPendingFiles={carryoverPendingFiles}
            onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
          />
        );

      case "accommodation":
        return (
          <AccommodationSection
            planData={planData}
            activeTab={activeTab}
            onAccommodationAdd={onAccommodationAdd}
            onAccommodationSelect={onAccommodationSelect}
            onAccommodationClear={onAccommodationClear}
            onPreviewChange={onPreviewAccommodationChange}
            openNewAccommodationForm={openNewAccommodationForm}
            onConsumeOpenNewAccommodationForm={
              onConsumeOpenNewAccommodationForm
            }
            newAccommodationDraft={newAccommodationDraft}
            onTabChange={onTabChange}
            stagedDocumentAnalyze={stagedDocumentAnalyze}
            onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
            routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
            carryoverPendingFiles={carryoverPendingFiles}
            onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
          />
        );

      default:
        return <View style={styles.placeholder}></View>;
    }
  };

  return (
    <PanelLayout style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderContent()}
      </Animated.View>
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
