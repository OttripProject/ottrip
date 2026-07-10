import useDetectClose from "@/hooks/useDetectClose";
import { useMe } from "@/hooks/useMe";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import { zIndex as zIndexTokens } from "@/ui/tokens/zIndex";
import {
  type AirportOption,
  getAirportByIata,
  getAirportOptionsBySearch,
  getCountryIso2ByIata,
} from "@/utils/airportList";
import { codeToFlag } from "@/utils/countryListKo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ViewStyle,
  View,
} from "react-native";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import XIcon from "../../../../assets/mobile_close.svg";
import SearchIcon from "../../../../assets/search.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

const ITEM_HEIGHT = 46;

interface AirportPickerProps {
  value: string;
  onChange: (airportCode: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  dropdownAlign?: "left" | "right";
}

export default function AirportPicker({
  value,
  onChange,
  placeholder = "공항 선택",
  containerStyle,
  style,
  disabled,
  onOpen,
  onClose,
  dropdownAlign = "left",
}: AirportPickerProps) {
  const wrapperRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const [open, setIsOpen, _handleOutsidePress] = useDetectClose(wrapperRef, false);
  const [searchText, setSearchText] = useState("");

  const { data: me } = useMe();
  const storageKey = `recentAirportSearches_${me?.handle ?? "guest"}`;
  const { items: recentSearches, addItem, load } = useRecentSearches(storageKey, 10);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return [];
    return getAirportOptionsBySearch(searchText);
  }, [searchText]);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const airport = getAirportByIata(value);
    return airport ? `${airport.nameKorean} (${airport.iata})` : value;
  }, [value]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    setIsOpen(next);
    if (next) {
      onOpen?.();
      load();
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      onClose?.();
      setSearchText("");
    }
  };

  const handleSelect = (item: AirportOption) => {
    onChange(item.value);
    addItem(item.value);
    setIsOpen(false);
    setSearchText("");
    onClose?.();
  };

  const handleSelectRecent = (code: string) => {
    onChange(code);
    addItem(code);
    setIsOpen(false);
    setSearchText("");
    onClose?.();
  };

  useEffect(() => {
    if (!open) setSearchText("");
  }, [open]);

  const getFlag = (iata: string) => {
    const iso2 = getCountryIso2ByIata(iata);
    return iso2 ? codeToFlag(iso2) : "✈️";
  };

  const renderItem = ({ item }: { item: AirportOption }) => {
    const airport = getAirportByIata(item.value);
    const isSelected = item.value === value;
    return (
      <Pressable
        style={({ hovered }: any) => [
          styles.item,
          isSelected && styles.itemSelected,
          hovered && !isSelected && styles.itemHovered,
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.itemIconWrapper}>
          <Text style={styles.itemIcon}>{getFlag(item.value)}</Text>
        </View>
        <View style={styles.itemNames}>
          <Text
            style={[styles.itemText, isSelected && styles.itemTextSelected]}
            numberOfLines={1}
          >
            {airport?.nameKorean ?? item.label}
          </Text>
          <Text style={styles.itemTextSub} numberOfLines={1}>
            {airport?.countryKorean ?? ""}
          </Text>
        </View>
        <View style={[styles.itemCodeBadge, isSelected && styles.itemCodeBadgeSelected]}>
          <Text style={[styles.itemCode, isSelected && styles.itemCodeSelected]}>
            {item.value}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open ? zIndexTokens.dropdown : 1 }]}
    >
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled, style]}
        onPress={handleToggle}
        disabled={disabled}
      >
        <Text
          style={selectedLabel ? styles.triggerText : styles.triggerPlaceholder}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        {open ? (
          <UpperArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        ) : (
          <DownArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        )}
      </Pressable>

      {open && (
        <View style={[styles.popup, dropdownAlign === "right" ? { right: 0 } : { left: 0 }]}>
          <View style={styles.searchContainer}>
            <SearchIcon width={14} height={14} color={colors.gray600} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="공항명 또는 IATA 코드 검색"
              placeholderTextColor={colors.gray600}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setSearchText("");
                  searchRef.current?.focus();
                }}
                aria-label="지우기"
              >
                <XIcon width={10} height={10} color={colors.gray700} />
              </Pressable>
            )}
          </View>

          <View style={styles.listContainer}>
            {filteredOptions.length > 0 ? (
              <FlatList
                data={filteredOptions}
                keyExtractor={item => item.value}
                renderItem={renderItem}
                getItemLayout={(_data, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.list}
              />
            ) : searchText.trim().length > 0 ? (
              <View style={styles.noResultState}>
                <Text style={styles.noResultTitle}>검색 결과가 없습니다</Text>
                <Text style={styles.noResultSubtitle}>
                  다른 키워드로 검색해 보세요.
                </Text>
              </View>
            ) : recentSearches.length > 0 ? (
              <ScrollView
                style={styles.recentList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.recentLabel}>최근 검색</Text>
                {recentSearches.map(code => {
                  const airport = getAirportByIata(code);
                  const isSelected = value === code;
                  return (
                    <Pressable
                      key={code}
                      style={({ hovered }: any) => [
                        styles.item,
                        isSelected && styles.itemSelected,
                        hovered && !isSelected && styles.itemHovered,
                      ]}
                      onPress={() => handleSelectRecent(code)}
                    >
                      <View style={styles.itemIconWrapper}>
                        <Text style={styles.itemIcon}>{getFlag(code)}</Text>
                      </View>
                      <View style={styles.itemNames}>
                        <Text
                          style={[styles.itemText, isSelected && styles.itemTextSelected]}
                          numberOfLines={1}
                        >
                          {airport?.nameKorean ?? code}
                        </Text>
                        <Text style={styles.itemTextSub} numberOfLines={1}>
                          {airport?.countryKorean ?? ""}
                        </Text>
                      </View>
                      <View
                        style={[styles.itemCodeBadge, isSelected && styles.itemCodeBadgeSelected]}
                      >
                        <Text style={[styles.itemCode, isSelected && styles.itemCodeSelected]}>
                          {code}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <SearchIcon width={22} height={22} color={colors.gray500} />
                <Text style={styles.emptyTitle}>공항을 검색해 보세요</Text>
                <Text style={styles.emptySubtitle}>
                  한국어, 영문, 또는 IATA 코드 (예: ICN)
                </Text>
              </View>
            )}
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
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerDisabled: {
    backgroundColor: colors.gray200,
  },
  triggerText: {
    ...textStyles.body4,
    color: colors.gray900,
    flex: 1,
    marginRight: 4,
  },
  triggerPlaceholder: {
    ...textStyles.body4,
    color: colors.gray600,
    flex: 1,
    marginRight: 4,
  },
  popup: {
    position: "absolute",
    top: 46,
    minWidth: 280,
    width: "100%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    zIndex: zIndexTokens.dropdown,
    overflow: "hidden",
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    ...textStyles.body4,
    color: colors.gray900,
    padding: 0,
    outlineStyle: "none",
  } as any,
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    maxHeight: 260,
  },
  list: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    marginBottom: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    gap: 8,
  },
  itemSelected: {
    backgroundColor: "rgba(26, 102, 224, 0.08)",
  },
  itemHovered: {
    backgroundColor: colors.gray200,
  },
  itemIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  itemNames: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 1,
  },
  itemText: {
    ...textStyles.h7,
    color: colors.gray700,
  },
  itemTextSelected: {
    color: colors.gray900,
  },
  itemTextSub: {
    ...textStyles.body6,
    color: colors.gray500,
  },
  itemCodeBadge: {
    backgroundColor: colors.gray200,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  itemCodeBadgeSelected: {
    backgroundColor: colors.gray300,
  },
  itemCode: {
    ...textStyles.body5,
    color: colors.gray500,
  },
  itemCodeSelected: {
    color: colors.gray700,
  },
  recentList: {
    maxHeight: 260,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  recentLabel: {
    ...textStyles.body5,
    color: colors.gray500,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyState: {
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...textStyles.h7,
    color: colors.gray900,
    marginTop: 6,
    marginBottom: 2,
  },
  emptySubtitle: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  noResultState: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  noResultTitle: {
    ...textStyles.h7,
    color: colors.gray900,
    marginBottom: 2,
  },
  noResultSubtitle: {
    ...textStyles.body5,
    color: colors.gray600,
  },
});
