import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import FlightEditModal from "@/components/modals/mobile/FlightEditModal.native";
import ItineraryEditModal from "@/components/modals/mobile/ItineraryEditModal.native";
import type { Accommodation, FlightRead, Itinerary } from "@/types/api";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import type dayjs from "dayjs";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FlightIcon from "../../../../assets/airplane.svg";
import AccommodationIcon from "../../../../assets/mobile_accomodation.svg";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import CloseIcon from "../../../../assets/x.svg";

type AddScheduleTab = "accommodation" | "flight" | "itinerary";

interface AddScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
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
  onRefresh?: () => void | Promise<void>;
}

export default function AddScheduleModal({
  visible,
  onClose,
  onSaved,
  planId,
  planStartDate,
  selectedDate,
  planData,
  onRefresh,
}: AddScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<AddScheduleTab>("itinerary");

  const finishAfterSave = () => {
    if (onSaved) {
      onSaved();
    } else {
      onClose();
    }
  };

  // fromSave: true일 때는 이미 finishAfterSave가 호출됐으므로 무시
  const handleClose = (opts?: { fromSave?: boolean }) => {
    if (opts?.fromSave) return;
    onClose();
  };

  const renderContent = () => {
    if (activeTab === "itinerary") {
      return (
        <ItineraryEditModal
          visible={visible}
          onClose={handleClose}
          itinerary={null}
          planId={planId}
          defaultDate={selectedDate?.format("YYYY-MM-DD")}
          embedded
          onSave={async itinerary => {
            planData.addItinerary(itinerary);
            onRefresh?.();
            finishAfterSave();
          }}
        />
      );
    }
    if (activeTab === "accommodation") {
      return (
        <AccommodationEditModal
          visible={visible}
          onClose={handleClose}
          accommodation={null}
          planId={planId}
          defaultDate={selectedDate?.format("YYYY-MM-DD")}
          embedded
          onSave={async accommodation => {
            planData.addAccommodation(accommodation);
            onRefresh?.();
            finishAfterSave();
          }}
        />
      );
    }
    return (
      <FlightEditModal
        visible={visible}
        onClose={handleClose}
        flight={null}
        planId={planId}
        planStartDate={planStartDate}
        defaultDate={selectedDate?.format("YYYY-MM-DD")}
        embedded
        onSave={async flight => {
          planData.addFlight(flight);
          onRefresh?.();
          finishAfterSave();
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
            style={[
              styles.categoryTab,
              activeTab === "accommodation" && styles.categoryTabActive,
            ]}
            onPress={() => setActiveTab("accommodation")}
          >
            <AccommodationIcon
              width={16}
              height={16}
              color={
                activeTab === "accommodation" ? colors.primary : colors.gray600
              }
            />
            <Text
              style={[
                styles.categoryTabText,
                activeTab === "accommodation" && styles.categoryTabTextActive,
              ]}
            >
              숙소
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.categoryTab,
              activeTab === "flight" && styles.categoryTabActive,
            ]}
            onPress={() => setActiveTab("flight")}
          >
            <FlightIcon
              width={16}
              height={16}
              color={activeTab === "flight" ? colors.primary : colors.gray600}
            />
            <Text
              style={[
                styles.categoryTabText,
                activeTab === "flight" && styles.categoryTabTextActive,
              ]}
            >
              항공
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.categoryTab,
              activeTab === "itinerary" && styles.categoryTabActive,
            ]}
            onPress={() => setActiveTab("itinerary")}
          >
            <CalendarIcon
              width={16}
              height={16}
              color={
                activeTab === "itinerary" ? colors.primary : colors.gray600
              }
            />
            <Text
              style={[
                styles.categoryTabText,
                activeTab === "itinerary" && styles.categoryTabTextActive,
              ]}
            >
              일정
            </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  titleSpacer: {
    width: 32,
  },
  headerTitle: {
    ...textStyles.h4,
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    alignItems: "flex-end",
  },
  categoryTabs: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 6,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
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
