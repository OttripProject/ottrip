import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  Keyboard,
} from 'react-native';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import {
  getAirportOptionsBySearch,
  getAirportLabelByIata,
} from '@/utils/airportList';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import Input from '@/ui/components/input/Input';
import CloseIcon from '../../../../assets/mobile_close.svg';
import SearchIcon from '../../../../assets/search.svg';
import CheckIcon from '../../../../assets/check_black.svg';

interface AirportSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (airportCode: string) => void;
  selectedValue?: string;
}

const RECENT_LIMIT = 10;
const STORAGE_KEY = 'recentAirportSearches';

export default function AirportSearchModal({
  visible,
  onClose,
  onSelect,
  selectedValue,
}: AirportSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { items: recentSearches, addItem, load } = useRecentSearches(
    STORAGE_KEY,
    RECENT_LIMIT
  );

  useEffect(() => {
    if (visible) {
      load();
    }
  }, [visible, load]);

  const filteredAirports = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return getAirportOptionsBySearch(searchQuery.trim());
  }, [searchQuery]);

  const handleSelect = (airportCode: string) => {
    onSelect(airportCode);
    addItem(airportCode);
    setSearchQuery('');
    Keyboard.dismiss();
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    Keyboard.dismiss();
    onClose();
  };

  const showSearchResults = searchQuery.trim().length > 0;
  const showRecent = !showSearchResults && recentSearches.length > 0;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleClose}
      height={0.85}
      showDragHandle
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>공항 선택</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={8}>
            <CloseIcon width={20} height={20} color={colors.gray700} />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <Input
          variant="filled"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="공항 검색..."
          placeholderTextColor={colors.gray600}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="characters"
        />
        <View style={styles.searchIcon}>
          <SearchIcon width={20} height={20} color={colors.gray600} />
        </View>
      </View>

      {/* Content */}
      {showSearchResults ? (
        <FlatList
          data={filteredAirports}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.listItem, styles.listItemRow]}
              onPress={() => handleSelect(item.value)}
            >
              <Text
                style={styles.listItemText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.label}
              </Text>
              {selectedValue === item.value && (
                <CheckIcon width={20} height={20} color={colors.black} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      ) : showRecent ? (
        <ScrollView
          style={styles.recentScroll}
          contentContainerStyle={styles.recentSection}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.recentLabel}>최근 검색</Text>
          {recentSearches.map((code) => {
            const label = getAirportLabelByIata(code) || code;
            return (
              <Pressable
                key={code}
                style={[styles.recentItem, styles.recentItemRow]}
                onPress={() => handleSelect(code)}
              >
                <Text
                  style={styles.recentItemText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
                {selectedValue === code && (
                  <CheckIcon width={20} height={20} color={colors.black} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyHint}>공항을 검색해 보세요</Text>
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 24,
  },
  searchInput: {
    height: 48,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 44,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    color: colors.black,
  },
  searchIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  recentScroll: {
    flex: 1,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  recentLabel: {
    ...textStyles.h6,
    color: colors.gray600,
    marginBottom: 12,
  },
  recentItem: {
    paddingBottom: 16,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentItemText: {
    ...textStyles.h5,
    color: colors.black,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listItem: {
    paddingBottom: 14,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemText: {
    ...textStyles.h5,
    color: colors.black,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  emptyText: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: 'center',
    paddingVertical: 32,
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptyHint: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: 'center',
  },
});
