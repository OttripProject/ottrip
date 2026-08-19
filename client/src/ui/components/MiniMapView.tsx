import { colors, radii } from "@/ui/tokens";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  name?: string;
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

export default function MiniMapView({ latitude, longitude, name }: MiniMapViewProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? "";
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });
  const center = useMemo(() => ({ lat: latitude, lng: longitude }), [latitude, longitude]);

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  if (!apiKey || !isLoaded) return null;

  return (
    <Pressable onPress={openInMaps} style={styles.container}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={15}
        options={{
          disableDefaultUI: true,
          gestureHandling: "none",
          clickableIcons: false,
        }}
      >
        <Marker position={center} title={name} />
      </GoogleMap>
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>지도에서 보기</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 140,
    borderRadius: radii.md,
    overflow: "hidden",
    position: "relative",
    marginTop: 8,
  },
  overlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  overlayText: {
    fontSize: 11,
    color: colors.gray700,
  },
});
