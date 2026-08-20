import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useLoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export type PlaceResult = {
  name: string;
  placeId: string;
  latitude: number;
  longitude: number;
  address?: string;
};

interface PlacesSearchInputProps {
  value?: string;
  onSelect: (place: PlaceResult) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function PlacesSearchInput({
  value,
  onSelect,
  onClear,
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
}: PlacesSearchInputProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });
  const [inputValue, setInputValue] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<View>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const measureContainer = () => {
    containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setDropdownRect({ top: pageY + height + 4, left: pageX, width });
    });
  };

  const fetchSuggestions = async (input: string) => {
    if (!input.trim() || !isLoaded) {
      setSuggestions([]);
      return;
    }
    try {
      const { AutocompleteSuggestion } = await (
        google.maps as any
      ).importLibrary("places");
      const { suggestions: results } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input });
      setSuggestions(results.map((s: any) => s.placePrediction));
    } catch {
      setSuggestions([]);
    }
  };

  const handleChangeText = (val: string) => {
    setInputValue(val);
    measureContainer();
    setOpen(true);
    if (val === "") {
      setSuggestions([]);
      onClear?.();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = async (prediction: any) => {
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "location", "formattedAddress", "id"],
    });
    const name: string = place.displayName ?? place.formattedAddress ?? "";
    setInputValue(name);
    setSuggestions([]);
    setOpen(false);
    onSelectRef.current({
      name,
      placeId: place.id ?? "",
      latitude: place.location?.lat() ?? 0,
      longitude: place.location?.lng() ?? 0,
      address: place.formattedAddress ?? undefined,
    });
  };

  if (readOnly) {
    return (
      <View style={styles.readOnly}>
        <Text style={styles.readOnlyText}>{value || "—"}</Text>
      </View>
    );
  }

  const dropdown =
    open && suggestions.length > 0
      ? createPortal(
          <View
            style={[
              styles.dropdown,
              {
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              },
            ]}
          >
            {suggestions.map((prediction, i) => (
              <Pressable
                key={i}
                style={({ hovered }: any) => [
                  styles.suggestionItem,
                  hovered && styles.suggestionItemHovered,
                ]}
                onPress={() => handleSelect(prediction)}
              >
                <Text style={styles.suggestionMain}>
                  {prediction.mainText?.text ?? prediction.text?.text ?? ""}
                </Text>
                {prediction.secondaryText?.text && (
                  <Text style={styles.suggestionSub}>
                    {prediction.secondaryText.text}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>,
          document.body,
        )
      : null;

  return (
    <View ref={containerRef} style={styles.container}>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        placeholder={placeholder}
        placeholderTextColor={colors.gray600}
        value={inputValue}
        onChangeText={handleChangeText}
        onFocus={() => {
          if (suggestions.length > 0) {
            measureContainer();
            setOpen(true);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        editable={!disabled}
        autoComplete="off"
      />
      {dropdown}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  input: {
    width: "100%",
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
    color: colors.black,
  },
  inputDisabled: {
    color: colors.gray400,
  },
  dropdown: {
    position: "fixed" as any,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 99999,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  suggestionItemHovered: {
    backgroundColor: colors.gray100,
  },
  suggestionMain: {
    ...textStyles.body4,
    color: colors.black,
    fontWeight: "500",
  },
  suggestionSub: {
    fontSize: 11,
    color: colors.gray500,
    marginLeft: 4,
  },
  readOnly: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  readOnlyText: {
    ...textStyles.body4,
    color: colors.black,
  },
});
