import { View, Text, StyleSheet } from "react-native";

export default function CreateTripScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Trip – Coming soon…</Text>
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
  },
});
