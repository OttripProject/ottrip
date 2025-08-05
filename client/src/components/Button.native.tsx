import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface Props {
  title: string;
  onPress?: () => void;
}

export default function Button({ title, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#3478f6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  label: { color: "#fff", fontWeight: "600" },
});
