import type { CalendarMarkedDates, SegmentDraft } from "@/hooks/useTripForm";
import TripCalendarModal from "../trip/TripCalendarModal";
import TripSegmentList from "../trip/TripSegmentList";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import XIcon from "../../../assets/mobile_close.svg";

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
  onSubmit: () => void;
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

  const [calendarOpenIndex, setCalendarOpenIndex] = useState<number | null>(null);
  const prevSelectionModeRef = useRef(selectionMode);

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

  const { totalStart, totalEnd } = useMemo(() => {
    const starts = tripData.segments
      .map(s => s.startDate)
      .filter(Boolean)
      .sort();
    const ends = tripData.segments
      .map(s => s.endDate)
      .filter(Boolean)
      .sort();
    return {
      totalStart: starts[0] ?? null,
      totalEnd: ends[ends.length - 1] ?? null,
    };
  }, [tripData.segments]);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                  구간별로 나라·도시·기간을 추가해보세요
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <XIcon width={16} height={16} color={colors.gray600} />
              </Pressable>
            </View>

            <View style={styles.scrollWrapper}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.section}>
                  <View style={styles.sectionLabelRow}>
                    <Text style={styles.sectionLabel}>여행명</Text>
                    <Text style={styles.counter}>{tripData.name.length}/30</Text>
                  </View>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="예: 동유럽 여행"
                    placeholderTextColor={colors.gray500}
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

                <View style={styles.durationBanner}>
                  <View style={styles.summaryLeft}>
                    <Text style={styles.summaryLabel}>전체 여행 기간</Text>
                    {totalStart && totalEnd ? (
                      <View style={styles.summaryVal}>
                        <Text style={styles.summaryNum}>
                          {dayjs(totalStart).format("YYYY.MM.DD")}
                        </Text>
                        <Text style={styles.summaryDash}>—</Text>
                        <Text style={styles.summaryNum}>
                          {dayjs(totalEnd).format("YYYY.MM.DD")}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.summaryEmpty}>
                        구간 기간을 입력하면 자동으로 계산됩니다
                      </Text>
                    )}
                  </View>
                  {totalStart &&
                    totalEnd &&
                    (() => {
                      const validSegs = tripData.segments.filter(
                        s => s.startDate && s.endDate,
                      );
                      const totalNights = validSegs.reduce(
                        (acc, s) =>
                          acc + dayjs(s.endDate).diff(dayjs(s.startDate), "day"),
                        0,
                      );
                      const totalDays = totalNights + validSegs.length;
                      return (
                        <View style={styles.summaryBadge}>
                          <Text style={styles.summaryBadgeText}>
                            {totalNights}박 {totalDays}일
                          </Text>
                        </View>
                      );
                    })()}
                </View>
              </ScrollView>
            </View>

            <View style={styles.footer}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  isSubmitDisabled && styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={isSubmitDisabled}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    isSubmitDisabled && styles.submitButtonTextDisabled,
                  ]}
                >
                  {submitButtonText}
                </Text>
              </Pressable>
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
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 4,
  },
  subtitle: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    ...textStyles.h7,
    color: colors.black,
  },
  sectionHint: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  counter: {
    fontFamily: typography.fontFamily.poppinsMedium,
    fontSize: 11,
    color: colors.gray600,
  },
  nameInput: {
    width: "100%",
    height: 42,
    paddingHorizontal: 12,
    paddingVertical: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    ...textStyles.body4,
    color: colors.gray900,
    outlineStyle: "none",
  } as any,
  durationBanner: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    ...textStyles.body6,
    color: "rgba(255,255,255,0.5)",
  },
  summaryVal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  summaryNum: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "700" as const,
    fontSize: 15,
    lineHeight: 22,
    color: colors.white,
  },
  summaryDash: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.5)",
  },
  summaryEmpty: {
    ...textStyles.body5,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  summaryBadgeText: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "700" as const,
    fontSize: 12,
    lineHeight: 16,
    color: colors.white,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    ...textStyles.h7,
    color: colors.black,
  },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  submitButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.gray600,
  },
});
