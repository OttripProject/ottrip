import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import useDetectClose from '@/hooks/useDetectClose';
import DropDownPicker from 'react-native-dropdown-picker';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import { spacing } from '@/ui/tokens/spacing';
import DownArrowIcon from '../../../../assets/dropdown_time.svg';
import UpperArrowIcon from '../../../../assets/upper_arrow.svg';
import CheckBlackIcon from '../../../../assets/check_black.svg';
import { PLACEHOLDERS } from '@/constants/placeholders';

interface TimePickerProps {
  value: string; // 'HH:mm' 형식
  onChange: (time: string) => void;
  style?: ViewStyle;
  placeholder?: string;
  minTime?: string; // 'HH:mm' 형식, 이 시간 이후만 선택 가능
  maxTime?: string; // 'HH:mm' 형식, 이 시간 이전만 선택 가능
  onOpen?: () => void;
  onClose?: () => void;
}

export default function TimePicker({ 
  value, 
  onChange, 
  style, 
  placeholder = PLACEHOLDERS.picker.time, 
  minTime,
  maxTime,
  onOpen,
  onClose
}: TimePickerProps) {
  const pickerRef = useRef<View>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(pickerRef, false);
  const [selectedValue, setSelectedValue] = useState<string | null>(value || null);

  // 15분 단위로 시간 옵션 생성 (00:00 ~ 23:45)
  const timeOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // minTime과 maxTime 필터링
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

  // value가 변경될 때 selectedValue 업데이트
  useEffect(() => {
    if (value) {
      setSelectedValue(value);
    } else {
      setSelectedValue(null);
    }
  }, [value]);

  // 선택된 값이 변경될 때 onChange 호출
  useEffect(() => {
    if (selectedValue) {
      onChange(selectedValue);
    }
  }, [selectedValue]);

  // style prop에서 커스텀 스타일 추출 (항공 구간용)
  const styleObj = style as any;
  const customBackgroundColor = styleObj?.backgroundColor;
  const customBorderColor = styleObj?.borderColor;
  const customBorderWidth = styleObj?.borderWidth;
  const customHeight = styleObj?.height;
  const customBorderRadius = styleObj?.borderRadius;
  
  // 커스텀 스타일이 있으면 적용, 없으면 기본값 사용
  const dropdownBgColor = customBackgroundColor || colors.gray200;
  const dropdownStyle: any = {
    width: '100%',
    backgroundColor: dropdownBgColor,
  };
  
  // 보더가 있으면 적용 (항공 구간만)
  if (customBorderColor !== undefined) {
    dropdownStyle.borderColor = customBorderColor;
    dropdownStyle.borderWidth = customBorderWidth ?? 1;
  }
  
  // 높이가 지정되어 있으면 적용 (항공 구간만)
  if (customHeight !== undefined) {
    dropdownStyle.height = customHeight;
    dropdownStyle.minHeight = customHeight;
  }
  
  // borderRadius가 지정되어 있으면 적용 (항공 구간만)
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
      <View ref={pickerRef} style={[styles.wrapper, { zIndex: open ? 10000 : 1 }]}>
        <DropDownPicker
        open={open}
        value={selectedValue}
        items={timeOptions}
        setOpen={(value) => {
          const isOpen = typeof value === 'function' ? value(open) : value;
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
        placeholder={placeholder}
        placeholderStyle={styles.placeholder}
        textStyle={styles.text}
        labelStyle={styles.text}
        listItemLabelStyle={[styles.listItemLabel, { backgroundColor: dropdownBgColor }]}
        selectedItemLabelStyle={styles.selectedItem}
        selectedItemContainerStyle={[styles.selectedItemContainer, { backgroundColor: dropdownBgColor }]}
        style={[styles.dropdown, dropdownStyle]}
        dropDownContainerStyle={[
          styles.dropdownContainer, 
          { 
            width: '100%', 
            backgroundColor: dropdownBgColor,
            ...(customBorderColor && {
              borderColor: customBorderColor,
              borderWidth: customBorderWidth ?? 1,
              borderTopWidth: 0,
            })
          }
        ]}
        containerStyle={[styles.dropdownOuter, { width: '100%' }]}
        listMode="SCROLLVIEW"
        scrollViewProps={{ 
          nestedScrollEnabled: true, 
          keyboardShouldPersistTaps: 'handled',
          showsVerticalScrollIndicator: false 
        }}
        ArrowDownIconComponent={() => <DownArrowIcon width={16} height={16} />}
        ArrowUpIconComponent={() => <UpperArrowIcon width={16} height={16} />}
        translation={{ NOTHING_TO_SHOW: '선택 가능한 시간이 없습니다' }}
        TickIconComponent={() => (
          <CheckBlackIcon width={16} height={16} />
        )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { 
    position: 'relative' 
  },
  dropdown: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray200,
    minHeight: 40,
    position: 'relative',
    zIndex: 9999,
    paddingHorizontal: spacing.md,
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
    position: 'relative', 
    zIndex: 9999 
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
    color: colors.black,
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing.sm,
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



