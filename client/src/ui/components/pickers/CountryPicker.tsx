import useDetectClose from "@/hooks/useDetectClose";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import {
  codeToKoreanName,
  getKoreanCountryOptions,
  type CountryOption,
} from "@/utils/countryListKo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import CheckBlackIcon from "../../../../assets/check_black.svg";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import SearchIcon from "../../../../assets/search.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";
import XIcon from "../../../../assets/mobile_close.svg";

const ITEM_HEIGHT = 36;

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
  const options = useMemo(() => getKoreanCountryOptions(), []);
  const wrapperRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(wrapperRef, false);
  const [searchText, setSearchText] = useState("");

  const selectedCode = useMemo(() => {
    if (!value) return null;
    const matched = options.find(opt => opt.label === value);
    return matched?.value ?? null;
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [searchText, options]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    setIsOpen(next);
    if (next) {
      onOpen?.();
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      onClose?.();
      setSearchText("");
    }
  };

  const handleSelect = (item: CountryOption) => {
    onChange(item.label);
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
        style={({ pressed }) => [
          styles.item,
          isSelected && styles.itemSelected,
          pressed && styles.itemPressed,
        ]}
        onPress={() => handleSelect(item)}
      >
        <Text
          style={[styles.itemText, isSelected && styles.itemTextSelected]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {isSelected && <CheckBlackIcon width={14} height={14} />}
      </Pressable>
    );
  };

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open ? 100 : 1 }]}
    >
      <Pressable
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          style,
        ]}
        onPress={handleToggle}
        disabled={disabled}
      >
        <Text
          style={value ? styles.triggerText : styles.triggerPlaceholder}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {open ? (
          <UpperArrowIcon width={16} height={16} />
        ) : (
          <DownArrowIcon width={16} height={16} />
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
            ) : (
              <View style={styles.emptyState}>
                <SearchIcon width={22} height={22} color={colors.gray500} />
                <Text style={styles.emptyTitle}>국가를 검색해 보세요</Text>
                <Text style={styles.emptySubtitle}>
                  한국어, 영문, 또는 코드(예: KR)
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
    maxHeight: 260,
  },
  list: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: ITEM_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  itemSelected: {
    backgroundColor: colors.gray200,
  },
  itemPressed: {
    backgroundColor: colors.gray200,
  },
  itemText: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  itemTextSelected: {
    color: colors.gray900,
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
});
