import { useTripForm } from "@/hooks/useTripForm";
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "@/types/api";
import TripCalendarModal from "@/components/trip/TripCalendarModal";
import TripDurationBanner from "@/components/trip/TripDurationBanner";
import TripSegmentList from "@/components/trip/TripSegmentList";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
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
      <BottomSheetModal visible={visible} onClose={onClose} height={0.93}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {planToEdit ? "여행 수정" : "새로운 여행 만들기"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <CloseIcon width={20} height={20} color={colors.gray700} />
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
                placeholderTextColor={colors.gray500}
                value={tripData.name}
                onChangeText={name => updateTripData({ name })}
                maxLength={30}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.labelRow}>
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
                (isSubmitDisabled || isSubmitting) && styles.submitBtnDisabled,
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  sectionLabel: {
    ...textStyles.h8,
    color: colors.black,
  },
  segSectionLabel: {
    ...textStyles.h6,
    color: colors.black,
  },
  counter: {
    marginLeft: "auto",
    fontFamily: typography.fontFamily.poppinsMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray500,
  },
  hint: {
    marginLeft: "auto",
    ...textStyles.body6,
    color: colors.gray500,
  },
  nameInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    color: colors.gray900,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  cancelText: {
    ...textStyles.h7,
    color: colors.black,
  },
  submitBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray900,
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  submitText: {
    ...textStyles.h7,
    color: colors.white,
  },
  submitTextDisabled: {
    color: colors.gray600,
  },
});
