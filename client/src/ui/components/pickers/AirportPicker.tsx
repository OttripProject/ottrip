import { PLACEHOLDERS } from "@/constants/placeholders";
import useDetectClose from "@/hooks/useDetectClose";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import {
  getAirportLabelByIata,
  getAirportOptionsBySearch,
} from "@/utils/airportList";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DropdownTimeIcon from "../../../../assets/dropdown_time.svg";
import SearchIcon from "../../../../assets/search.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

interface AirportPickerProps {
  value: string;
  onChange: (airportCode: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  dropDownContainerStyle?: ViewStyle;
  searchTextInputStyle?: TextStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const defaultSearchTextInputStyle: TextStyle = {
  height: 30,
  paddingVertical: 6,
  paddingLeft: 32,
  paddingRight: 10,
  fontSize: 14,
  width: "100%",
  borderWidth: 1,
  borderColor: colors.gray400,
  borderRadius: radii.xs,
};

export default function AirportPicker({
  value,
  onChange,
  placeholder,
  containerStyle,
  style,
  dropDownContainerStyle,
  searchTextInputStyle,
  textStyle,
  disabled,
  onOpen,
  onClose,
}: AirportPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const searchResults = getAirportOptionsBySearch(searchQuery);
      setOptions(searchResults);
    } else {
      if (value) {
        const label = getAirportLabelByIata(value);
        if (label) {
          setOptions([{ label, value }]);
        } else {
          setOptions([]);
        }
      } else {
        setOptions([]);
      }
    }
  }, [searchQuery, value]);

  const pickerRef = useRef<View>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(
    pickerRef,
    false,
  );
  const [code, setCode] = useState<string | null>(value || null);

  useEffect(() => {
    setCode(value || null);
  }, [value]);

  const handleSetOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const isOpen = typeof value === "function" ? value(open) : value;
    setIsOpen(isOpen);
    if (isOpen) {
      onOpen?.();
    } else {
      setSearchQuery("");
      onClose?.();
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <>
      {open && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 999998 }]}
          onPress={handleOutsidePress}
        />
      )}
      <View
        ref={pickerRef}
        style={[styles.wrapper, containerStyle, { zIndex: open ? 999999 : 1 }]}
      >
        {open && (
          <View style={styles.searchIconOverlay}>
            <SearchIcon width={16} height={16} />
          </View>
        )}
        <DropDownPicker
          open={open}
          value={code}
          items={options}
          setOpen={handleSetOpen}
          setValue={(callback: any) => {
            const next = callback(code) as string | null;
            setCode(next);
            onChange(next || "");
          }}
          disabled={disabled}
          searchable
          searchPlaceholder={PLACEHOLDERS.picker.search}
          onChangeSearchText={handleSearch}
          disableLocalSearch={true}
          searchTextInputStyle={[
            defaultSearchTextInputStyle,
            searchTextInputStyle,
          ]}
          searchContainerStyle={{
            paddingVertical: 5,
            paddingHorizontal: 8,
            borderBottomWidth: 0,
            borderTopWidth: 0,
            width: "100%",
            position: "relative",
          }}
          placeholder={placeholder}
          style={[styles.dropdown, { width: "100%" }, style]}
          dropDownContainerStyle={[
            styles.dropdownContainer,
            { width: "100%", maxHeight: 200, borderTopWidth: 0 },
            dropDownContainerStyle,
          ]}
          containerStyle={[styles.dropdownOuter, { width: "100%" }]}
          textStyle={textStyle ?? {
            fontSize: 14,
            color: colors.black,
          }}
          placeholderStyle={{
            color: colors.gray600,
            fontSize: 13,
          }}
          listMode="SCROLLVIEW"
          dropDownDirection="BOTTOM"
          scrollViewProps={{
            nestedScrollEnabled: true,
            keyboardShouldPersistTaps: "handled",
            showsVerticalScrollIndicator: false,
          }}
          selectedItemLabelStyle={{
            fontWeight: "bold",
          }}
          ArrowDownIconComponent={() => (
            <DropdownTimeIcon width={10} height={10} style={{ opacity: 0.6 }} />
          )}
          ArrowUpIconComponent={() => <UpperArrowIcon width={10} height={10} style={{ opacity: 0.6 }} />}
          translation={{ NOTHING_TO_SHOW: "결과가 없습니다" }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  dropdown: {
    backgroundColor: colors.white,
    borderColor: colors.gray400,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    position: "relative",
    zIndex: 999999,
  },
  dropdownContainer: {
    borderColor: colors.gray400,
    borderWidth: 1,
    borderRadius: 8,
    borderTopWidth: 0,
    backgroundColor: colors.white,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 10,
    maxHeight: 200,
  },
  dropdownOuter: {
    position: "relative",
    zIndex: 999999,
    width: "100%",
  },
  searchIconOverlay: {
    position: "absolute",
    left: 20,
    top: 53,
    zIndex: 1000000,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
});
