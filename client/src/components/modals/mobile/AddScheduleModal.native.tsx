import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import ItineraryEditModal from '@/components/modals/mobile/ItineraryEditModal.native';
import AccommodationEditModal from '@/components/modals/mobile/AccommodationEditModal.native';
import FlightEditModal from '@/components/modals/mobile/FlightEditModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CloseIcon from '../../../../assets/x.svg';
import AccommodationIcon from '../../../../assets/mobile_accomodation.svg';
import FlightIcon from '../../../../assets/airplane.svg';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';
import { Itinerary, Accommodation, FlightRead } from '@/types/api';
import dayjs from 'dayjs';

type AddScheduleTab = 'accommodation' | 'flight' | 'itinerary';

interface AddScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  selectedDate?: dayjs.Dayjs;
  planData: {
    addItinerary: (itinerary: Itinerary) => void;
    addAccommodation: (accommodation: Accommodation) => void;
    addFlight: (flight: FlightRead) => void;
    removeItinerary: (id: number) => void;
    removeAccommodation: (id: number) => void;
    removeFlight: (id: number) => void;
  };
  onRefresh?: () => void;
}

export default function AddScheduleModal({
  visible,
  onClose,
  planId,
  planStartDate,
  selectedDate,
  planData,
  onRefresh,
}: AddScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<AddScheduleTab>('itinerary');

  const renderContent = () => {
    if (activeTab === 'itinerary') {
      return (
        <ItineraryEditModal
          visible={visible}
          onClose={onClose}
          itinerary={null}
          planId={planId}
          embedded
          onSave={(itinerary) => {
            planData.addItinerary(itinerary);
            onRefresh?.();
            onClose();
          }}
        />
      );
    }
    if (activeTab === 'accommodation') {
      return (
        <AccommodationEditModal
          visible={visible}
          onClose={onClose}
          accommodation={null}
          planId={planId}
          embedded
          onSave={(accommodation) => {
            planData.addAccommodation(accommodation);
            onRefresh?.();
            onClose();
          }}
        />
      );
    }
    return (
      <FlightEditModal
        visible={visible}
        onClose={onClose}
        flight={null}
        planId={planId}
        planStartDate={planStartDate}
        embedded
        onSave={(flight) => {
          planData.addFlight(flight);
          onRefresh?.();
          onClose();
        }}
      />
    );
  };

  return (
    <FullScreenModal visible={visible} onClose={onClose}>
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <View style={styles.titleSpacer} />
          <Text style={styles.headerTitle}>새 일정 추가</Text>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>
        <View style={styles.categoryTabs}>
          <Pressable
            style={[styles.categoryTab, activeTab === 'accommodation' && styles.categoryTabActive]}
            onPress={() => setActiveTab('accommodation')}
          >
            <AccommodationIcon width={16} height={16} color={activeTab === 'accommodation' ? colors.primary : colors.gray600} />
            <Text style={[styles.categoryTabText, activeTab === 'accommodation' && styles.categoryTabTextActive]}>숙소</Text>
          </Pressable>
          <Pressable
            style={[styles.categoryTab, activeTab === 'flight' && styles.categoryTabActive]}
            onPress={() => setActiveTab('flight')}
          >
            <FlightIcon width={16} height={16} color={activeTab === 'flight' ? colors.primary : colors.gray600} />
            <Text style={[styles.categoryTabText, activeTab === 'flight' && styles.categoryTabTextActive]}>항공</Text>
          </Pressable>
          <Pressable
            style={[styles.categoryTab, activeTab === 'itinerary' && styles.categoryTabActive]}
            onPress={() => setActiveTab('itinerary')}
          >
            <CalendarIcon width={16} height={16} color={activeTab === 'itinerary' ? colors.primary : colors.gray600} />
            <Text style={[styles.categoryTabText, activeTab === 'itinerary' && styles.categoryTabTextActive]}>일정</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  titleSpacer: {
    width: 32,
  },
  headerTitle: {
    ...textStyles.h4,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    alignItems: 'flex-end',
  },
  categoryTabs: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 6,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
  },
  categoryTabActive: {
    backgroundColor: colors.white,
  },
  categoryTabText: {
    ...textStyles.h6,
    color: colors.gray600,
  },
  categoryTabTextActive: {
    ...textStyles.h6,
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
});
