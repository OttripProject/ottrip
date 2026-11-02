import { useToast } from "@/contexts/ToastContext";
import { getTripFormErrors, useTripForm } from "@/hooks/useTripForm";
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "@/types/api";
import TripCalendarModal from "@/components/trip/TripCalendarModal";
import TripDurationBanner from "@/components/trip/TripDurationBanner";
import TripSegmentList from "@/components/trip/TripSegmentList";
import ActionButton from "@/ui/components/ActionButton";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CloseIcon from "../../../../assets/mobile_close.svg";

interface AddPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onPlanCreated: (plan: Plan) => void;
  addPlan: (data: CreatePlanRequest) => Promise<Plan>;
  planToEdit?: Plan | null;
  updatePlan?: (planId: number, planData: UpdatePlanRequest) => Promise<Plan>;
}


export default function AddPlanModal({
  visible,
  onClose,
  onPlanCreated,
  addPlan,
  planToEdit,
  updatePlan,
}: AddPlanModalProps) {
  const {
    tripData,
    selectionMode,
    addSegment,
    removeSegment,
    moveSegment,
    updateSegment,
    updateTripData,
    handleDateSelect,
    getMarkedDates,
    setActiveSegmentIndex,
    resetForm,
    setFormData,
  } = useTripForm();

  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const segSectionY = useRef(0);
  const segmentYs = useRef<Record<number, number>>({});
  const errors = showErrors ? getTripFormErrors(tripData) : null;

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };
  const [calendarOpen, setCalendarOpen] = useState(false);
  const prevSelectionModeRef = useRef(selectionMode);

  useEffect(() => {
    if (
      calendarOpen &&
      prevSelectionModeRef.current === "end" &&
      selectionMode === "start"
    ) {
      setCalendarOpen(false);
    }
    prevSelectionModeRef.current = selectionMode;
  }, [selectionMode, calendarOpen]);

  useEffect(() => {
    if (!visible) setCalendarOpen(false);
    setShowErrors(false);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (planToEdit) {
        setFormData({
          name: planToEdit.title || "",
          segments: planToEdit.segments?.length
            ? planToEdit.segments.map(s => ({
                country: s.country,
                city: s.city,
                startDate: s.startDate,
                endDate: s.endDate,
              }))
            : [
                {
                  country: "",
                  city: "",
                  startDate: planToEdit.startDate || "",
                  endDate: planToEdit.endDate || "",
                },
              ],
        });
      } else {
        resetForm();
      }
    }
  }, [visible, planToEdit]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const formErrors = getTripFormErrors(tripData);
    if (formErrors) {
      setShowErrors(true);
      const firstSegment = formErrors.segments.findIndex(
        seg => seg.country || seg.city || seg.date,
      );
      scrollRef.current?.scrollTo({
        y: formErrors.name
          ? 0
          : segSectionY.current + (segmentYs.current[firstSegment] ?? 0),
        animated: true,
      });
      showToast("입력되지 않은 값이 있어요.", { icon: "warning" });
      return;
    }
    const trimmedName = tripData.name.trim();

    setIsSubmitting(true);
    try {
      const segments = tripData.segments.map(s => ({
        country: s.country,
        city: s.city,
        startDate: s.startDate,
        endDate: s.endDate,
      }));

      if (planToEdit && updatePlan) {
        const updated = await updatePlan(planToEdit.id, { title: trimmedName, segments });
        onPlanCreated(updated);
      } else {
        const newPlan = await addPlan({ title: trimmedName, segments });
        onPlanCreated(newPlan);
      }
    } catch {
      Alert.alert("알림", planToEdit ? "여행 수정에 실패했습니다" : "여행 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={handleClose} height={0.94}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {planToEdit ? "여행 수정" : "새 여행 추가"}
              </Text>
              {!planToEdit && (
                <Text style={styles.headerSubtitle}>
                  구간별로 나라·도시·기간을 추가해보세요.
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="닫기"
            >
              <CloseIcon width={24} height={24} color={colors.gray700} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>여행명</Text>
                <Text style={styles.counter}>{tripData.name.length}/30</Text>
              </View>
              <Input
                style={[styles.nameInput, errors?.name && styles.fieldError]}
                placeholder="ex.도쿄 가을 여행"
                placeholderTextColor={colors.gray600}
                value={tripData.name}
                onChangeText={name => updateTripData({ name })}
                maxLength={30}
              />
              {errors?.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View
              style={styles.segSection}
              onLayout={e => {
                segSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.segLabelRow}>
                <Text style={styles.segSectionLabel}>여행 구간</Text>
                <Text style={styles.hint}>순서대로 추가하세요</Text>
              </View>
              <TripSegmentList
                segments={tripData.segments}
                onSegmentUpdate={updateSegment}
                onSegmentAdd={addSegment}
                onSegmentRemove={removeSegment}
                onSegmentMove={moveSegment}
                onSegmentFocus={setActiveSegmentIndex}
                onDateButtonPress={idx => {
                  setActiveSegmentIndex(idx);
                  setCalendarOpen(true);
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
            />
          </View>
          <TripCalendarModal
            visible={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            selectionMode={selectionMode}
            markedDates={getMarkedDates()}
            onDateSelect={handleDateSelect}
          />
        </View>
      </BottomSheetModal>
    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.paletteInk,
  },
  headerSubtitle: {
    ...textStyles.body4,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  segSection: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  segLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...textStyles.h7,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.paletteInk,
  },
  segSectionLabel: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  counter: {
    ...textStyles.body5,
    marginLeft: "auto",
    fontFamily: typography.fontFamily.pretendardMedium,
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg3,
  },
  hint: {
    ...textStyles.body5,
    marginLeft: "auto",
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  errorText: {
    ...textStyles.body6,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  nameInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.paletteLine,
    borderRadius: radii.mdPlus,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    fontFamily: typography.fontFamily.pretendardMedium,
    fontSize: textStyles.body2.fontSize,
    color: colors.paletteInk,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
});
