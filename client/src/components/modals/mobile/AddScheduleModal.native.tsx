import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import AddExpenseModal from "@/components/modals/mobile/AddExpenseModal.native";
import FlightEditModal from "@/components/modals/mobile/FlightEditModal.native";
import ItineraryEditModal from "@/components/modals/mobile/ItineraryEditModal.native";
import type { Accommodation, DocumentUploadAnalyzeResponse, FlightRead, Itinerary, LocalFile } from "@/types/api";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import type dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FlightIcon from "../../../../assets/airplane.svg";
import AccommodationIcon from "../../../../assets/mobile_accomodation.svg";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import CloseIcon from "../../../../assets/x.svg";

const TABS = [
  { key: "accommodation", label: "숙소", Icon: AccommodationIcon },
  { key: "flight", label: "항공", Icon: FlightIcon },
  { key: "itinerary", label: "일정", Icon: CalendarIcon },
] as const;

type AddScheduleTab = "accommodation" | "flight" | "itinerary";

interface AddScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  selectedDate?: dayjs.Dayjs;
  defaultCountry?: string;
  defaultCity?: string;
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
  planEndDate,
  selectedDate,
  defaultCountry,
  defaultCity,
  planData,
  onRefresh,
}: AddScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<AddScheduleTab>("itinerary");
  const [pendingAiResult, setPendingAiResult] = useState<{
    result: DocumentUploadAnalyzeResponse;
    filename?: string;
    pendingFiles?: LocalFile[];
  } | null>(null);
  const [pendingExpenseResult, setPendingExpenseResult] = useState<{
    result: DocumentUploadAnalyzeResponse;
    filename?: string;
    pendingFiles?: LocalFile[];
  } | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  useEffect(() => {
    setPendingAiResult(null);
  }, [activeTab]);

  useEffect(() => {
    if (!visible) {
      setPendingExpenseResult(null);
      setShowExpenseModal(false);
    }
  }, [visible]);

  useEffect(() => {
    if (pendingExpenseResult && !showExpenseModal) {
      const timer = setTimeout(() => setShowExpenseModal(true), 350);
      return () => clearTimeout(timer);
    }
  }, [pendingExpenseResult, showExpenseModal]);

  const handleRouteMismatchResult = useCallback(
    (result: DocumentUploadAnalyzeResponse, filename?: string, pendingFiles?: LocalFile[]) => {
      const targetType = result.inferredItemType ?? result.draft?.itemType;
      if (targetType === "expense") {
        setPendingExpenseResult({ result, filename, pendingFiles });
        return;
      }
      setPendingAiResult({ result, filename, pendingFiles });
      if (targetType === "flight") setActiveTab("flight");
      else if (targetType === "accommodation") setActiveTab("accommodation");
      else if (targetType === "itinerary") setActiveTab("itinerary");
    },
    [],
  );

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
          defaultCountry={defaultCountry}
          defaultCity={defaultCity}
          embedded
          pendingAiResult={pendingAiResult}
          onRouteMismatchResult={handleRouteMismatchResult}
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
          defaultCountry={defaultCountry}
          defaultCity={defaultCity}
          embedded
          pendingAiResult={pendingAiResult}
          onRouteMismatchResult={handleRouteMismatchResult}
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
        pendingAiResult={pendingAiResult}
        onRouteMismatchResult={handleRouteMismatchResult}
        onSave={async flight => {
          planData.addFlight(flight);
          onRefresh?.();
          finishAfterSave();
        }}
      />
    );
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.92}>
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>새 일정 추가</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="닫기"
          >
            <CloseIcon width={12} height={12} color={colors.gray700} />
          </Pressable>
        </View>

        <View style={styles.categoryTabs}>
          {TABS.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <Pressable
                key={key}
                style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                onPress={() => setActiveTab(key)}
              >
                <View style={!isActive && styles.categoryTabIconInactive}>
                  <Icon
                    width={14}
                    height={14}
                    color={isActive ? colors.paletteInk : colors.paletteFg3}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryTabText,
                    isActive && styles.categoryTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <AddExpenseModal
        visible={showExpenseModal}
        onClose={opts => {
          setShowExpenseModal(false);
          setPendingExpenseResult(null);
          if (opts?.fromSave) {
            setTimeout(() => finishAfterSave(), 400);
          }
        }}
        planId={planId}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        defaultExDate={selectedDate?.format("YYYY-MM-DD")}
        pendingAiResult={pendingExpenseResult}
        onExpenseAdd={() => {
          onRefresh?.();
        }}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  titleRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    marginBottom: spacing.lg + spacing.xs,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.paletteInk,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: -spacing.xs,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTabs: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.paletteFill,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  categoryTabActive: {
    backgroundColor: colors.white,
    ...shadows.segmentActive,
  },
  categoryTabIconInactive: {
    opacity: 0.55,
  },
  categoryTabText: {
    ...textStyles.h7,
    color: colors.paletteFg3,
  },
  categoryTabTextActive: {
    color: colors.paletteInk,
  },
  content: {
    flex: 1,
  },
});
