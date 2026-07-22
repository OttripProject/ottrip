import useDetectClose from "@/hooks/useDetectClose";
import Svg, { Circle, Path } from "react-native-svg";
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
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
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

const getEulRul = (text: string): string => {
  const code = text[text.length - 1]?.charCodeAt(0) ?? 0;
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? "를" : "을";
  }
  return "을(를)";
};

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
  useModal?: boolean;
  fullScreenModal?: boolean;
  openTrigger?: number;
}

export default function CountryPicker({
  value,
  onChange,
  placeholder = "나라 선택",
  containerStyle,
  style,
  disabled,
  onOpen,
  onClose,
  useModal = false,
  fullScreenModal,
  openTrigger,
}: CountryPickerProps) {
  const allOptions = useMemo(() => getKoreanCountryOptions(), []);
  const popularOptions = useMemo(() => getPopularCountryOptions(), []);
  const wrapperRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const flatListRef = useRef<any>(null);
  const sectionListRef = useRef<any>(null);
  const [open, setIsOpen, _handleOutsidePress] = useDetectClose(
    wrapperRef,
    false,
  );
  const [searchText, setSearchText] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [triggerLayout, setTriggerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [fsOpen, setFsOpen] = useState(false);

  const isNativeEnv = Platform.OS !== "web";
  const effectiveOpen = open || fsOpen;

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

  const flatItems = useMemo(() => {
    if (searchText.trim()) return filteredOptions;
    return sections.flatMap(s => s.data);
  }, [searchText, filteredOptions, sections]);

  const flatItemsRef = useRef(flatItems);
  flatItemsRef.current = flatItems;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  const searchTextRef = useRef(searchText);
  searchTextRef.current = searchText;

  useEffect(() => {
    if (!openTrigger || openTrigger <= 0) return;
    if (!fullScreenModal || !isNativeEnv) return;
    setFsOpen(true);
    onOpen?.();
    load();
    setTimeout(() => searchRef.current?.focus(), 150);
  }, [openTrigger]);

  const handleClose = () => {
    setIsOpen(false);
    setFsOpen(false);
    setSearchText("");
    onClose?.();
  };

  const handleToggle = () => {
    if (disabled) return;
    if (fullScreenModal && isNativeEnv) {
      setFsOpen(true);
      onOpen?.();
      load();
      setTimeout(() => searchRef.current?.focus(), 150);
      return;
    }
    const next = !open;
    if (next && useModal) {
      wrapperRef.current?.measureInWindow((x, y, width, height) => {
        setTriggerLayout({ x, y, width, height });
        setIsOpen(true);
        onOpen?.();
        load();
        setTimeout(() => searchRef.current?.focus(), 50);
      });
      return;
    }
    setIsOpen(next);
    if (next) {
      onOpen?.();
      load();
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      handleClose();
    }
  };

  const handleSelect = (item: CountryOption) => {
    onChange(item.label);
    addItem(item.label);
    handleClose();
  };

  useEffect(() => {
    if (!effectiveOpen) setSearchText("");
  }, [effectiveOpen]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [effectiveOpen, searchText]);

  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const items = flatItemsRef.current;
      const idx = focusedIndexRef.current;
      const isSearching = !!searchTextRef.current.trim();
      const maxIdx = isSearching ? items.length : items.length - 1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, maxIdx));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isSearching && idx === items.length) {
          const trimmed = searchTextRef.current.trim();
          onChange(trimmed);
          addItem(trimmed);
          setIsOpen(false);
          setFsOpen(false);
          setSearchText("");
          onClose?.();
        } else if (idx >= 0 && idx < items.length) {
          handleSelect(items[idx]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setFsOpen(false);
        setSearchText("");
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    if (searchText.trim()) {
      if (focusedIndex >= filteredOptions.length) {
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        try {
          flatListRef.current?.scrollToIndex({ index: focusedIndex, animated: true, viewPosition: 0.5 });
        } catch {}
      }
    } else {
      let remaining = focusedIndex;
      for (let si = 0; si < sections.length; si++) {
        if (remaining < sections[si].data.length) {
          try {
            sectionListRef.current?.scrollToLocation({ sectionIndex: si, itemIndex: remaining, animated: true, viewPosition: 0.5 });
          } catch {}
          break;
        }
        remaining -= sections[si].data.length;
      }
    }
  }, [focusedIndex]);

  const renderItem = ({ item }: { item: CountryOption }) => {
    const isSelected = item.value === selectedCode;
    const isFocused = focusedIndex >= 0 && flatItems[focusedIndex]?.value === item.value;
    return (
      <Pressable
        style={({ hovered }: any) => [
          styles.item,
          isSelected && styles.itemSelected,
          (hovered || isFocused) && !isSelected && styles.itemHovered,
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

  const closeModal = () => {
    handleClose();
  };

  const popupContent = (
    <View style={styles.popupInner}>
      <View style={styles.searchContainer}>
        <SearchIcon width={14} height={14} color={colors.gray600} />
        <TextInput
          ref={searchRef}
          style={[styles.searchInput, isNativeEnv && { lineHeight: 16 }]}
          placeholder="나라이름 또는 코드 검색"
          placeholderTextColor={colors.gray600}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={Platform.OS === "web"}
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

      <View style={[styles.listContainer, !fsOpen && styles.listContainerPopup, fsOpen && styles.listContainerFs]}>
        {filteredOptions.length > 0 ? (
          <FlatList
            ref={flatListRef}
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
            ListFooterComponent={() => {
              const isFocused = focusedIndex === filteredOptions.length;
              const trimmed = searchText.trim();
              return (
                <Pressable
                  style={({ hovered }: any) => [
                    styles.directInputItem,
                    (hovered || isFocused) && styles.directInputItemFocused,
                  ]}
                  onPress={() => {
                    onChange(trimmed);
                    addItem(trimmed);
                    handleClose();
                  }}
                >
                  <View style={styles.directInputIconCircle}>
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M12 5v14M5 12h14" stroke="rgb(0,122,255)" strokeWidth={1.9} strokeLinecap="round" />
                    </Svg>
                  </View>
                  <View style={styles.directInputNames}>
                    <Text style={styles.directInputTitle} numberOfLines={1}>'{trimmed}' 직접 입력</Text>
                    <Text style={styles.directInputSubtitle} numberOfLines={1}>이 이름 그대로 저장</Text>
                  </View>
                  <Text style={styles.directInputEnterKey}>↵</Text>
                </Pressable>
              );
            }}
          />
        ) : searchText.trim().length > 0 ? (
          <View style={styles.noResultState}>
            <View style={styles.noResultIconCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={8} stroke="rgb(155,155,155)" strokeWidth={1.6} />
                <Path d="M8.5 14c1 1 5 1 7 0" stroke="rgb(155,155,155)" strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </View>
            <Text style={styles.noResultTitle}>
              {'\''}
              <Text style={styles.noResultKeyword}>{searchText.trim()}</Text>
              {`' ${getEulRul(searchText.trim())} 찾을 수 없어요`}
            </Text>
            <Text style={styles.noResultSubtitle}>입력한 그대로 저장할 수 있어요</Text>
            <Pressable
              style={styles.noResultButton}
              onPress={() => {
                const trimmed = searchText.trim();
                onChange(trimmed);
                addItem(trimmed);
                handleClose();
              }}
            >
              <Text style={styles.noResultButtonText}>+ '{searchText.trim()}' 직접 입력</Text>
            </Pressable>
          </View>
        ) : (
          <SectionList
            ref={sectionListRef}
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
      {Platform.OS === "web" && (
        <View style={styles.keyboardHint}>
          <View style={styles.keyboardHintRow}>
            <Text style={styles.keyboardHintKey}>↑↓</Text>
            <Text style={styles.keyboardHintText}>이동</Text>
            <Text style={styles.keyboardHintKey}>↵</Text>
            <Text style={styles.keyboardHintText}>선택</Text>
            <Text style={styles.keyboardHintKey}>esc</Text>
            <Text style={styles.keyboardHintText}>닫기</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open && !useModal ? 100 : 1 }]}
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
        {(open || fsOpen) ? (
          <UpperArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        ) : (
          <DownArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />
        )}
      </Pressable>

      {open && !useModal && (
        <View style={styles.popup}>
          {popupContent}
        </View>
      )}

      {useModal && (
        <Modal
          visible={open}
          transparent
          animationType="none"
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeModal} />
          <View
            style={[
              styles.popup,
              styles.popupModal,
              {
                top: triggerLayout.y + triggerLayout.height + 4,
                left: triggerLayout.x,
                width: Math.max(280, triggerLayout.width),
              },
            ]}
          >
            {popupContent}
          </View>
        </Modal>
      )}

      {fullScreenModal && isNativeEnv && (
        <Modal
          visible={fsOpen}
          animationType="slide"
          onRequestClose={handleClose}
        >
          <SafeAreaView style={styles.fsContainer}>
            <View style={styles.fsHeader}>
              <View style={styles.fsNavBtn} />
              <Text style={styles.fsTitle}>나라 선택</Text>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.fsNavBtn}>
                <XIcon width={22} height={22} color={colors.gray700} />
              </Pressable>
            </View>
            {popupContent}
          </SafeAreaView>
        </Modal>
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
  popupModal: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  popupInner: {
    flex: 1,
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
    padding: 3,
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
  },
  listContainerPopup: {
    maxHeight: 300,
  },
  listContainerFs: {
    flex: 1,
    borderTopWidth: 0,
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
    ...textStyles.h10,
    color: colors.gray700,
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
  keyboardHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgb(244, 244, 244)",
    backgroundColor: "rgb(250, 250, 250)",
  },
  keyboardHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  keyboardHintText: {
    fontFamily: "Pretendard",
    fontSize: 10,
    lineHeight: 14,
    color: "rgb(155, 155, 155)",
  },
  keyboardHintKey: {
    ...textStyles.h10,
    backgroundColor: "rgb(255, 255, 255)",
    borderWidth: 1,
    borderColor: "rgb(226, 226, 226)",
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 7,
    color: "rgb(108, 108, 108)",
    minWidth: 16,
    textAlign: "center",
  } as any,
  directInputItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
    marginHorizontal: 6,
    marginBottom: 4,
  },
  directInputItemFocused: {
    backgroundColor: colors.gray200,
  },
  directInputIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgb(234, 241, 254)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  directInputNames: {
    flex: 1,
    minWidth: 0,
  },
  directInputTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 13,
    lineHeight: 18,
    color: "rgb(0, 122, 255)",
  },
  directInputSubtitle: {
    fontFamily: "Pretendard",
    fontSize: 11,
    lineHeight: 15,
    color: "rgb(155, 155, 155)",
  },
  directInputEnterKey: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    lineHeight: 14,
    backgroundColor: "rgb(255, 255, 255)",
    borderWidth: 1,
    borderColor: "rgb(226, 226, 226)",
    borderRadius: 5,
    paddingTop: 1,
    paddingBottom: 1,
    paddingHorizontal: 5,
    color: "rgb(108, 108, 108)",
    minWidth: 16,
    textAlign: "center",
  } as any,
  noResultState: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 8,
  },
  noResultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgb(244, 244, 244)",
    alignItems: "center",
    justifyContent: "center",
  },
  noResultTitle: {
    ...textStyles.h7,
    color: "rgb(31, 31, 31)",
    textAlign: "center",
  },
  noResultKeyword: {
    ...textStyles.h7,
    color: "rgb(0, 122, 255)",
  },
  noResultSubtitle: {
    ...textStyles.body5,
    color: "rgb(155, 155, 155)",
    textAlign: "center",
  },
  noResultButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgb(0, 122, 255)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 4,
  },
  noResultButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 12,
    lineHeight: 12,
    color: "rgb(255, 255, 255)",
  },
  fsContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fsNavBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fsTitle: {
    flex: 1,
    ...textStyles.h5,
    color: colors.black,
    textAlign: "center",
  },
});
