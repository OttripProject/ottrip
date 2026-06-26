import type { CalendarMarkedDates, SegmentDraft } from "@/hooks/useTripForm";
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
import { Calendar, type DateData } from "react-native-calendars";
import CalendarIcon from "../../../assets/calender.svg";
import LeftArrowIcon from "../../../assets/cal_left_arrow.svg";
import RightArrowIcon from "../../../assets/cal_right_arrow.svg";
import DownArrowIcon from "../../../assets/mobile_dropdown.svg";
import DownChevronIcon from "../../../assets/dropdown_cal.svg";
import XIcon from "../../../assets/mobile_close.svg";

const CALENDAR_THEME = {
  selectedDayBackgroundColor: "#007AFF",
  selectedDayTextColor: "#ffffff",
  todayTextColor: "#007AFF",
  dayTextColor: "#2d4150",
  textDisabledColor: "#d9e1e8",
  monthTextColor: "#2d4150",
  indicatorColor: "#007AFF",
  textDayFontWeight: "400" as const,
  textMonthFontWeight: "600" as const,
  textDayHeaderFontWeight: "500" as const,
  textDayFontSize: 13,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 11,
  textSectionTitleColor: colors.gray600,
  "stylesheet.calendar.main": {
    week: {
      marginVertical: 2,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  },
};

type DayMark = { selection?: "single" | "start" | "end" | "range"; selected?: boolean };

function DayCell({
  date,
  state,
  marking,
  onPress,
}: {
  date?: DateData;
  state: string;
  marking?: DayMark;
  onPress?: (date: DateData) => void;
}) {
  if (!date) return <View style={styles.dayContainer} />;

  const selection = marking?.selection;
  const isDisabled = state === "disabled";
  const isStart = selection === "start";
  const isEnd = selection === "end";
  const isRange = selection === "range";
  const isSingle = selection === "single";
  const isToday = dayjs().isSame(dayjs(date.dateString), "day");

  const rangeStyle: Record<string, unknown> = {
    opacity: isStart || isEnd || isRange ? 1 : 0,
  };
  if (isStart) { rangeStyle.left = 16; rangeStyle.right = -4; }
  else if (isEnd) { rangeStyle.left = -4; rangeStyle.right = 16; }
  else if (isRange) { rangeStyle.left = -4; rangeStyle.right = -4; }

  const circleStyle: Record<string, unknown> = {};
  if (isSingle || isStart || isEnd) circleStyle.backgroundColor = colors.primary;
  else if (isToday && !selection) circleStyle.backgroundColor = "#E8F1FF";

  return (
    <Pressable style={styles.dayContainer} disabled={isDisabled} onPress={() => onPress?.(date)}>
      <View style={[styles.rangeBase, rangeStyle]} />
      <View style={[styles.circleBase, circleStyle]}>
        <Text
          style={[
            styles.dayText,
            isDisabled && styles.dayTextDisabled,
            (isSingle || isStart || isEnd) && styles.dayTextSelected,
            isToday && !selection && styles.dayTextToday,
          ]}
        >
          {date.day}
        </Text>
      </View>
    </Pressable>
  );
}

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
  const canRemoveSegment = tripData.segments.length > 1;

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
    const starts = tripData.segments.map(s => s.startDate).filter(Boolean).sort();
    const ends = tripData.segments.map(s => s.endDate).filter(Boolean).sort();
    return {
      totalStart: starts[0] ?? null,
      totalEnd: ends[ends.length - 1] ?? null,
    };
  }, [tripData.segments]);

  const formatDateRange = (segment: SegmentDraft) => {
    if (!segment.startDate) return null;
    const start = dayjs(segment.startDate).format("YYYY.MM.DD");
    if (!segment.endDate) return `${start} —`;
    return `${start} — ${dayjs(segment.endDate).format("YYYY.MM.DD")}`;
  };

  const calendarTitle = selectionMode === "start" ? "시작일 선택" : "종료일 선택";

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>구간별로 나라·도시·기간을 추가해보세요</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <XIcon width={16} height={16} color={colors.gray600} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 여행명 */}
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

              {/* 여행 구간 */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>여행 구간</Text>
                  <Text style={styles.sectionHint}>나라 · 도시 · 기간을 순서대로 추가하세요</Text>
                </View>

                <View style={styles.segs}>
                  {tripData.segments.map((segment, idx) => (
                    <View key={idx} style={styles.seg}>
                      {/* Index column */}
                      <View style={styles.segIdxCol}>
                        <View style={styles.segIdxBadge}>
                          <Text style={styles.segIdxNum}>{idx + 1}</Text>
                        </View>
                        {idx < tripData.segments.length - 1 && (
                          <View style={styles.segIdxLine} />
                        )}
                      </View>

                      {/* Body */}
                      <View style={styles.segBody}>
                        {/* Actions - absolutely positioned top right */}
                        <View style={styles.segActions}>
                          <Pressable
                            style={styles.segIconBtn}
                            onPress={() => onSegmentMove(idx, idx - 1)}
                            disabled={idx === 0}
                          >
                            <DownArrowIcon width={10} height={10} color={idx === 0 ? colors.gray400 : colors.gray600} style={{ transform: [{ scaleY: -1 }] }} />
                          </Pressable>
                          <Pressable
                            style={styles.segIconBtn}
                            onPress={() => onSegmentMove(idx, idx + 1)}
                            disabled={idx >= tripData.segments.length - 1}
                          >
                            <DownArrowIcon width={10} height={10} color={idx >= tripData.segments.length - 1 ? colors.gray400 : colors.gray600} />
                          </Pressable>
                          <Pressable
                            style={styles.segIconBtn}
                            onPress={() => onSegmentRemove(idx)}
                            disabled={!canRemoveSegment}
                          >
                            <XIcon width={12} height={12} color={canRemoveSegment ? colors.gray600 : colors.gray400} />
                          </Pressable>
                        </View>

                        {/* Country + City row */}
                        <View style={styles.segRow}>
                          <View style={styles.segCell}>
                            <Text style={styles.segCellLabel}>나라</Text>
                            <View style={styles.segDropdown}>
                              <TextInput
                                style={styles.segDropdownText}
                                placeholder="국가 선택"
                                placeholderTextColor={colors.gray500}
                                value={segment.country}
                                onChangeText={text => onSegmentUpdate(idx, { country: text })}
                                onFocus={() => onSegmentFocus(idx)}
                              />
                              <DownChevronIcon width={12} height={10} color={colors.gray700} />
                            </View>
                          </View>
                          <View style={styles.segCell}>
                            <Text style={styles.segCellLabel}>도시</Text>
                            <View style={[styles.segDropdown, !segment.country.trim() && styles.segDropdownDisabled]}>
                              <TextInput
                                style={[styles.segDropdownText, !segment.country.trim() && styles.segDropdownTextDisabled]}
                                placeholder={segment.country.trim() ? "도시 선택" : "먼저 국가 선택"}
                                placeholderTextColor={colors.gray500}
                                value={segment.city}
                                onChangeText={text => onSegmentUpdate(idx, { city: text })}
                                onFocus={() => onSegmentFocus(idx)}
                                editable={!!segment.country.trim()}
                              />
                              <DownChevronIcon width={12} height={10} color={!segment.country.trim() ? colors.gray600 : colors.gray700} />
                            </View>
                          </View>
                        </View>

                        {/* Date row */}
                        <View style={styles.segCellDate}>
                          <Text style={styles.segCellLabel}>기간</Text>
                          <Pressable
                            style={[styles.segDateBtn, !!segment.startDate && styles.segDateBtnActive]}
                            onPress={() => {
                              onSegmentFocus(idx);
                              setCalendarOpenIndex(idx);
                            }}
                          >
                            <Text style={[styles.segDateBtnText, !segment.startDate && styles.segDateBtnPlaceholder]}>
                              {formatDateRange(segment) ?? "시작일 — 종료일"}
                            </Text>
                            <CalendarIcon width={12} height={12} color={colors.gray700} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* + 구간 추가 */}
                <Pressable style={styles.addSegmentButton} onPress={onSegmentAdd}>
                  <Text style={styles.addSegmentText}>+ 구간 추가</Text>
                </Pressable>
              </View>

              {/* 전체 여행 기간 배너 */}
              <View style={styles.durationBanner}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>전체 여행 기간</Text>
                  {totalStart && totalEnd ? (
                    <View style={styles.summaryVal}>
                      <Text style={styles.summaryNum}>{dayjs(totalStart).format("YYYY.MM.DD")}</Text>
                      <Text style={styles.summaryDash}>—</Text>
                      <Text style={styles.summaryNum}>{dayjs(totalEnd).format("YYYY.MM.DD")}</Text>
                    </View>
                  ) : (
                    <Text style={styles.summaryEmpty}>구간 기간을 입력하면 자동으로 계산됩니다</Text>
                  )}
                </View>
                {totalStart && totalEnd && (() => {
                  const nights = dayjs(totalEnd).diff(dayjs(totalStart), "day");
                  const days = nights + 1;
                  return (
                    <View style={styles.summaryBadge}>
                      <Text style={styles.summaryBadgeText}>{nights}박 {days}일</Text>
                    </View>
                  );
                })()}
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={styles.footer}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={isSubmitDisabled}
              >
                <Text style={[styles.submitButtonText, isSubmitDisabled && styles.submitButtonTextDisabled]}>
                  {submitButtonText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar popup */}
      <Modal
        visible={calendarOpenIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpenIndex(null)}
      >
        <Pressable style={styles.calendarOverlay} onPress={() => setCalendarOpenIndex(null)}>
          <Pressable style={styles.calendarPopup} onPress={e => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{calendarTitle}</Text>
              <Pressable onPress={() => setCalendarOpenIndex(null)}>
                <XIcon width={18} height={18} color={colors.gray700} />
              </Pressable>
            </View>
            <Calendar
              monthFormat="yyyy년 M월"
              markedDates={markedDates}
              markingType="custom"
              theme={CALENDAR_THEME}
              firstDay={1}
              renderArrow={direction =>
                direction === "left" ? (
                  <LeftArrowIcon width={18} height={18} />
                ) : (
                  <RightArrowIcon width={18} height={18} />
                )
              }
              dayComponent={({ date, state, marking, onPress }) => (
                <DayCell
                  date={date as DateData}
                  state={state ?? ""}
                  marking={marking as DayMark}
                  onPress={onPress}
                />
              )}
              onDayPress={day => onDateSelect(day.dateString)}
              style={styles.calendar}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  segs: {
    gap: 10,
    marginBottom: 8,
  },
  seg: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 12,
  },
  segIdxCol: {
    width: 22,
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 2,
  },
  segIdxBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segIdxNum: {
    color: colors.white,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 11,
    lineHeight: 22,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  segIdxLine: {
    flex: 1,
    width: 1.5,
    minHeight: 12,
    marginTop: 4,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.gray400,
    borderStyle: "dashed" as const,
  },
  segBody: {
    flex: 1,
    position: "relative",
  },
  segActions: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    gap: 2,
    zIndex: 1,
  },
  segIconBtn: {
    padding: 3,
  },
  segRow: {
    flexDirection: "row",
    gap: 10,
  },
  segCell: {
    flex: 1,
    gap: 3,
  },
  segCellLabel: {
    ...textStyles.body6,
    color: colors.gray600,
    letterSpacing: 0.2,
  },
  segDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: colors.white,
  },
  segDropdownText: {
    flex: 1,
    ...textStyles.body4,
    color: colors.gray900,
    outlineStyle: "none",
  } as any,
  segDropdownDisabled: {
    backgroundColor: colors.gray200,
    borderColor: colors.gray300,
  },
  segDropdownTextDisabled: {
    color: colors.gray600,
  },
  segCellDate: {
    gap: 3,
    marginTop: 8,
  },
  segDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: colors.white,
  },
  segDateBtnActive: {
    borderColor: colors.gray300,
  },
  segDateBtnText: {
    flex: 1,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray900,
  },
  segDateBtnPlaceholder: {
    color: colors.gray500,
  },
  addSegmentButton: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  addSegmentText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
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
  // Calendar popup
  calendarOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  calendarPopup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 420,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  calendar: {
    alignSelf: "center",
    width: 276,
    backgroundColor: "transparent",
  },
  // DayCell styles
  dayContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
    marginVertical: 2,
  },
  rangeBase: {
    position: "absolute",
    left: -12,
    right: -12,
    top: "50%",
    height: 32,
    marginTop: -16,
    backgroundColor: "#E8F1FF",
    zIndex: 1,
  },
  circleBase: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  dayText: {
    ...textStyles.body3,
    color: colors.black,
  },
  dayTextDisabled: {
    color: colors.gray300,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: "600",
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: "600",
  },
});
