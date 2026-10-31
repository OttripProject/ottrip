import {
  type CalendarMarkedDates,
  type SegmentDraft,
  getTripFormErrors,
} from "@/hooks/useTripForm";
import TripCalendarModal from "../trip/TripCalendarModal";
import TripDurationBanner from "../trip/TripDurationBanner";
import TripSegmentList from "../trip/TripSegmentList";
import { ToastUI, useToast } from "@/contexts/ToastContext";
import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import { useBackdropClose } from "@/hooks/useBackdropClose";
import ActionButton from "@/ui/components/ActionButton";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CloseXIcon from "../../../assets/close_x.svg";

export interface TripFormModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  tripData: { name: string; segments: SegmentDraft[] };
  initialTripData?: { name: string; segments: SegmentDraft[] };
  activeSegmentIndex: number;
  selectionMode: "start" | "end";
  onNameChange: (name: string) => void;
  onSegmentUpdate: (index: number, data: Partial<SegmentDraft>) => void;
  onSegmentAdd: () => void;
  onSegmentRemove: (index: number) => void;
  onSegmentMove: (fromIndex: number, toIndex: number) => void;
  onSegmentFocus: (index: number) => void;
  markedDates: CalendarMarkedDates;
  onDateSelect: (dateString: string) => void;
  onSubmit: () => void | Promise<void>;
}

export default function TripFormModal({
  visible,
  onClose,
  mode,
  tripData,
  initialTripData,
  activeSegmentIndex,
  selectionMode,
  onNameChange,
  onSegmentUpdate,
  onSegmentAdd,
  onSegmentRemove,
  onSegmentMove,
  onSegmentFocus,
  markedDates,
  onDateSelect,
  onSubmit,
}: TripFormModalProps) {
  const title = mode === "add" ? "새 여행 추가" : "여행 수정";

  const [calendarOpenIndex, setCalendarOpenIndex] = useState<number | null>(
    null,
  );
  const prevSelectionModeRef = useRef(selectionMode);
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const submittingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const segmentListY = useRef(0);
  const segmentYs = useRef<Record<number, number>>({});
  const errors = showErrors ? getTripFormErrors(tripData) : null;
  const isUnchanged =
    !!initialTripData &&
    JSON.stringify(initialTripData) === JSON.stringify(tripData);
  const isDirty = initialTripData
    ? !isUnchanged
    : !!tripData.name.trim() ||
      tripData.segments.some(
        seg => seg.country || seg.city || seg.startDate || seg.endDate,
      );
  const { requestClose, discardConfirmModal } = useDiscardConfirm(
    isDirty,
    onClose,
  );
  const handleClose = () => {
    if (!submittingRef.current) requestClose();
  };
  const backdrop = useBackdropClose(handleClose);

  const scrollToFirstError = (
    formErrors: NonNullable<ReturnType<typeof getTripFormErrors>>,
  ) => {
    if (formErrors.name) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const idx = formErrors.segments.findIndex(
      seg => seg.country || seg.city || seg.date,
    );
    if (idx < 0) return;
    scrollRef.current?.scrollTo({
      y: segmentListY.current + (segmentYs.current[idx] ?? 0),
      animated: true,
    });
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const formErrors = getTripFormErrors(tripData);
    if (formErrors) {
      setShowErrors(true);
      scrollToFirstError(formErrors);
      showToast("입력되지 않은 값이 있어요.", { icon: "warning" });
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      calendarOpenIndex !== null &&
      prevSelectionModeRef.current === "end" &&
      selectionMode === "start"
    ) {
      setCalendarOpenIndex(null);
    }
    prevSelectionModeRef.current = selectionMode;
  }, [selectionMode, calendarOpenIndex]);

  useEffect(() => {
    if (!visible) {
      setCalendarOpenIndex(null);
      setShowErrors(false);
    }
  }, [visible]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay} {...backdrop.overlayProps}>
          <View style={styles.modalContent} {...backdrop.cardProps}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                  구간별로 나라·도시·기간을 추가해보세요.
                </Text>
              </View>
              <MotionPressable
                onPress={handleClose}
                disabled={isSubmitting}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <MotionIcon>
                  <CloseXIcon width={16} height={16} color={colors.gray700} />
                </MotionIcon>
              </MotionPressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>여행명</Text>
                  <Text style={styles.counter}>{tripData.name.length}/30</Text>
                </View>
                <Input
                  variant="filled"
                  style={[styles.nameInput, errors?.name && styles.nameInputError]}
                  placeholder="예: 동유럽 여행"
                  placeholderTextColor={colors.gray600}
                  value={tripData.name}
                  onChangeText={onNameChange}
                  maxLength={30}
                />
                {errors?.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              <View
                style={styles.section}
                onLayout={e => {
                  segmentListY.current = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>여행 구간</Text>
                  <Text style={styles.sectionHint}>
                    나라 · 도시 · 기간을 순서대로 추가하세요
                  </Text>
                </View>
                <TripSegmentList
                  segments={tripData.segments}
                  onSegmentUpdate={onSegmentUpdate}
                  onSegmentAdd={onSegmentAdd}
                  onSegmentRemove={onSegmentRemove}
                  onSegmentMove={onSegmentMove}
                  onSegmentFocus={onSegmentFocus}
                  onDateButtonPress={idx => {
                    onSegmentFocus(idx);
                    setCalendarOpenIndex(idx);
                  }}
                  errors={errors?.segments}
                  onSegmentLayout={(idx, y) => {
                    segmentYs.current[idx] = y;
                  }}
                />
              </View>

              <TripDurationBanner segments={tripData.segments} />
            </ScrollView>

            <View style={styles.footer}>
              <ActionButton
                label="취소"
                tone="secondary"
                fill
                onPress={handleClose}
                blocked={isSubmitting}
              />
              <ActionButton
                label="저장"
                fill
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isUnchanged}
              />
            </View>
          </View>
        </View>
        <ToastUI />
      </Modal>

      <TripCalendarModal
        visible={calendarOpenIndex !== null}
        onClose={() => setCalendarOpenIndex(null)}
        selectionMode={selectionMode}
        markedDates={markedDates}
        onDateSelect={onDateSelect}
      />
      {discardConfirmModal}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing["2xl"] + spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    ...modalMotion.card,
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    width: 520 + spacing.xl * 2,
    maxWidth: "100%",
    maxHeight: "100%",
    gap: spacing.xl,
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...textStyles.h3,
    color: colors.gray900,
  },
  subtitle: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    ...surfaces.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: -spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  sectionLabel: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  sectionHint: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  counter: {
    ...textStyles.body6,
    fontVariant: ["tabular-nums"],
    color: colors.gray600,
  },
  nameInput: {
    width: "100%",
    height: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    ...textStyles.body4,
    color: colors.gray900,
  },
  nameInputError: {
    borderColor: colors.danger,
  },
  errorText: {
    ...textStyles.body6,
    color: colors.danger,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
});
