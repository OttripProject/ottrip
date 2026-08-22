import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import type { GooglePlacesAutocompleteRef } from "react-native-google-places-autocomplete";
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

export default function PlacesSearchInput({
  value,
  onSelect,
  onClear,
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
  initialCoords,
}: PlacesSearchInputProps) {
  const acRef = useRef<GooglePlacesAutocompleteRef>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; name: string } | null>(
    initialCoords && value ? { ...initialCoords, name: value } : null,
  );
  const [isClearable, setIsClearable] = useState(!!value);

  useEffect(() => {
    acRef.current?.setAddressText(value ?? "");
    setIsClearable(!!value);
    if (!value) setMapCoords(null);
  }, [value]);

  useEffect(() => {
    if (initialCoords && value) {
      setMapCoords({ ...initialCoords, name: value });
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  const handleClear = () => {
    acRef.current?.clear();
    setMapCoords(null);
    setIsClearable(false);
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
      <View style={styles.autocompleteWrapper}>
        <GooglePlacesAutocomplete
          ref={acRef}
          placeholder={placeholder}
          fetchDetails
          onPress={(data, details) => {
            if (!details) return;
            const lat = details.geometry.location.lat;
            const lng = details.geometry.location.lng;
            const name = data.structured_formatting.main_text || data.description;
            setMapCoords({ lat, lng, name });
            setIsClearable(true);
            onSelect({
              name,
              placeId: data.place_id,
              latitude: lat,
              longitude: lng,
              address: details.formatted_address,
              fromGoogle: true,
            });
          }}
          query={{ key: apiKey, language: "ko" }}
          enablePoweredByContainer={false}
          minLength={1}
          debounce={350}
          keyboardShouldPersistTaps="handled"
          listViewDisplayed="auto"
          disableScroll
          textInputProps={{
            editable: !disabled,
            placeholderTextColor: colors.gray600,
            clearButtonMode: "never",
            style: styles.textInput,
            onChangeText: (text) => setIsClearable(text.length > 0),
            onSubmitEditing: (e) => {
              const text = e.nativeEvent.text.trim();
              if (!text) return;
              setMapCoords(null);
              setIsClearable(true);
              onSelect({
                name: text,
                placeId: manualPlaceId(text),
                latitude: 0,
                longitude: 0,
                fromGoogle: false,
              });
            },
            returnKeyType: "search",
          }}
          renderRightButton={() => (
            <View style={styles.iconButton}>
              {isClearable ? (
                <Pressable onPress={handleClear} hitSlop={8}>
                  <View style={styles.clearIcon}>
                    <XIcon
                      width={12}
                      height={12}
                      color={colors.white}
                    />
                  </View>
                </Pressable>
              ) : (
                <SearchIcon width={16} height={16} />
              )}
            </View>
          )}
          styles={{
            container: { flex: 0 },
            textInputContainer: styles.textInputContainer,
            textInput: styles.textInput,
            listView: styles.listView,
            row: styles.row,
            description: styles.description,
            separator: styles.separator,
            poweredContainer: { display: "none" } as any,
          }}
          renderRow={(data) => (
            <View style={styles.rowContent}>
              <LocationIcon width={16} height={16} style={{ marginTop: 2 }} />
              <View style={styles.rowText}>
                <Text style={styles.mainText} numberOfLines={1}>
                  {data.structured_formatting.main_text}
                </Text>
                {!!data.structured_formatting.secondary_text && (
                  <Text style={styles.subText} numberOfLines={1}>
                    {data.structured_formatting.secondary_text}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      </View>
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
  autocompleteWrapper: {
    zIndex: 10,
  },
  textInputContainer: {
    height: 44,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 40,
    fontFamily: textStyles.body4.fontFamily,
    fontSize: textStyles.body4.fontSize,
    lineHeight: 0,
    color: colors.black,
    marginBottom: 0,
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
  },
  row: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: "auto" as any,
    backgroundColor: "transparent",
  },
  rowContent: {
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
  description: {
    ...textStyles.body4,
    color: colors.gray900,
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
