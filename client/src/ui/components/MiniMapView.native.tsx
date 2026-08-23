import { colors, radii } from "@/ui/tokens";
import { useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MiniMapViewProps {
  latitude: number;
  longitude: number;
  name?: string;
}

const MIN_DELTA = 0.001;
const MAX_DELTA = 0.04;

export default function MiniMapView({ latitude, longitude, name }: MiniMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const [delta, setDelta] = useState(0.005);

  if (!latitude && !longitude) return null;

  const zoomIn = () => {
    const next = Math.max(delta / 2, MIN_DELTA);
    setDelta(next);
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: next, longitudeDelta: next },
      200,
    );
  };

  const zoomOut = () => {
    const next = Math.min(delta * 2, MAX_DELTA);
    setDelta(next);
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: next, longitudeDelta: next },
      200,
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{ latitude, longitude, latitudeDelta: delta, longitudeDelta: delta }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} title={name} />
      </MapView>

      <View style={styles.zoomButtons}>
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
          onPress={zoomIn}
          hitSlop={4}
        >
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
          onPress={zoomOut}
          hitSlop={4}
        >
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.linkBtn}
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
          )
        }
      >
        <Text style={styles.linkBtnText}>큰 지도 ↗</Text>
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
  zoomButtons: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  zoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnPressed: {
    backgroundColor: colors.gray200,
  },
  zoomBtnText: {
    fontSize: 16,
    color: colors.gray700,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.gray300,
  },
  linkBtn: {
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
  linkBtnText: {
    fontSize: 11,
    color: colors.gray700,
  },
});
