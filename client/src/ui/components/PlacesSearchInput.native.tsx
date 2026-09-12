import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { manualPlaceId } from "@/services/locations";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MiniMapView from "@/ui/components/MiniMapView";
import LocationIcon from "../../../assets/week_bar_location.svg";
import PlusIcon from "../../../assets/trip_add.svg";
import XIcon from "../../../assets/mobile_x.svg";
import SearchIcon from "../../../assets/search.svg";

export type PlaceResult = {
  name: string;
  placeId: string;
  latitude: number;
  longitude: number;
  address?: string;
  hasCoords: boolean;
};

interface PlacesSearchInputProps {
  value?: string;
  onSelect: (place: PlaceResult) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onRawInputChange?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  bordered?: boolean;
  initialCoords?: { lat: number; lng: number };
  cityContext?: string;
}


const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLCAES_API_KEY ?? "";

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

async function fetchSuggestions(input: string): Promise<Suggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({ input, languageCode: "ko" }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  return (data.suggestions ?? []).map((s: any) => ({
    placeId: s.placePrediction.placeId,
    mainText: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? "",
    secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
  }));
}

async function fetchPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number; address: string } | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "location,formattedAddress",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    latitude: data.location?.latitude ?? 0,
    longitude: data.location?.longitude ?? 0,
    address: data.formattedAddress ?? "",
  };
}

export default function PlacesSearchInput({
  value,
  onSelect,
  onClear,
  onFocus,
  onRawInputChange,
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
  bordered,
  initialCoords,
  cityContext,
}: PlacesSearchInputProps) {
  const [text, setText] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; name: string } | null>(
    initialCoords && value ? { ...initialCoords, name: value } : null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTypedRef = useRef(false);

  useEffect(() => {
    setText(value ?? "");
    if (!value) {
      setSuggestions([]);
      setShowList(false);
      setMapCoords(null);
    } else if (initialCoords && !userTypedRef.current) {
      setMapCoords({ ...initialCoords, name: value });
    }
  }, [value]);

  useEffect(() => {
    userTypedRef.current = false;
    if (initialCoords && value) {
      setMapCoords({ ...initialCoords, name: value });
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  const handleChangeText = useCallback((t: string) => {
    userTypedRef.current = true;
    setText(t);
    setMapCoords(null);
    onRawInputChange?.(t);
    setSearchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (t.trim().length === 0) {
      setSuggestions([]);
      setShowList(false);
      setLoading(false);
      return;
    }
    setShowList(true);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(cityContext ? `${cityContext} ${t}` : t);
        setSuggestions(results);
        setSearchError(false);
      } catch {
        setSuggestions([]);
        setSearchError(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [cityContext]);

  const handleSelect = async (suggestion: Suggestion) => {
    userTypedRef.current = false;
    setText(suggestion.mainText);
    setSuggestions([]);
    setShowList(false);
    const details = await fetchPlaceDetails(suggestion.placeId);
    const lat = details?.latitude ?? 0;
    const lng = details?.longitude ?? 0;
    setMapCoords({ lat, lng, name: suggestion.mainText });
    onSelect({
      name: suggestion.mainText,
      placeId: suggestion.placeId,
      latitude: lat,
      longitude: lng,
      address: details?.address,
      hasCoords: true,
    });
  };

  const handleManualSelect = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSuggestions([]);
    setShowList(false);
    setMapCoords(null);
    onSelect({
      name: trimmed,
      placeId: manualPlaceId(trimmed),
      latitude: 0,
      longitude: 0,
      hasCoords: false,
    });
  };

  const handleClear = () => {
    userTypedRef.current = false;
    setText("");
    setSuggestions([]);
    setShowList(false);
    setMapCoords(null);
    onClear?.();
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

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          onSubmitEditing={handleManualSelect}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor={colors.gray600}
          editable={!disabled}
          returnKeyType="search"
          style={[styles.textInput, bordered && styles.textInputBordered]}
        />
        <View style={styles.iconButton}>
          {loading ? (
            <ActivityIndicator size={14} color={colors.gray600} />
          ) : text.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <View style={styles.clearIcon}>
                <XIcon width={12} height={12} color={colors.white} />
              </View>
            </Pressable>
          ) : (
            <SearchIcon width={16} height={16} />
          )}
        </View>
      </View>

      {showList && (
        <View style={styles.listView}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.length > 0 && (
              <Text style={styles.listHeader}>검색 결과</Text>
            )}

            {!loading && searchError && (
              <Text style={styles.noResult}>
                검색을 사용할 수 없어요. 입력한 이름 그대로 저장할 수 있어요.
              </Text>
            )}

            {!loading && !searchError && suggestions.length === 0 && (
              <Text style={styles.noResult}>
                '{text.trim()}' 검색 결과가 없어요. 입력한 이름 그대로 저장할 수 있어요.
              </Text>
            )}

            {suggestions.map((item) => (
              <Pressable
                key={item.placeId}
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <LocationIcon width={16} height={16} style={styles.rowIcon} />
                <View style={styles.rowText}>
                  <Text style={styles.mainText} numberOfLines={1}>{item.mainText}</Text>
                  {!!item.secondaryText && (
                    <Text style={styles.subText} numberOfLines={1}>{item.secondaryText}</Text>
                  )}
                </View>
              </Pressable>
            ))}

            {text.trim().length > 0 && (
              <Pressable
                onPress={handleManualSelect}
                style={({ pressed }) => [styles.row, styles.manualRow, pressed && styles.rowPressed]}
              >
                <PlusIcon width={16} height={16} color={colors.primary} style={styles.rowIcon} />
                <View style={styles.rowText}>
                  <Text style={styles.manualText} numberOfLines={1}>
                    '{text.trim()}' 직접 입력
                  </Text>
                </View>
              </Pressable>
            )}

            <Text style={styles.footer}>© Google</Text>
          </ScrollView>
        </View>
      )}

      {mapCoords && (
        <MiniMapView latitude={mapCoords.lat} longitude={mapCoords.lng} name={mapCoords.name} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputWrapper: {
    position: "relative",
    zIndex: 10,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 40,
    fontFamily: textStyles.body4.fontFamily,
    fontSize: textStyles.body4.fontSize,
    lineHeight: 0,
    color: colors.black,
  },
  textInputBordered: {
    borderWidth: 1,
    borderColor: colors.gray400,
  },
  iconButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    zIndex: 1,
  },
  clearIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray400,
    justifyContent: "center",
    alignItems: "center",
  },
  listView: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginTop: 4,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: 220,
    zIndex: 100,
    padding: 4,
  },
  listHeader: {
    ...textStyles.h9,
    color: colors.gray600,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  noResult: {
    ...textStyles.body5,
    color: colors.gray600,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manualRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  rowPressed: {
    backgroundColor: colors.gray200,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  mainText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  subText: {
    ...textStyles.body6,
    color: colors.gray700,
    marginTop: 1,
  },
  manualText: {
    ...textStyles.h7,
    color: colors.primary,
  },
  footer: {
    ...textStyles.body6,
    color: colors.gray400,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    textAlign: "right",
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
