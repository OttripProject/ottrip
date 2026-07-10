import useDetectClose from "@/hooks/useDetectClose";
import { useMe } from "@/hooks/useMe";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import {
  type CountryOption,
  codeToFlag,
  getKoreanCountryOptions,
  getPopularCountryOptions,
} from "@/utils/countryListKo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import XIcon from "../../../../assets/mobile_close.svg";
import SearchIcon from "../../../../assets/search.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

const ITEM_HEIGHT = 46;

interface CountryPickerProps {
  value: string;
  onChange: (countryName: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  dropDownContainerStyle?: ViewStyle;
  listItemLabelStyle?: ViewStyle | TextStyle;
  selectedItemContainerStyle?: ViewStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function CountryPicker({
  value,
  onChange,
  placeholder = "국가 선택",
  containerStyle,
  style,
  disabled,
  onOpen,
  onClose,
}: CountryPickerProps) {
  const allOptions = useMemo(() => getKoreanCountryOptions(), []);
  const popularOptions = useMemo(() => getPopularCountryOptions(), []);
  const wrapperRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const [open, setIsOpen, _handleOutsidePress] = useDetectClose(
    wrapperRef,
    false,
  );
  const [searchText, setSearchText] = useState("");

  const { data: me } = useMe();
  const storageKey = `recentCountrySearches_${me?.handle ?? "guest"}`;
  const {
    items: recentSearches,
    addItem,
    load,
  } = useRecentSearches(storageKey, 10);

  const selectedCode = useMemo(() => {
    if (!value) return null;
    const matched = allOptions.find(opt => opt.label === value);
    return matched?.value ?? null;
  }, [value, allOptions]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return allOptions.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        opt.labelEn.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [searchText, allOptions]);

  const recentOptions = useMemo(() => {
    return recentSearches
      .map(name => allOptions.find(o => o.label === name))
      .filter((o): o is CountryOption => !!o);
  }, [recentSearches, allOptions]);

  const sections = useMemo(() => {
    const result = [];
    if (recentOptions.length > 0) {
      result.push({ title: "최근 검색", data: recentOptions });
    }
    result.push({ title: "인기", data: popularOptions });
    result.push({ title: "전체", data: allOptions });
    return result;
  }, [recentOptions, allOptions, popularOptions]);

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

  const handleSelect = (item: CountryOption) => {
    onChange(item.label);
    addItem(item.label);
    setIsOpen(false);
    setSearchText("");
    onClose?.();
  };

  useEffect(() => {
    if (!open) setSearchText("");
  }, [open]);

  const renderItem = ({ item }: { item: CountryOption }) => {
    const isSelected = item.value === selectedCode;
    return (
      <Pressable
        style={({ hovered }: any) => [
          styles.item,
          isSelected && styles.itemSelected,
          hovered && !isSelected && styles.itemHovered,
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.itemFlagWrapper}>
          <Text style={styles.itemFlag}>{item.flag}</Text>
        </View>
        <View style={styles.itemNames}>
          <Text
            style={[styles.itemText, isSelected && styles.itemTextSelected]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Text style={styles.itemTextEn} numberOfLines={1}>
            {item.labelEn}
          </Text>
        </View>
        <View
          style={[
            styles.itemCodeBadge,
            isSelected && styles.itemCodeBadgeSelected,
          ]}
        >
          <Text
            style={[styles.itemCode, isSelected && styles.itemCodeSelected]}
          >
            {item.value}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open ? 100 : 1 }]}
    >
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled, style]}
        onPress={handleToggle}
        disabled={disabled}
      >
        <Text
          style={value ? styles.triggerText : styles.triggerPlaceholder}
          numberOfLines={1}
        >
          {value
            ? `${selectedCode ? codeToFlag(selectedCode) : ""} ${value}`.trim()
            : placeholder}
        </Text>
        {open ? (
          <UpperArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        ) : (
          <DownArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        )}
      </Pressable>

      {open && (
        <View style={styles.popup}>
          <View style={styles.searchContainer}>
            <SearchIcon width={14} height={14} color={colors.gray600} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="국가명 또는 코드 검색"
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
            ) : (
              <SectionList
                sections={sections}
                keyExtractor={(item, index) => `${item.value}-${index}`}
                renderSectionHeader={({ section }) => (
                  <Text style={styles.sectionLabel}>{section.title}</Text>
                )}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                style={styles.list}
              />
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
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerDisabled: {
    borderWidth: 1,
    borderColor: colors.gray400,
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
    left: 0,
    minWidth: 280,
    width: "100%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    zIndex: 1000,
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
    maxHeight: 300,
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
  itemFlagWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemFlag: {
    fontSize: 18,
    lineHeight: 22,
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
  itemTextEn: {
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
  sectionLabel: {
    fontFamily: "Pretendard-Bold",
    fontSize: 10,
    lineHeight: 14,
    color: "rgb(155, 155, 155)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 4,
  } as any,
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
