import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { categoryLabels, ExpenseCategory } from '@/types/expense';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { radii } from '@/ui/tokens/radii';

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export default function CategoryPicker({ value, onChange, placeholder = PLACEHOLDERS.picker.category, containerStyle, disabled }: CategoryPickerProps) {
  const items = useMemo(() =>
    Object.entries(categoryLabels).map(([v, label]) => ({ label, value: v as ExpenseCategory })), []);
  const [open, setOpen] = useState(false);

  const [innerValue, setInnerValue] = useState<ExpenseCategory>(value);
  useEffect(() => setInnerValue(value), [value]);

  return (
    <View style={[styles.wrapper, containerStyle, { zIndex: open ? 5000 : 1 }]}> 
      <DropDownPicker
        open={open}
        value={innerValue}
        items={items}
        setOpen={setOpen}
        setValue={(callback: any) => {
          const next = callback(innerValue) as ExpenseCategory;
          setInnerValue(next);
          onChange(next);
        }}
        disabled={disabled}
        placeholder={placeholder}
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        listMode="SCROLLVIEW"
        zIndex={5000}
        zIndexInverse={1000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: { borderWidth: 1, borderColor: colors.gray400, borderRadius: radii.md, minHeight: 40, backgroundColor: colors.white },
  dropdownContainer: { borderWidth: 1, borderColor: colors.gray400, borderRadius: radii.md, backgroundColor: colors.white },
});


