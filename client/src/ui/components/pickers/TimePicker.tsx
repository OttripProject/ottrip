import { PLACEHOLDERS } from "@/constants/placeholders";
import useDetectClose from "@/hooks/useDetectClose";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import DownArrowIcon from "../../../../assets/dropdown_time.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

const MINUTES_5_STEP = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0–24
const ITEM_HEIGHT = 36;

interface TimePickerProps {
  value: string; // 'HH:mm' 형식
  onChange: (time: string) => void;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  textStyle?: TextStyle;
  dropDownContainerStyle?: ViewStyle;
  listItemLabelStyle?: ViewStyle | TextStyle;
  selectedItemContainerStyle?: ViewStyle;
  placeholder?: string;
  minTime?: string;
  maxTime?: string;
  onOpen?: () => void;
  onClose?: () => void;
  disabled?: boolean;
  popupAlign?: "left" | "right";
}

const pad = (n: number) => n.toString().padStart(2, "0");

function parseTime(t: string | undefined): { h: number; m: number } | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

export default function TimePicker({
  value,
  onChange,
  containerStyle,
  style,
  textStyle,
  placeholder = PLACEHOLDERS.picker.time,
  minTime,
  maxTime,
  onOpen,
  onClose,
  disabled = false,
  popupAlign = "left",
}: TimePickerProps) {
  const wrapperRef = useRef<View>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const [open, setIsOpen] = useDetectClose(wrapperRef, false);
  const [localText, setLocalText] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  const parsed = useMemo(() => parseTime(value), [value]);
  const selectedHour = parsed?.h ?? null;
  const selectedMinute = parsed?.m ?? null;

  useEffect(() => {
    if (!isFocused) setLocalText(value || "");
  }, [value, isFocused]);

  const isTimeValid = (h: number, m: number) => {
    const t = `${pad(h)}:${pad(m)}`;
    return (!minTime || t >= minTime) && (!maxTime || t <= maxTime);
  };

  const isHourEnabled = (h: number) => {
    const mins = h === 24 ? [0] : MINUTES_5_STEP;
    return mins.some(m => isTimeValid(h, m));
  };

  const isMinuteEnabled = (m: number) => {
    if (selectedHour === null) return true;
    return isTimeValid(selectedHour, m);
  };

  const minutesForHour = selectedHour === 24 ? [0] : MINUTES_5_STEP;

  const handleTextChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    const formatted = digits.length > 2
      ? `${digits.slice(0, 2)}:${digits.slice(2)}`
      : digits;
    setLocalText(formatted);

    if (digits.length === 4) {
      const h = Number.parseInt(digits.slice(0, 2), 10);
      const m = Number.parseInt(digits.slice(2, 4), 10);
      if (h <= 24 && m <= 59) {
        const t = `${pad(h)}:${pad(m)}`;
        if ((!minTime || t >= minTime) && (!maxTime || t <= maxTime)) {
          onChange(t);
        }
      }
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    setLocalText(value || "");
  };

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    setIsOpen(next);
    if (next) onOpen?.();
    else onClose?.();
  };

  const handleSelectHour = (h: number) => {
    if (!isHourEnabled(h)) return;
    const currentMinute = selectedMinute ?? 0;
    const mins = h === 24 ? [0] : MINUTES_5_STEP;
    const minute = mins.includes(currentMinute) && isTimeValid(h, currentMinute)
      ? currentMinute
      : (mins.find(m => isTimeValid(h, m)) ?? 0);
    onChange(`${pad(h)}:${pad(minute)}`);
    if (selectedMinute !== null) {
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleSelectMinute = (m: number) => {
    if (!isMinuteEnabled(m)) return;
    const hour = selectedHour ?? 0;
    onChange(`${pad(hour)}:${pad(m)}`);
    setIsOpen(false);
    onClose?.();
  };

  useEffect(() => {
    if (!open) return;
    const hIdx = selectedHour !== null ? selectedHour : 0;
    const mIdx = selectedMinute !== null ? MINUTES_5_STEP.indexOf(selectedMinute) : 0;
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: false });
      minuteScrollRef.current?.scrollTo({ y: Math.max(0, mIdx) * ITEM_HEIGHT, animated: false });
    }, 50);
  }, [open]);

  const styleObj = style as any;
  const triggerBg = styleObj?.backgroundColor ?? colors.gray200;
  const triggerBorder = styleObj?.borderColor
    ? { borderWidth: styleObj.borderWidth ?? 1, borderColor: styleObj.borderColor }
    : {};
  const triggerBorderRadius = styleObj?.borderRadius !== undefined
    ? { borderRadius: styleObj.borderRadius }
    : {};

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open ? 100 : 1 }]}
    >
      <View
        style={[
          styles.trigger,
          { backgroundColor: triggerBg },
          triggerBorder,
          triggerBorderRadius,
          disabled && styles.triggerDisabled,
        ]}
      >
        <TextInput
          style={[styles.triggerInput, textStyle]}
          value={localText}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.gray600}
          keyboardType="numeric"
          maxLength={5}
          editable={!disabled}
          selectTextOnFocus
        />
        <Pressable onPress={handleToggle} disabled={disabled} style={styles.arrowButton}>
          {open ? (
            <UpperArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
          ) : (
            <DownArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
          )}
        </Pressable>
      </View>

      {open && (
        <View style={[styles.popup, popupAlign === "right" ? { right: 0, left: undefined } : { left: 0 }]}>
          <View style={styles.header}>
            <View style={styles.headerCell}>
              <Text style={styles.headerLabel}>시</Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerLabel}>분</Text>
            </View>
          </View>

          <View style={styles.cols}>
            <ScrollView
              ref={hourScrollRef}
              style={styles.col}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.colInner}>
                {HOURS.map(h => {
                  const enabled = isHourEnabled(h);
                  const selected = h === selectedHour;
                  return (
                    <Pressable
                      key={h}
                      style={({ pressed }) => [
                        styles.item,
                        selected && styles.itemSelected,
                        !enabled && styles.itemDisabled,
                        pressed && enabled && !selected && styles.itemPressed,
                      ]}
                      onPress={() => handleSelectHour(h)}
                      disabled={!enabled}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          selected && styles.itemTextSelected,
                          !enabled && styles.itemTextDisabled,
                        ]}
                      >
                        {pad(h)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <ScrollView
              ref={minuteScrollRef}
              style={styles.col}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.colInner}>
                {minutesForHour.map(m => {
                  const enabled = isMinuteEnabled(m);
                  const selected = m === selectedMinute;
                  return (
                    <Pressable
                      key={m}
                      style={({ pressed }) => [
                        styles.item,
                        selected && styles.itemSelected,
                        !enabled && styles.itemDisabled,
                        pressed && enabled && !selected && styles.itemPressed,
                      ]}
                      onPress={() => handleSelectMinute(m)}
                      disabled={!enabled}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          selected && styles.itemTextSelected,
                          !enabled && styles.itemTextDisabled,
                        ]}
                      >
                        {pad(m)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    height: 40,
    paddingLeft: 12,
    paddingRight: 8,
  },
  triggerDisabled: {
    borderWidth: 1,
    borderColor: colors.gray400,
  },
  triggerInput: {
    ...textStyles.body4,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
    height: 20,
    padding: 0,
    outlineStyle: "none",
  } as any,
  arrowButton: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  popup: {
    position: "absolute",
    top: 46,
    width: 200,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    zIndex: 1000,
    overflow: "hidden",
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  headerLabel: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  cols: {
    flexDirection: "row",
    maxHeight: 220,
  },
  col: {
    flex: 1,
  },
  colInner: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    marginHorizontal: 2,
  },
  itemSelected: {
    backgroundColor: colors.gray900,
  },
  itemPressed: {
    backgroundColor: colors.gray200,
  },
  itemDisabled: {
    opacity: 0.3,
  },
  itemText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  itemTextSelected: {
    ...textStyles.body4,
    color: colors.white,
  },
  itemTextDisabled: {
    color: colors.gray500,
  },
});
