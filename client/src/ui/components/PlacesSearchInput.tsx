import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { useLoadScript } from "@react-google-maps/api";
import { useEffect, useRef } from "react";
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
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
}: PlacesSearchInputProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !apiKey) return;

    let element: HTMLElement | null = null;
    let mounted = true;
    let removeHandler: (() => void) | null = null;

    (async () => {
      const { PlaceAutocompleteElement } = await (
        google.maps as any
      ).importLibrary("places");
      if (!mounted || !containerRef.current) return;

      element = new PlaceAutocompleteElement() as HTMLElement;

      const handleSelect = async (event: any) => {
        const { place } = event;
        await place.fetchFields({
          fields: ["displayName", "location", "formattedAddress", "id"],
        });
        if (!mounted) return;
        onSelectRef.current({
          name: place.displayName ?? place.formattedAddress ?? "",
          placeId: place.id ?? "",
          latitude: place.location?.lat() ?? 0,
          longitude: place.location?.lng() ?? 0,
          address: place.formattedAddress ?? undefined,
        });
      };

      element.addEventListener("gmp-placeselect", handleSelect);
      removeHandler = () =>
        element!.removeEventListener("gmp-placeselect", handleSelect);
      containerRef.current.appendChild(element);
    })();

    return () => {
      mounted = false;
      removeHandler?.();
      element?.remove();
    };
  }, [isLoaded, apiKey]);

  if (readOnly) {
    return (
      <View style={styles.readOnly}>
        <Text style={styles.readOnlyText}>{value || "—"}</Text>
      </View>
    );
  }

  if (!apiKey) {
    return (
      <input
        style={inputStyle(disabled)}
        placeholder={placeholder}
        defaultValue={value}
        disabled={disabled}
        autoComplete="off"
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <div ref={containerRef} style={{ width: "100%" }} />
    </View>
  );
}

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 40,
    backgroundColor: colors.gray200,
    border: "none",
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    fontSize: 13,
    color: disabled ? colors.gray400 : colors.black,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
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
