import { View, Text, StyleSheet } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

// Generic type for route param; will refine later
interface TripDetailParams {
  TripDetail: { tripId: number };
}

type TripDetailRouteProp = RouteProp<TripDetailParams, "TripDetail">;

export default function TripDetailScreen() {
  const route = useRoute<TripDetailRouteProp>();
  const { tripId } = route.params ?? { tripId: undefined };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Trip Detail – Coming Soon…</Text>
      {tripId != null && (
        <Text style={styles.textSecondary}>tripId: {tripId}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  textSecondary: {
    fontSize: 14,
    color: "gray",
  },
});
