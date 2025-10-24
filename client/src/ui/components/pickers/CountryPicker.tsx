import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { getKoreanCountryOptions, codeToKoreanName } from '@/utils/countryListKo';
import { PLACEHOLDERS } from '@/constants/placeholders';

interface CountryPickerProps {
  value: string; // country name in Korean
  onChange: (countryName: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export default function CountryPicker({ value, onChange, placeholder = '국가 선택', containerStyle, disabled }: CountryPickerProps) {
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
        setOpen={setOpen}
        setValue={(callback: any) => {
          const next = callback(code) as string | null;
          setCode(next);
          const name = codeToKoreanName(next || undefined) || '';
          onChange(name);
        }}
        disabled={disabled}
        searchable
        searchPlaceholder={PLACEHOLDERS.picker.search}
        searchTextInputStyle={{ height: 30, paddingVertical: 6, paddingHorizontal: 10, fontSize: 14, width: '100%' }}
        searchContainerStyle={{ paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0, width: '100%' }}
        placeholder={placeholder}
        style={[styles.dropdown, { width: '100%' }]}
        dropDownContainerStyle={[styles.dropdownContainer, { width: '100%' }]}
        containerStyle={[styles.dropdownOuter, { width: '100%' }]}
        listMode="SCROLLVIEW"
        scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
        translation={{ NOTHING_TO_SHOW: '결과가 없습니다' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 45,
    position: 'relative',
    zIndex: 9999,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    zIndex: 9999,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownOuter: { position: 'relative', zIndex: 9999 },
});


