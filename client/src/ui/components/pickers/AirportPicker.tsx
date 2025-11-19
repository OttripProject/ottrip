import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { getAirportOptions, getAllAirportOptions, getAirportLabel } from '@/utils/airportList';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import DropdownTimeIcon from '../../../../assets/dropdown_time.svg';
import UpperArrowIcon from '../../../../assets/upper_arrow.svg';
import { radii } from '@/ui/tokens/radii';

interface AirportPickerProps {
  value: string; // airport code (e.g., "ICN")
  onChange: (airportCode: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export default function AirportPicker({ 
  value, 
  onChange, 
  placeholder = '공항 선택', 
  containerStyle, 
  disabled 
}: AirportPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // 검색 중이 아니면 주요 공항만, 검색 중이면 전체 목록
  const options = useMemo(() => {
    if (isSearching || searchQuery.length > 0) {
      // 전체 목록에서 검색 (한번만 로드)
      return getAllAirportOptions();
    }
    return getAirportOptions();
  }, [isSearching, searchQuery]);
  
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    setCode(value || null);
  }, [value]);
  
  // DropDownPicker가 열릴 때 검색 모드 활성화
  useEffect(() => {
    if (open) {
      setIsSearching(true);
    }
  }, [open]);

  return (
    <View style={[styles.wrapper, containerStyle, { zIndex: open ? 999999 : 1 }]}> 
      <DropDownPicker
        open={open}
        value={code}
        items={options}
        setOpen={setOpen}
        setValue={(callback: any) => {
          const next = callback(code) as string | null;
          setCode(next);
          onChange(next || '');
        }}
        disabled={disabled}
        searchable
        searchPlaceholder={PLACEHOLDERS.picker.search}
        searchTextInputStyle={{ 
          height: 30, 
          paddingVertical: 6, 
          paddingHorizontal: 10, 
          fontSize: 14, 
          width: '100%',
          borderWidth: 1,
          borderColor: colors.gray400,
          borderRadius: radii.sm,
        }}
        searchContainerStyle={{ 
          paddingVertical: 5, 
          paddingHorizontal: 8, 
          borderBottomWidth: 0, 
          borderTopWidth: 0,
          width: '100%' 
        }}
        placeholder={placeholder} 
        style={[styles.dropdown, { width: '100%' }]}
        dropDownContainerStyle={[styles.dropdownContainer, { width: '100%', maxHeight: 200, borderTopWidth: 0 }]}
        containerStyle={[styles.dropdownOuter, { width: '100%' }]}
        textStyle={{
          fontSize: 14,
          color: colors.black,
        }}
        placeholderStyle={{
          color: colors.gray600,
          fontSize: 13,
        }}
        listMode="SCROLLVIEW"
        scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
        selectedItemLabelStyle={{
          fontWeight: 'bold',
        }}
        ArrowDownIconComponent={() => <DropdownTimeIcon width={16} height={16} />}
        ArrowUpIconComponent={() => <UpperArrowIcon width={16} height={16} />}
        translation={{ NOTHING_TO_SHOW: '결과가 없습니다' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: {
    backgroundColor: colors.white,
    borderColor: colors.gray400,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    position: 'relative',
    zIndex: 999999,
  },
  dropdownContainer: {
    borderColor: colors.gray400,
    borderWidth: 1,
    borderRadius: 8,
    borderTopWidth: 0,
    backgroundColor: colors.white,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 10,
    maxHeight: 200,
  },
  dropdownOuter: {
    position: 'relative',
    zIndex: 999999,
    width: '100%',
  },
});
