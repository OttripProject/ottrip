import { useTripForm } from "@/hooks/useTripForm";
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "@/types/api";
import TripCalendarModal from "@/components/trip/TripCalendarModal";
import TripDurationBanner from "@/components/trip/TripDurationBanner";
import TripSegmentList from "@/components/trip/TripSegmentList";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
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
    isSubmitDisabled,
  } = useTripForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const trimmedName = tripData.name.trim();
    if (!trimmedName) {
      Alert.alert("알림", "여행 이름을 입력해주세요");
      return;
    }

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
      <BottomSheetModal visible={visible} onClose={onClose} height={0.94}>
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
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="닫기"
            >
              <CloseIcon width={24} height={24} color={colors.gray600} />
            </Pressable>
          </View>

          <ScrollView
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
                style={styles.nameInput}
                placeholder="ex.도쿄 가을 여행"
                placeholderTextColor={colors.gray600}
                value={tripData.name}
                onChangeText={name => updateTripData({ name })}
                maxLength={30}
              />
            </View>

            <View style={styles.segSection}>
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
              />
            </View>

            <TripDurationBanner segments={tripData.segments} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitBtn,
                isSubmitDisabled || isSubmitting
                  ? styles.submitBtnDisabled
                  : styles.submitBtnEnabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled || isSubmitting}
            >
              <Text
                style={[
                  styles.submitText,
                  (isSubmitDisabled || isSubmitting) && styles.submitTextDisabled,
                ]}
              >
                {planToEdit ? "수정" : "여행 저장"}
              </Text>
            </Pressable>
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
  cancelBtn: {
    width: "38%",
    height: 56,
    borderRadius: radii.lgPlus,
    borderWidth: 1,
    borderColor: colors.paletteLine,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.xs,
  },
  cancelText: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  submitBtn: {
    flex: 1,
    height: 56,
    borderRadius: radii.lgPlus,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnEnabled: {
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
  },
  submitBtnDisabled: {
    backgroundColor: colors.paletteFill2,
  },
  submitText: {
    ...textStyles.h5,
    color: colors.white,
  },
  submitTextDisabled: {
    color: colors.gray500,
  },
});
