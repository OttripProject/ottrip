import type { CalendarMarkedDates, SegmentDraft } from "@/hooks/useTripForm";
import TripCalendarModal from "../trip/TripCalendarModal";
import TripDurationBanner from "../trip/TripDurationBanner";
import TripSegmentList from "../trip/TripSegmentList";
import { useBackdropClose } from "@/hooks/useBackdropClose";
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
  type ViewStyle,
} from "react-native";
import CloseXIcon from "../../../assets/close_x.svg";

export interface TripFormModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  tripData: { name: string; segments: SegmentDraft[] };
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
  isSubmitDisabled: boolean;
}

export default function TripFormModal({
  visible,
  onClose,
  mode,
  tripData,
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
  isSubmitDisabled,
}: TripFormModalProps) {
  const title = mode === "add" ? "새 여행 추가" : "여행 수정";
  const submitButtonText = mode === "add" ? "여행 저장" : "여행 수정";

  const [calendarOpenIndex, setCalendarOpenIndex] = useState<number | null>(
    null,
  );
  const prevSelectionModeRef = useRef(selectionMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const submitDisabled = isSubmitDisabled || isSubmitting;
  const backdrop = useBackdropClose(onClose);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
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
    if (!visible) setCalendarOpenIndex(null);
  }, [visible]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
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
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <MotionIcon>
                  <CloseXIcon width={16} height={16} color={colors.gray600} />
                </MotionIcon>
              </MotionPressable>
            </View>

            <ScrollView
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
                  style={styles.nameInput}
                  placeholder="예: 동유럽 여행"
                  placeholderTextColor={colors.gray600}
                  value={tripData.name}
                  onChangeText={onNameChange}
                  maxLength={30}
                />
              </View>

              <View style={styles.section}>
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
                />
              </View>

              <TripDurationBanner segments={tripData.segments} />
            </ScrollView>

            <View style={styles.footer}>
              <MotionPressable
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </MotionPressable>
              <MotionPressable
                style={[
                  styles.submitButton,
                  submitDisabled && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitDisabled}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    submitDisabled && styles.submitButtonTextDisabled,
                  ]}
                >
                  {submitButtonText}
                </Text>
              </MotionPressable>
            </View>
          </View>
        </View>
      </Modal>

      <TripCalendarModal
        visible={calendarOpenIndex !== null}
        onClose={() => setCalendarOpenIndex(null)}
        selectionMode={selectionMode}
        markedDates={markedDates}
        onDateSelect={onDateSelect}
      />
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
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    ...surfaces.muted,
  },
  cancelButtonText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    ...surfaces.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray300,
    backgroundImage: "none",
    boxShadow: "none",
  } as ViewStyle,
  submitButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.gray600,
  },
});
