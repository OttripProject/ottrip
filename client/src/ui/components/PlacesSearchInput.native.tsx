import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MiniMapView from "@/ui/components/MiniMapView";
import LocationIcon from "../../../assets/week_bar_location.svg";
import XIcon from "../../../assets/mobile_x.svg";
import SearchIcon from "../../../assets/search.svg";

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

const manualPlaceId = (name: string) => {
  const nameHash = [...name].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0).toString(16);
  const rand = Math.random().toString(16).slice(2, 10);
  return `m_${nameHash}_${rand}`;
};

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
  if (!res.ok) return [];
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
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
  initialCoords,
}: PlacesSearchInputProps) {
  const [text, setText] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showList, setShowList] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; name: string } | null>(
    initialCoords && value ? { ...initialCoords, name: value } : null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value ?? "");
    if (!value) {
      setSuggestions([]);
      setShowList(false);
      setMapCoords(null);
    }
  }, [value]);

  useEffect(() => {
    if (initialCoords && value) {
      setMapCoords({ ...initialCoords, name: value });
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  const handleChangeText = useCallback((t: string) => {
    setText(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (t.length === 0) {
      setSuggestions([]);
      setShowList(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(t);
      setSuggestions(results);
      setShowList(results.length > 0);
    }, 350);
  }, []);

  const handleSelect = async (suggestion: Suggestion) => {
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
      fromGoogle: true,
    });
  };

  const handleClear = () => {
    setText("");
    setSuggestions([]);
    setShowList(false);
    setMapCoords(null);
    onClear?.();
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSuggestions([]);
    setShowList(false);
    onSelect({
      name: trimmed,
      placeId: manualPlaceId(trimmed),
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

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.gray600}
          editable={!disabled}
          returnKeyType="search"
          style={styles.textInput}
        />
        <View style={styles.iconButton}>
          {text.length > 0 ? (
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
            {suggestions.map((item, index) => (
              <View key={item.placeId}>
                <Pressable onPress={() => handleSelect(item)} style={styles.row}>
                  <LocationIcon width={16} height={16} style={{ marginTop: 2 }} />
                  <View style={styles.rowText}>
                    <Text style={styles.mainText} numberOfLines={1}>{item.mainText}</Text>
                    {!!item.secondaryText && (
                      <Text style={styles.subText} numberOfLines={1}>{item.secondaryText}</Text>
                    )}
                  </View>
                </Pressable>
                {index < suggestions.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
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
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  separator: {
    height: 1,
    backgroundColor: colors.gray300,
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
