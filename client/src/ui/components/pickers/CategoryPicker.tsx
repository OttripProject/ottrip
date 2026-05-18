import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, TextStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { categoryLabels, ExpenseCategory } from '@/types/expense';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { radii } from '@/ui/tokens/radii';
import useDetectClose from '@/hooks/useDetectClose';

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  /** 트리거(닫힌 상태) 스타일 — 기본 스타일 뒤에 병합 */
  style?: ViewStyle;
  /** 열린 목록 컨테이너 — 기본 스타일 뒤에 병합 */
  dropDownContainerStyle?: ViewStyle;
  listItemLabelStyle?: TextStyle;
  selectedItemContainerStyle?: ViewStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function CategoryPicker({
  value,
  onChange,
  placeholder = PLACEHOLDERS.picker.category,
  containerStyle,
  style,
  dropDownContainerStyle,
  listItemLabelStyle,
  selectedItemContainerStyle,
  disabled,
  onOpen,
  onClose,
}: CategoryPickerProps) {
  const items = useMemo(() =>
    Object.entries(categoryLabels).map(([v, label]) => ({ label, value: v as ExpenseCategory })), []);
  const pickerRef = useRef<View>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(pickerRef, false);

  const [innerValue, setInnerValue] = useState<ExpenseCategory>(value);
  useEffect(() => setInnerValue(value), [value]);

  const dropdownHeight = containerStyle && 'height' in containerStyle 
    ? containerStyle.height 
    : undefined;

  return (
    <>
      {/* 외부 클릭 감지를 위한 투명 오버레이 */}
      {open && (
        <Pressable 
          style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}
          onPress={handleOutsidePress}
        />
      )}
      <View ref={pickerRef} style={[styles.wrapper, containerStyle, { zIndex: open ? 10000 : 1 }]}> 
        <DropDownPicker
        open={open}
        value={innerValue}
        items={items}
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
          const next = callback(innerValue) as ExpenseCategory;
          setInnerValue(next);
          onChange(next);
        }}
        disabled={disabled}
        placeholder={placeholder}
        style={[
          styles.dropdown,
          dropdownHeight ? { height: dropdownHeight, minHeight: dropdownHeight } : {},
          style,
        ]}
        dropDownContainerStyle={[
          styles.dropdownContainer,
          { zIndex: 11000, position: 'absolute' as const, borderTopWidth: 0 },
          dropDownContainerStyle,
        ]}
        {...(listItemLabelStyle != null ? { listItemLabelStyle } : {})}
        {...(selectedItemContainerStyle != null
          ? { selectedItemContainerStyle }
          : {})}
        listMode="SCROLLVIEW"
        dropDownDirection="BOTTOM"
        scrollViewProps={{ showsVerticalScrollIndicator: false }}
        zIndex={10000}
        zIndexInverse={1000}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: { borderWidth: 1, borderColor: colors.gray400, borderRadius: radii.md, minHeight: 40, backgroundColor: colors.white },
  dropdownContainer: { borderWidth: 1, borderColor: colors.gray400, borderRadius: radii.md, backgroundColor: colors.white },
});


