import type { SegmentDraft } from "@/hooks/useTripForm";
import { CityPicker, CountryPicker } from "@/ui/components/pickers";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useState } from "react";
import {
  Platform,
  Pressable,
  type PressableStateCallbackType,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import CalendarIcon from "../../../assets/calender.svg";
import XIcon from "../../../assets/mobile_close.svg";
import DownArrowIcon from "../../../assets/mobile_dropdown.svg";
import UpArrowIcon from "../../../assets/upper_arrow.svg";

const isNative = Platform.OS !== "web";

type HoverState = PressableStateCallbackType & { hovered?: boolean };

function actionColor(disabled: boolean, hovered?: boolean, del?: boolean) {
  if (disabled) return colors.gray400;
  if (hovered) return del ? colors.danger : colors.gray900;
  return colors.gray600;
}


function formatDateRange(segment: SegmentDraft) {
  if (!segment.startDate) return null;
  const start = dayjs(segment.startDate).format("YYYY.MM.DD");
  if (!segment.endDate) return `${start} —`;
  return `${start} — ${dayjs(segment.endDate).format("YYYY.MM.DD")}`;
}

interface TripSegmentListProps {
  segments: SegmentDraft[];
  onSegmentUpdate: (index: number, data: Partial<SegmentDraft>) => void;
  onSegmentAdd: () => void;
  onSegmentRemove: (index: number) => void;
  onSegmentMove: (fromIndex: number, toIndex: number) => void;
  onSegmentFocus: (index: number) => void;
  onDateButtonPress: (index: number) => void;
}

export default function TripSegmentList({
  segments,
  onSegmentUpdate,
  onSegmentAdd,
  onSegmentRemove,
  onSegmentMove,
  onSegmentFocus,
  onDateButtonPress,
}: TripSegmentListProps) {
  const canRemove = segments.length > 1;
  const [cityTriggers, setCityTriggers] = useState<Record<number, number>>({});
  const [countryTriggers, setCountryTriggers] = useState<Record<number, number>>({});

  return (
    <View style={styles.container}>
      <View style={styles.segList}>
        {segments.map((segment, idx) => (
          <View
            key={idx}
            style={[
              styles.seg,
              !isNative && { zIndex: (segments.length - idx) * 100 },
            ]}
          >
            {/* 인덱스 컬럼 (웹 전용) */}
            {!isNative && (
              <View style={styles.segIdxCol}>
                <View style={styles.segIdxBadge}>
                  <Text style={styles.segIdxNum}>{idx + 1}</Text>
                </View>
                {idx < segments.length - 1 && (
                  <View style={styles.segIdxLine} />
                )}
              </View>
            )}

            {/* 구간 바디 */}
            <View style={styles.segBody}>
              {/* 헤더 (앱: 배지+레이블 보임 / 웹: 액션만) */}
              <View style={styles.segHeader}>
                {isNative && (
                  <>
                    <View style={styles.segBadge}>
                      <Text style={styles.segBadgeText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.segHeaderLabel}>구간 {idx + 1}</Text>
                  </>
                )}
                <View style={[styles.segActions, isNative && styles.segActionsNative]}>
                  <Pressable
                    style={({ hovered }: HoverState) => [
                      styles.actionBtn,
                      idx === 0 && styles.actionBtnDisabled,
                      hovered && idx !== 0 && styles.actionBtnHover,
                    ]}
                    onPress={() => onSegmentMove(idx, idx - 1)}
                    disabled={idx === 0}
                    accessibilityLabel="위로"
                  >
                    {({ hovered }: HoverState) =>
                      isNative ? (
                        <DownArrowIcon
                          width={17}
                          height={17}
                          color={idx === 0 ? colors.gray400 : colors.gray600}
                          style={{ transform: [{ scaleY: -1 }] }}
                        />
                      ) : (
                        <UpArrowIcon
                          width={10}
                          height={10}
                          color={actionColor(idx === 0, hovered)}
                        />
                      )
                    }
                  </Pressable>
                  <Pressable
                    style={({ hovered }: HoverState) => [
                      styles.actionBtn,
                      idx >= segments.length - 1 && styles.actionBtnDisabled,
                      hovered &&
                        idx < segments.length - 1 &&
                        styles.actionBtnHover,
                    ]}
                    onPress={() => onSegmentMove(idx, idx + 1)}
                    disabled={idx >= segments.length - 1}
                    accessibilityLabel="아래로"
                  >
                    {({ hovered }: HoverState) => (
                      <DownArrowIcon
                        width={isNative ? 17 : 10}
                        height={isNative ? 17 : 10}
                        color={actionColor(idx >= segments.length - 1, hovered)}
                      />
                    )}
                  </Pressable>
                  <Pressable
                    style={({ hovered }: HoverState) => [
                      styles.actionBtn,
                      !canRemove && styles.actionBtnDisabled,
                      hovered && canRemove && styles.actionBtnDeleteHover,
                    ]}
                    onPress={() => onSegmentRemove(idx)}
                    disabled={!canRemove}
                    accessibilityLabel="구간 삭제"
                  >
                    {({ hovered }: HoverState) => (
                      <XIcon
                        width={isNative ? 14 : 12}
                        height={isNative ? 14 : 12}
                        color={actionColor(!canRemove, hovered, true)}
                      />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* 나라 + 도시 */}
              <View style={isNative ? styles.fieldGroupNative : styles.segRow}>
                <View style={isNative ? styles.fieldNative : styles.segCell}>
                  <Text style={styles.fieldLabel}>나라</Text>
                  <CountryPicker
                    value={segment.country}
                    onChange={country => {
                      onSegmentFocus(idx);
                      onSegmentUpdate(idx, { country, city: "" });
                      if (isNative) {
                        setCityTriggers(prev => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
                      }
                    }}
                    placeholder="국가 선택"
                    style={isNative ? styles.pickerBtnNative : styles.pickerTrigger}
                    containerStyle={styles.pickerWrapper}
                    onOpen={() => onSegmentFocus(idx)}
                    useModal={!isNative}
                    fullScreenModal={isNative}
                    openTrigger={countryTriggers[idx] ?? 0}
                  />
                </View>
                <View style={isNative ? styles.fieldNative : styles.segCell}>
                  <Text style={[styles.fieldLabel, isNative && styles.fieldLabelTop]}>도시</Text>
                  <CityPicker
                    value={segment.city}
                    onChange={city => onSegmentUpdate(idx, { city })}
                    countryKo={segment.country}
                    placeholder={
                      segment.country.trim()
                        ? "도시 선택"
                        : isNative
                          ? "먼저 국가 선택"
                          : "먼저 나라를 선택하세요"
                    }
                    disabled={!segment.country.trim()}
                    style={
                      isNative
                        ? styles.pickerBtnNative
                        : segment.country.trim()
                          ? styles.pickerTrigger
                          : pickerTriggerDisabled
                    }
                    containerStyle={styles.pickerWrapper}
                    onOpen={() => onSegmentFocus(idx)}
                    useModal={!isNative}
                    fullScreenModal={isNative}
                    openTrigger={cityTriggers[idx] ?? 0}
                    onBack={() => setCountryTriggers(prev => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }))}
                  />
                </View>
              </View>

              {/* 기간 */}
              <View style={isNative ? styles.fieldNative : styles.segCellDate}>
                <Text style={[styles.fieldLabel, isNative && styles.fieldLabelTop]}>기간</Text>
                <Pressable
                  style={({ hovered }: HoverState) => [
                    isNative ? styles.dateBtnNative : styles.dateBtnWeb,
                    !isNative && hovered && styles.dateBtnWebHover,
                  ]}
                  onPress={() => {
                    onSegmentFocus(idx);
                    onDateButtonPress(idx);
                  }}
                >
                  <Text
                    style={[
                      isNative ? styles.pickerText : styles.dateBtnText,
                      !segment.startDate && styles.pickerPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {formatDateRange(segment) ?? "시작일 — 종료일"}
                  </Text>
                  <CalendarIcon
                    width={isNative ? 16 : 12}
                    height={isNative ? 16 : 12}
                    color={isNative ? colors.gray700 : colors.gray900}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={({ hovered }: HoverState) => [
          styles.addBtn,
          !isNative && hovered && styles.addBtnHover,
        ]}
        onPress={onSegmentAdd}
      >
        {({ hovered }: HoverState) =>
          isNative ? (
            <Text style={styles.addBtnText}>+ 구간 추가</Text>
          ) : (
            <>
              <Text
                style={[styles.addBtnPlus, hovered && styles.addBtnTextHover]}
              >
                +
              </Text>
              <Text
                style={[styles.addBtnText, hovered && styles.addBtnTextHover]}
              >
                구간 추가
              </Text>
            </>
          )
        }
      </Pressable>
    </View>
  );
}

const dateBtnTransition = {
  transitionProperty: "border-color, background-color",
  transitionDuration: "120ms",
} as ViewStyle;

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  segList: {
    gap: spacing.md,
    marginBottom: isNative ? spacing.md : spacing.sm,
  },
  seg: {
    flexDirection: "row",
    gap: isNative ? 0 : spacing.md,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: isNative ? colors.gray200 : colors.gray300,
    borderRadius: isNative ? 16 : radii.mdPlus,
    padding: isNative ? 14 : spacing.lg,
    paddingLeft: isNative ? 14 : spacing.md,
  },
  // 웹 전용: 인덱스 컬럼
  segIdxCol: {
    width: 24,
    flexDirection: "column",
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  segIdxBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segIdxNum: {
    ...textStyles.h9,
    color: colors.white,
    fontVariant: ["tabular-nums"],
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
  },
  segHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isNative ? 12 : 0,
    zIndex: isNative ? 0 : 2,
  },
  // 앱 전용: 뱃지
  segBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  segBadgeText: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.white,
    fontWeight: "700" as const,
  },
  segHeaderLabel: {
    marginLeft: 10,
    ...textStyles.h9,
    color: colors.gray600,
  },
  segActions: {
    position: "absolute",
    top: isNative ? 0 : -spacing.sm,
    right: isNative ? 0 : -spacing.sm,
    flexDirection: "row",
    gap: isNative ? 2 : 0,
    zIndex: 2,
  },
  segActionsNative: {
    position: "relative",
    marginLeft: "auto",
  },
  actionBtn: {
    width: isNative ? 28 : 24,
    height: isNative ? 28 : 24,
    borderRadius: radii.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: isNative ? 0.28 : 1,
  },
  actionBtnHover: {
    backgroundColor: colors.iconHoverBg,
  },
  actionBtnDeleteHover: {
    backgroundColor: colors.dangerTint,
  },
  // 나라/도시 레이아웃
  segRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  segCell: {
    flex: 1,
    minWidth: 0,
    gap: isNative ? 3 : spacing.xs,
  },
  fieldGroupNative: {
    gap: 0,
  },
  fieldNative: {},
  fieldLabel: {
    ...(isNative ? textStyles.body6 : textStyles.h9),
    color: isNative ? colors.gray600 : colors.gray700,
    fontWeight: "600",
    marginBottom: isNative ? 6 : 0,
  },
  fieldLabelTop: {
    marginTop: 12,
  },
  pickerWrapper: {
    width: "100%",
  },
  // 웹 피커 트리거 스타일
  pickerTrigger: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 36,
    backgroundColor: colors.white,
  },
  pickerBtnNative: {
    width: "100%",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  dateBtnNative: {
    width: "100%",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  pickerText: {
    flex: 1,
    ...textStyles.body3,
    color: colors.gray900,
  },
  pickerPlaceholder: {
    color: colors.gray600,
    fontFamily: typography.fontFamily.pretendardRegular,
  },
  // 웹 날짜 버튼
  segCellDate: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dateBtnWeb: {
    ...dateBtnTransition,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 36,
    backgroundColor: colors.white,
  },
  dateBtnWebHover: {
    backgroundColor: colors.inputHover,
  },
  dateBtnText: {
    flex: 1,
    ...textStyles.h7,
    fontVariant: ["tabular-nums"],
    color: colors.gray900,
  },
  // 구간 추가 버튼
  addBtn: {
    ...(isNative ? {} : dateBtnTransition),
    flexDirection: "row",
    gap: spacing.sm,
    height: isNative ? undefined : 40,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: colors.gray400,
    borderRadius: isNative ? 14 : radii.md,
    paddingVertical: isNative ? 14 : 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isNative ? colors.white : "transparent",
  },
  addBtnText: {
    ...(isNative ? textStyles.body4 : textStyles.h7),
    color: isNative ? colors.black : colors.gray700,
    fontWeight: isNative ? ("700" as const) : undefined,
  },
  addBtnPlus: {
    ...textStyles.body2,
    lineHeight: textStyles.body2.fontSize,
    color: colors.gray700,
  },
  addBtnHover: {
    borderColor: colors.gray900,
    backgroundColor: colors.gray100,
  },
  addBtnTextHover: {
    color: colors.gray900,
  },
});

const pickerTriggerDisabled = StyleSheet.flatten([
  styles.pickerTrigger,
  { backgroundColor: colors.gray100 },
]);
