import type { SegmentDraft } from "@/hooks/useTripForm";
import { CityPicker, CountryPicker } from "@/ui/components/pickers";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import CalendarIcon from "../../../assets/calender.svg";
import XIcon from "../../../assets/mobile_close.svg";
import DownArrowIcon from "../../../assets/mobile_dropdown.svg";

const isNative = Platform.OS !== "web";

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
                    style={[styles.actionBtn, idx === 0 && styles.actionBtnDisabled]}
                    onPress={() => onSegmentMove(idx, idx - 1)}
                    disabled={idx === 0}
                  >
                    <DownArrowIcon
                      width={isNative ? 17 : 10}
                      height={isNative ? 17 : 10}
                      color={idx === 0 ? colors.gray400 : colors.gray600}
                      style={{ transform: [{ scaleY: -1 }] }}
                    />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      idx >= segments.length - 1 && styles.actionBtnDisabled,
                    ]}
                    onPress={() => onSegmentMove(idx, idx + 1)}
                    disabled={idx >= segments.length - 1}
                  >
                    <DownArrowIcon
                      width={isNative ? 17 : 10}
                      height={isNative ? 17 : 10}
                      color={idx >= segments.length - 1 ? colors.gray400 : colors.gray600}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, !canRemove && styles.actionBtnDisabled]}
                    onPress={() => onSegmentRemove(idx)}
                    disabled={!canRemove}
                  >
                    <XIcon
                      width={isNative ? 14 : 12}
                      height={isNative ? 14 : 12}
                      color={canRemove ? colors.gray600 : colors.gray400}
                    />
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
                    placeholder={segment.country.trim() ? "도시 선택" : "먼저 국가 선택"}
                    disabled={!segment.country.trim()}
                    style={isNative ? styles.pickerBtnNative : styles.pickerTrigger}
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
                  style={isNative ? styles.dateBtnNative : styles.dateBtnWeb}
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
                    color={colors.gray700}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.addBtn} onPress={onSegmentAdd}>
        <Text style={styles.addBtnText}>+ 구간 추가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  segList: {
    gap: isNative ? 12 : 10,
    marginBottom: isNative ? 12 : 8,
  },
  seg: {
    flexDirection: "row",
    gap: isNative ? 0 : 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: isNative ? colors.gray200 : colors.gray300,
    borderRadius: isNative ? 16 : 12,
    padding: 14,
  },
  // 웹 전용: 인덱스 컬럼
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
  },
  segHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    top: 0,
    right: 0,
    flexDirection: "row",
    gap: 2,
    zIndex: 1,
  },
  segActionsNative: {
    position: "relative",
    marginLeft: "auto",
  },
  actionBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.28,
  },
  // 나라/도시 레이아웃
  segRow: {
    flexDirection: "row",
    gap: 10,
  },
  segCell: {
    flex: 1,
    gap: 3,
  },
  fieldGroupNative: {
    gap: 0,
  },
  fieldNative: {},
  fieldLabel: {
    ...textStyles.body6,
    color: colors.gray600,
    fontWeight: "600",
    marginBottom: isNative ? 6 : 3,
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
    borderRadius: 8,
    paddingHorizontal: 10,
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
  },
  // 웹 날짜 버튼
  segCellDate: {
    gap: 3,
    marginTop: 8,
  },
  dateBtnWeb: {
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
  dateBtnText: {
    flex: 1,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray900,
  },
  // 구간 추가 버튼
  addBtn: {
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: isNative ? colors.gray400 : colors.gray400,
    borderRadius: isNative ? 14 : 10,
    paddingVertical: isNative ? 14 : 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  addBtnText: {
    ...textStyles.body4,
    color: isNative ? colors.black : colors.gray700,
    fontWeight: isNative ? ("700" as const) : ("400" as const),
  },
});
