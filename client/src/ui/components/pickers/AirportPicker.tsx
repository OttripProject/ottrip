import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { getAirportOptions, getAllAirportOptions, getAirportLabel } from '@/utils/airportList';
import { PLACEHOLDERS } from '@/constants/placeholders';

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
        searchTextInputStyle={{ height: 30, paddingVertical: 6, paddingHorizontal: 10, fontSize: 14, width: '100%' }}
        searchContainerStyle={{ paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0, width: '100%' }}
        placeholder={placeholder}
        style={[styles.dropdown, { width: '100%' }]}
        dropDownContainerStyle={[styles.dropdownContainer, { width: '100%', maxHeight: 200 }]}
        containerStyle={[styles.dropdownOuter, { width: '100%' }]}
        textStyle={{
          fontSize: 14,
          color: '#333',
        }}
        listMode="SCROLLVIEW"
        scrollViewProps={{ nestedScrollEnabled: true, keyboardShouldPersistTaps: 'handled' }}
        selectedItemLabelStyle={{
          fontWeight: 'bold',
        }}
        translation={{ NOTHING_TO_SHOW: '결과가 없습니다' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    position: 'relative',
    zIndex: 999999,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxHeight: 200,
  },
  dropdownOuter: {
    position: 'relative',
    zIndex: 999999,
    width: '100%',
  },
});
