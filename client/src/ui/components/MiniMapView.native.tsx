import { colors, radii } from "@/ui/tokens";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  name?: string;
}

export default function MiniMapView({ latitude, longitude, name }: MiniMapViewProps) {
  if (!latitude && !longitude) return null;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} title={name} />
      </MapView>
      <Pressable
        style={styles.overlay}
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
          )
        }
      >
        <Text style={styles.overlayText}>큰 지도 ↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 140,
    borderRadius: radii.md,
    overflow: "hidden",
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  overlayText: {
    fontSize: 11,
    color: colors.gray700,
  },
});
