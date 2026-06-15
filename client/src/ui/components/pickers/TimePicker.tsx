import { PLACEHOLDERS } from "@/constants/placeholders";
import useDetectClose from "@/hooks/useDetectClose";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import CheckBlackIcon from "../../../../assets/check_black.svg";
import DownArrowIcon from "../../../../assets/dropdown_time.svg";
import MobileTimeIcon from "../../../../assets/mobile_time.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

const MINUTES_5_STEP = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface TimePickerProps {
  value: string; // 'HH:mm' 형식
  onChange: (time: string) => void;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  dropDownContainerStyle?: ViewStyle;
  listItemLabelStyle?: ViewStyle | TextStyle;
  selectedItemContainerStyle?: ViewStyle;
  placeholder?: string;
  minTime?: string; // 'HH:mm' 형식, 이 시간 이후만 선택 가능
  maxTime?: string; // 'HH:mm' 형식, 이 시간 이전만 선택 가능
  onOpen?: () => void;
  onClose?: () => void;
  disabled?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  containerStyle,
  style,
  dropDownContainerStyle,
  listItemLabelStyle,
  selectedItemContainerStyle,
  placeholder = PLACEHOLDERS.picker.time,
  minTime,
  maxTime,
  onOpen,
  onClose,
  disabled = false,
}: TimePickerProps) {
  const pickerRef = useRef<View>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(
    pickerRef,
    false,
  );
  const [selectedValue, setSelectedValue] = useState<string | null>(
    value || null,
  );

  const timeOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    for (let hour = 0; hour <= 24; hour++) {
      const minutes = hour === 24 ? [0] : MINUTES_5_STEP;
      for (const minute of minutes) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        const isAfterMin = !minTime || timeString >= minTime;
        const isBeforeMax = !maxTime || timeString <= maxTime;

        if (isAfterMin && isBeforeMax) {
          options.push({
            label: timeString,
            value: timeString,
          });
        }
      }
    }
    return options;
  }, [minTime, maxTime]);

  const ITEM_HEIGHT = 32;

  const selectedIndex = useMemo(() => {
    if (!value) return -1;
    return timeOptions.findIndex(item => item.value === value);
  }, [value, timeOptions]);

  useEffect(() => {
    if (value) {
      setSelectedValue(value);
    } else {
      setSelectedValue(null);
    }
  }, [value]);

  useEffect(() => {
    if (selectedValue) {
      onChange(selectedValue);
    }
  }, [selectedValue]);

  const styleObj = style as any;
  const customBackgroundColor = styleObj?.backgroundColor;
  const customBorderColor = styleObj?.borderColor;
  const customBorderWidth = styleObj?.borderWidth;
  const customHeight = styleObj?.height;
  const customBorderRadius = styleObj?.borderRadius;

  const dropdownBgColor = customBackgroundColor || colors.gray200;
  const dropdownStyle: any = {
    width: "100%",
    backgroundColor: dropdownBgColor,
  };

  if (customBorderColor !== undefined) {
    dropdownStyle.borderColor = customBorderColor;
    dropdownStyle.borderWidth = customBorderWidth ?? 1;
  }

  if (customHeight !== undefined) {
    dropdownStyle.height = customHeight;
    dropdownStyle.minHeight = customHeight;
  }

  if (customBorderRadius !== undefined) {
    dropdownStyle.borderRadius = customBorderRadius;
  }

  return (
    <>
      {/* 외부 클릭 감지를 위한 투명 오버레이 */}
      {open && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}
          onPress={handleOutsidePress}
        />
      )}
      <View
        ref={pickerRef}
        style={[styles.wrapper, containerStyle, { zIndex: open ? 10000 : 1 }]}
      >
        <DropDownPicker
          open={open}
          value={selectedValue}
          items={timeOptions}
          setOpen={value => {
            const isOpen = typeof value === "function" ? value(open) : value;
            setIsOpen(isOpen);
            if (isOpen) {
              onOpen?.();
            } else {
              onClose?.();
            }
          }}
          setValue={(callback: any) => {
            const next = callback(selectedValue) as string | null;
            setSelectedValue(next);
          }}
          disabled={disabled}
          placeholder={placeholder}
          placeholderStyle={styles.placeholder}
          textStyle={styles.text}
          labelStyle={styles.text}
          listItemLabelStyle={[
            styles.listItemLabel,
            { backgroundColor: dropdownBgColor },
            listItemLabelStyle,
          ]}
          selectedItemLabelStyle={styles.selectedItem}
          selectedItemContainerStyle={[
            styles.selectedItemContainer,
            { backgroundColor: dropdownBgColor },
            selectedItemContainerStyle,
          ]}
          style={[
            styles.dropdown,
            dropdownStyle,
            disabled && { borderColor: colors.gray400, borderWidth: 1 },
            style,
          ]}
          dropDownContainerStyle={[
            styles.dropdownContainer,
            {
              width: "100%",
              backgroundColor: dropdownBgColor,
              zIndex: 11000,
              position: "absolute" as const,
              ...(customBorderColor && {
                borderColor: customBorderColor,
                borderWidth: customBorderWidth ?? 1,
                borderTopWidth: 0,
              }),
            },
            dropDownContainerStyle,
          ]}
          containerStyle={[styles.dropdownOuter, { width: "100%" }]}
          listMode="FLATLIST"
          dropDownDirection="BOTTOM"
          autoScroll={false}
          flatListProps={{
            initialScrollIndex: selectedIndex > 0 ? selectedIndex : 0,
            getItemLayout: (_data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            }),
            nestedScrollEnabled: true,
            keyboardShouldPersistTaps: "handled",
            showsVerticalScrollIndicator: false,
          }}
          ArrowDownIconComponent={() =>
            Platform.OS === "web" ? (
              <DownArrowIcon width={16} height={16} />
            ) : (
              <MobileTimeIcon width={16} height={16} />
            )
          }
          ArrowUpIconComponent={() => <UpperArrowIcon width={16} height={16} />}
          translation={{ NOTHING_TO_SHOW: "선택 가능한 시간이 없습니다" }}
          TickIconComponent={() => <CheckBlackIcon width={16} height={16} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  dropdown: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray200,
    height: 40,
    minHeight: 40,
    position: "relative",
    zIndex: 9999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  dropdownContainer: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray200,
    zIndex: 9999,
    elevation: 6,
  },
  dropdownOuter: {
    position: "relative",
    zIndex: 9999,
  },
  placeholder: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  text: {
    ...textStyles.body4,
    color: colors.black,
  },
  listItemLabel: {
    ...textStyles.body4,
    color: colors.gray500,
    backgroundColor: colors.gray200,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  selectedItem: {
    ...textStyles.body4,
    color: colors.black,
  },
  selectedItemContainer: {
    backgroundColor: colors.gray200,
  },
});
