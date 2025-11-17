import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { getKoreanCountryOptions, codeToKoreanName } from '@/utils/countryListKo';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { radii } from '@/ui/tokens/radii';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import DownArrowIcon from '../../../../assets/down_arrow.svg';
import UpperArrowIcon from '../../../../assets/upper_arrow.svg'; 

interface CountryPickerProps {
  value: string; // country name in Korean
  onChange: (countryName: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function CountryPicker({ value, onChange, placeholder = '국가 선택', containerStyle, disabled, onOpen, onClose }: CountryPickerProps) {
  const options = useMemo(() => getKoreanCountryOptions(), []);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const matched = options.find((opt) => opt.label === value);
    setCode(matched ? matched.value : null);
  }, [value, options]);

  return (
    <View style={[styles.wrapper, containerStyle, { zIndex: open ? 10000 : 1 }]}> 
      <DropDownPicker
        open={open}
        value={code}
        items={options}
        setOpen={(value) => {
          const isOpen = typeof value === 'function' ? value(open) : value;
          setOpen(value);
          if (isOpen) {
            onOpen?.();
          } else {
            onClose?.();
          }
        }}
        setValue={(callback: any) => {
          const next = callback(code) as string | null;
          setCode(next);
          const name = codeToKoreanName(next || undefined) || '';
          onChange(name);
        }}
        disabled={disabled}
        searchable
        searchPlaceholder={PLACEHOLDERS.picker.search}
        searchTextInputStyle={styles.searchInput}
        searchContainerStyle={styles.searchContainer}
        placeholder={placeholder}
        placeholderStyle={styles.placeholder}
        searchPlaceholderTextColor={colors.gray600}
        textStyle={styles.text}
        labelStyle={styles.text}
        listItemLabelStyle={styles.listItemLabel}
        selectedItemLabelStyle={styles.selectedItem}
        selectedItemContainerStyle={styles.selectedItemContainer}
        style={[styles.dropdown, { width: '100%' }]}
        dropDownContainerStyle={[styles.dropdownContainer, { zIndex: 11000, position: 'absolute' }]}
        containerStyle={[styles.dropdownOuter, { width: '100%' }]}
        listMode="SCROLLVIEW"
        scrollViewProps={{ 
          nestedScrollEnabled: true, 
          keyboardShouldPersistTaps: 'handled',
          showsVerticalScrollIndicator: false 
        }}
        ArrowDownIconComponent={() => <DownArrowIcon width={16} height={16} />}
        ArrowUpIconComponent={() => <UpperArrowIcon width={16} height={16} />}
        translation={{ NOTHING_TO_SHOW: '결과가 없습니다' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray300,
    minHeight: 40,
    position: 'relative',
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownContainer: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray300,
    zIndex: 9999,
    elevation: 6,
    position: 'absolute'
  },
  dropdownOuter: { position: 'relative', zIndex: 9999 },
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
    backgroundColor: colors.gray300,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  selectedItem: {
    ...textStyles.body4,
    color: colors.black,
  },
  selectedItemContainer: {
    backgroundColor: colors.gray300,
  },
  searchInput: {
    height: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.sm
  },
  searchContainer: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    width: '100%',
  },
});


