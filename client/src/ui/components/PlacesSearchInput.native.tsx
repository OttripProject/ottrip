import { colors, radii, spacing, textStyles } from "@/ui/tokens";
import { StyleSheet, Text, TextInput, View } from "react-native";

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
  placeholder = "장소를 검색하세요.",
  disabled,
  readOnly,
}: PlacesSearchInputProps) {
  if (readOnly) {
    return (
      <View style={styles.readOnly}>
        <Text style={styles.readOnlyText}>{value || "—"}</Text>
      </View>
    );
  }

  return (
    <TextInput
      style={styles.input}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.gray400}
      editable={!disabled}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    ...textStyles.body4,
    color: colors.black,
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
