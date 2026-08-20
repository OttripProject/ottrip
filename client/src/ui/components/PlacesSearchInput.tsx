import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import MiniMapView from "@/ui/components/MiniMapView";
import { useLoadScript } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

export type PlaceResult = {
  name: string;
  placeId: string;
  latitude: number;
  longitude: number;
  address?: string;
  fromGoogle: boolean;
};

interface PlacesSearchInputProps {
  value?: string;
  onSelect: (place: PlaceResult) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  initialCoords?: { lat: number; lng: number };
}

const PIN_ICON = (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
    <path d="M5.10368 5.83333C5.10368 4.78629 5.95247 3.9375 6.99951 3.9375C8.04655 3.9375 8.89534 4.78629 8.89534 5.83333C8.89534 6.88037 8.04655 7.72917 6.99951 7.72917C5.95247 7.72917 5.10368 6.88037 5.10368 5.83333Z" fill={colors.success} />
    <path fillRule="evenodd" clipRule="evenodd" d="M2.20075 5.17848C2.4012 2.74659 4.43341 0.875 6.87354 0.875H7.12551C9.56564 0.875 11.5979 2.74659 11.7983 5.17848C11.9062 6.48782 11.5018 7.78796 10.6702 8.80502L7.8742 12.2244C7.42213 12.7773 6.57692 12.7773 6.12485 12.2244L3.3289 8.80502C2.49727 7.78796 2.09282 6.48782 2.20075 5.17848ZM6.99951 3.0625C5.46922 3.0625 4.22868 4.30304 4.22868 5.83333C4.22868 7.36362 5.46922 8.60417 6.99951 8.60417C8.5298 8.60417 9.77034 7.36362 9.77034 5.83333C9.77034 4.30304 8.5298 3.0625 6.99951 3.0625Z" fill={colors.success} />
  </svg>
);

const PLUS_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
    <path d="M7.99972 2.06836C8.33109 2.06836 8.59971 2.33699 8.59971 2.66836V7.40169H13.333C13.6644 7.40169 13.933 7.67032 13.933 8.00169C13.933 8.33306 13.6644 8.60169 13.333 8.60169H8.59971V13.335C8.59971 13.6664 8.33109 13.935 7.99972 13.935C7.66835 13.935 7.39972 13.6664 7.39972 13.335V8.60169H2.6664C2.33503 8.60169 2.06641 8.33306 2.06641 8.00169C2.06641 7.67032 2.33503 7.40169 2.6664 7.40169H7.39972V2.66836C7.39972 2.33699 7.66835 2.06836 7.99972 2.06836Z" fill="currentColor" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.66704 1.3999C3.75835 1.3999 1.40039 3.75787 1.40039 6.66657C1.40039 9.57527 3.75835 11.9332 6.66704 11.9332C7.90523 11.9332 9.04363 11.5059 9.94282 10.7908L13.2428 14.0908C13.4772 14.3251 13.8571 14.3251 14.0914 14.0908C14.3257 13.8565 14.3257 13.4766 14.0914 13.2423L10.7913 9.94223C11.5064 9.04306 11.9337 7.90471 11.9337 6.66657C11.9337 3.75787 9.57573 1.3999 6.66704 1.3999ZM2.60039 6.66657C2.60039 4.42061 4.42109 2.5999 6.66704 2.5999C8.91299 2.5999 10.7337 4.42061 10.7337 6.66657C10.7337 8.91253 8.91299 10.7332 6.66704 10.7332C4.42109 10.7332 2.60039 8.91253 2.60039 6.66657Z" fill="#9B9B9B" />
  </svg>
);

export default function PlacesSearchInput({
  value,
  onSelect,
  onClear,
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
  initialCoords,
}: PlacesSearchInputProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });
  const [inputValue, setInputValue] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; name: string } | null>(
    initialCoords && value ? { ...initialCoords, name: value } : null,
  );
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<View>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    setInputValue(value ?? "");
    setMapCoords(prev => {
      if (!value) return null;
      if (prev && prev.name === value) return prev;
      if (initialCoords) return { ...initialCoords, name: value };
      return null;
    });
  }, [value, initialCoords?.lat, initialCoords?.lng]);

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
    setLoading(true);
    try {
      const { AutocompleteSuggestion } = await (google.maps as any).importLibrary("places");
      const { suggestions: results } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input });
      setSuggestions(results.map((s: any) => s.placePrediction));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (val: string) => {
    setInputValue(val);
    setMapCoords(null);
    measureContainer();
    setOpen(true);
    if (val === "") {
      setSuggestions([]);
      onClear?.();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelectSuggestion = async (prediction: any) => {
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "location", "formattedAddress", "id"],
    });
    const name: string = place.displayName ?? place.formattedAddress ?? "";
    const lat = place.location?.lat() ?? 0;
    const lng = place.location?.lng() ?? 0;
    setInputValue(name);
    setSuggestions([]);
    setOpen(false);
    setMapCoords({ lat, lng, name });
    onSelectRef.current({
      name,
      placeId: place.id ?? "",
      latitude: lat,
      longitude: lng,
      address: place.formattedAddress ?? undefined,
      fromGoogle: true,
    });
  };

  const handleManualSelect = () => {
    if (!inputValue.trim()) return;
    setSuggestions([]);
    setOpen(false);
    setMapCoords(null);
    onSelectRef.current({
      name: inputValue.trim(),
      placeId: "",
      latitude: 0,
      longitude: 0,
      fromGoogle: false,
    });
  };

  if (readOnly) {
    return (
      <View>
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyText}>{value || "—"}</Text>
        </View>
        {mapCoords && (
          <MiniMapView latitude={mapCoords.lat} longitude={mapCoords.lng} name={mapCoords.name} />
        )}
      </View>
    );
  }

  const showDropdown = open && (suggestions.length > 0 || inputValue.trim().length > 0);

  const dropdown = showDropdown
    ? createPortal(
        <div style={{ ...css.dropdown, top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}>
          {suggestions.length > 0 && (
            <div style={css.header}>검색 결과 · {suggestions.length}</div>
          )}
          {suggestions.map((prediction, i) => (
            <div
              key={i}
              style={css.item}
              onMouseDown={() => handleSelectSuggestion(prediction)}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = colors.gray200)}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
            >
              <span style={css.iconWrap}>{PIN_ICON}</span>
              <div style={css.textWrap}>
                <div style={css.mainText}>
                  {prediction.mainText?.text ?? prediction.text?.text ?? ""}
                </div>
                {prediction.secondaryText?.text && (
                  <div style={css.subText}>{prediction.secondaryText.text}</div>
                )}
              </div>
            </div>
          ))}
          {inputValue.trim().length > 0 && (
            <div
              style={{ ...css.item, alignItems: "center", padding: "12px 12px 8px" }}
              onMouseDown={handleManualSelect}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = colors.gray200)}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
            >
              <span style={{ ...css.iconWrap, color: colors.primary, paddingTop: 0 }}>
                {PLUS_ICON}
              </span>
              <div style={css.textWrap}>
                <div style={{ ...css.mainText, color: colors.primary }}>
                  '{inputValue.trim()}' 직접 입력
                </div>
              </div>
            </div>
          )}
          <div style={css.footer}>© Google</div>
        </div>,
        document.body,
      )
    : null;

  return (
    <View ref={containerRef} style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray600}
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (!mapCoords && (suggestions.length > 0 || inputValue.trim().length > 0)) {
              measureContainer();
              setOpen(true);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          editable={!disabled}
          autoComplete="off"
        />
        <View style={styles.iconContainer} pointerEvents="none">
          {loading ? (
            <ActivityIndicator size={14} color={colors.gray600} />
          ) : (
            SEARCH_ICON
          )}
        </View>
      </View>
      {mapCoords && (
        <MiniMapView
          latitude={mapCoords.lat}
          longitude={mapCoords.lng}
          name={mapCoords.name}
        />
      )}
      {dropdown}
    </View>
  );
}

const css: Record<string, React.CSSProperties> = {
  dropdown: {
    position: "fixed",
    maxHeight: 300,
    overflowY: "auto",
    background: colors.white,
    border: `1px solid ${colors.gray300}`,
    borderRadius: 12,
    boxShadow: "rgba(15, 20, 30, 0.1) 0px 10px 30px",
    padding: 4,
    boxSizing: "border-box",
    zIndex: 99999,
  },
  header: {
    font: `600 11px / 16px Pretendard`,
    color: colors.gray600,
    letterSpacing: "0.14em",
    padding: "8px 12px 4px",
  },
  item: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    background: "transparent",
  },
  iconWrap: {
    width: 24,
    flex: "0 0 auto",
    display: "inline-flex",
    justifyContent: "center",
    paddingTop: 4,
  },
  textWrap: {
    flex: "1 1 0%",
    minWidth: 0,
  },
  mainText: {
    font: `600 13px / 20px Pretendard`,
    color: colors.gray900,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  subText: {
    font: `400 11px / 16px Pretendard`,
    color: colors.gray700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footer: {
    font: `400 11px / 16px Pretendard`,
    color: colors.gray400,
    padding: "4px 12px 8px",
    textAlign: "right",
  },
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  input: {
    width: "100%",
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: 36,
    paddingVertical: spacing.md,
    ...textStyles.body4,
    color: colors.black,
  },
  inputDisabled: {
    color: colors.gray400,
  },
  iconContainer: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 20,
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
