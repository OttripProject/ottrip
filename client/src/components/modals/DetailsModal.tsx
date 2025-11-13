import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import ModalLayout from './ModalLayout';
import ItinerarySection from './DetailsModalSections/ItinerarySection';
import FlightSection from './DetailsModalSections/FlightSection';
import AccommodationSection from './DetailsModalSections/AccommodationSection';

interface DetailsModalProps {
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
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onAccommodationSelect?: (accommodation: any) => void;
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
}


export default function DetailsModal({
  planData,
  selectedItinerary,
  selectedFlight,
  selectedAccommodation,
  activeTab,
  onItineraryAdd,
  onFlightAdd,
  onAccommodationAdd,
  onAccommodationSelect,
  onExpenseAdd,
  openNewFlightForm,
  onConsumeOpenNewFlightForm,
  openNewItineraryForm,
  onConsumeOpenNewItineraryForm,
  selectedItineraryDate,
  openNewAccommodationForm,
  onConsumeOpenNewAccommodationForm,
  newAccommodationDraft,
}: DetailsModalProps) {
  if (!planData?.plan) {
    return (
      <ModalLayout style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </ModalLayout>
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
          openNewItineraryForm={openNewItineraryForm}
          onConsumeOpenNewItineraryForm={onConsumeOpenNewItineraryForm}
          selectedItineraryDate={selectedItineraryDate}
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
          openNewFlightForm={openNewFlightForm}
          onConsumeOpenNewFlightForm={onConsumeOpenNewFlightForm}
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
          openNewAccommodationForm={openNewAccommodationForm}
          onConsumeOpenNewAccommodationForm={onConsumeOpenNewAccommodationForm}
          newAccommodationDraft={newAccommodationDraft}
        />
      );
    }

    // 아무것도 선택되지 않은 경우 - 리스트 표시
    if (!activeTab) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>항목을 선택해주세요</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'itinerary':
        return (
          <ItinerarySection
            planData={planData}
            activeTab={activeTab}
            onItineraryAdd={onItineraryAdd}
            openNewItineraryForm={openNewItineraryForm}
            onConsumeOpenNewItineraryForm={onConsumeOpenNewItineraryForm}
            selectedItineraryDate={selectedItineraryDate}
          />
        );

      case 'flight':
        return (
          <FlightSection
            planData={planData}
            activeTab={activeTab}
            onFlightAdd={onFlightAdd}
            openNewFlightForm={openNewFlightForm}
            onConsumeOpenNewFlightForm={onConsumeOpenNewFlightForm}
          />
        );

      case 'accommodation':
        return (
          <AccommodationSection
            planData={planData}
            activeTab={activeTab}
            onAccommodationAdd={onAccommodationAdd}
            onAccommodationSelect={onAccommodationSelect}
            openNewAccommodationForm={openNewAccommodationForm}
            onConsumeOpenNewAccommodationForm={onConsumeOpenNewAccommodationForm}
            newAccommodationDraft={newAccommodationDraft}
          />
        );

      default:
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>항목을 선택해주세요</Text>
          </View>
        );
    }
  };

  const isInitial = !activeTab && !selectedItinerary && !selectedFlight && !selectedAccommodation;

  return (
    <ModalLayout style={styles.container}>
      <View style={styles.scrollWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={isInitial ? [styles.scrollContent, styles.centerScroll] : styles.scrollContent}
          showsVerticalScrollIndicator
          bounces={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
