import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useLoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

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

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        placeholder={placeholder}
        placeholderTextColor={colors.gray600}
        value={inputValue}
        onChangeText={handleChangeText}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        editable={!disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <View style={styles.dropdown}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
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
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 9999,
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
