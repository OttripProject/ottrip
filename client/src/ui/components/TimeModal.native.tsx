import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import CloseIcon from "../../../assets/mobile_close.svg";
import DownArrowIcon from "../../../assets/mobile_time_down.svg";
import UpperArrowIcon from "../../../assets/mobile_time_up.svg";

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES_STEP = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;

const ARROW_SIZE = 24;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parse24hToWheel(value: string): {
  hour12: number;
  minute: (typeof MINUTES_STEP)[number];
  isAm: boolean;
} {
  const [hStr, mStr] = value.split(":");
  const h24 = Math.min(23, Math.max(0, Number(hStr) || 0));
  const m = Math.min(59, Math.max(0, Number(mStr) || 0));
  const snapped = MINUTES_STEP.reduce((prev, cur) =>
    Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev,
  );
  const isAm = h24 < 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: snapped as (typeof MINUTES_STEP)[number], isAm };
}

function wheelTo24h(hour12: number, minute: number, isAm: boolean): string {
  let h24: number;
  if (isAm) {
    h24 = hour12 === 12 ? 0 : hour12;
  } else {
    h24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return `${pad2(h24)}:${pad2(minute)}`;
}

export interface TimeModalProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onConfirm: (time24: string) => void;
}

export function TimeModal({
  visible,
  onClose,
  value,
  onConfirm,
}: TimeModalProps) {
  const initial = useMemo(() => parse24hToWheel(value), [value]);

  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [isAm, setIsAm] = useState(initial.isAm);

  useEffect(() => {
    if (visible) {
      const next = parse24hToWheel(value);
      setHour12(next.hour12);
      setMinute(next.minute);
      setIsAm(next.isAm);
    }
  }, [visible, value]);

  const bumpHour = useCallback((delta: number) => {
    setHour12(prev => {
      const idx = HOURS_12.indexOf(prev as (typeof HOURS_12)[number]);
      const nextIdx = (idx + delta + HOURS_12.length) % HOURS_12.length;
      return HOURS_12[nextIdx];
    });
  }, []);

  const bumpMinute = useCallback((delta: number) => {
    setMinute(prev => {
      const idx = MINUTES_STEP.indexOf(prev as (typeof MINUTES_STEP)[number]);
      const nextIdx = (idx + delta + MINUTES_STEP.length) % MINUTES_STEP.length;
      return MINUTES_STEP[nextIdx];
    });
  }, []);

  const bumpAmPm = useCallback((delta: number) => {
    setIsAm(prev => {
      const idx = prev ? 0 : 1;
      const next = (idx + delta + 2) % 2;
      return next === 0;
    });
  }, []);

  const handleSave = useCallback(() => {
    onConfirm(wheelTo24h(hour12, minute, isAm));
    onClose();
  }, [hour12, minute, isAm, onConfirm, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.sheetTouchBlocker}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={[styles.title]}>시간 설정</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <CloseIcon width={24} height={24} color={colors.gray500} />
              </Pressable>
            </View>

            <View style={styles.pickerWrap}>
              <View style={styles.pickerRow}>
                <View style={styles.timeBlock}>
                  {/* 시 */}
                  <View style={styles.column}>
                    <Pressable
                      style={styles.arrowBtn}
                      onPress={() => bumpHour(1)}
                    >
                      <UpperArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                    </Pressable>
                    <Text style={styles.valueText}>{hour12}</Text>
                    <Pressable
                      style={styles.arrowBtn}
                      onPress={() => bumpHour(-1)}
                    >
                      <DownArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                    </Pressable>
                  </View>

                  <View style={styles.colonSlot}>
                    <Text style={styles.colon}>:</Text>
                  </View>

                  {/* 분 */}
                  <View style={styles.column}>
                    <Pressable
                      style={styles.arrowBtn}
                      onPress={() => bumpMinute(1)}
                    >
                      <UpperArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                    </Pressable>
                    <Text style={styles.valueText}>{pad2(minute)}</Text>
                    <Pressable
                      style={styles.arrowBtn}
                      onPress={() => bumpMinute(-1)}
                    >
                      <DownArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                    </Pressable>
                  </View>
                </View>

                {/* 오전/오후 */}
                <View style={[styles.column, styles.ampmColumn]}>
                  <Pressable
                    style={styles.arrowBtn}
                    onPress={() => bumpAmPm(1)}
                  >
                    <UpperArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                  </Pressable>
                  <Text style={styles.valueText}>{isAm ? "AM" : "PM"}</Text>
                  <Pressable
                    style={styles.arrowBtn}
                    onPress={() => bumpAmPm(-1)}
                  >
                    <DownArrowIcon width={ARROW_SIZE} height={ARROW_SIZE} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveLabel}>저장</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheetTouchBlocker: {
    width: "100%",
    maxWidth: 315,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    ...textStyles.h3,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerWrap: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 254,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 45,
  },
  timeBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  column: {
    alignItems: "center",
    gap: 10,
    minWidth: 24,
  },
  ampmColumn: {
    minWidth: 52,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    ...textStyles.body1,
    color: colors.gray800,
    textAlign: "center",
  },
  colonSlot: {
    width: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  colon: {
    ...textStyles.body1,
    color: colors.gray800,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    width: "100%",
    alignItems: "flex-end",
  },
  saveBtn: {
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    ...textStyles.h6,
    color: colors.white,
  },
});
