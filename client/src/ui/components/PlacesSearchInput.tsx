import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useLoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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
    <div style={{ position: "relative", width: "100%" }}>
      <style>{`input.places-input::placeholder { color: ${colors.gray600}; }`}</style>
      <input
        className="places-input"
        style={inputStyle(disabled)}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={dropdownStyle}>
          {suggestions.map((prediction, i) => (
            <div
              key={i}
              style={suggestionItemStyle}
              onMouseDown={() => handleSelect(prediction)}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLDivElement).style.backgroundColor =
                  colors.gray100)
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLDivElement).style.backgroundColor =
                  "white")
              }
            >
              <span style={{ fontSize: 13, color: colors.black, fontWeight: 500 }}>
                {prediction.mainText?.text ?? prediction.text?.text ?? ""}
              </span>
              {prediction.secondaryText?.text && (
                <span
                  style={{ fontSize: 11, color: colors.gray500, marginLeft: 4 }}
                >
                  {prediction.secondaryText.text}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    height: 40,
    backgroundColor: colors.gray200,
    border: "none",
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: textStyles.body4.fontSize,
    lineHeight: `${textStyles.body4.lineHeight}px`,
    fontFamily: textStyles.body4.fontFamily as string,
    color: disabled ? colors.gray400 : colors.black,
    outline: "none",
  };
}

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  backgroundColor: "white",
  borderRadius: radii.md,
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  zIndex: 9999,
  overflow: "hidden",
};

const suggestionItemStyle: React.CSSProperties = {
  padding: "10px 14px",
  cursor: "pointer",
  backgroundColor: "white",
  transition: "background-color 0.1s",
};

const styles = StyleSheet.create({
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
