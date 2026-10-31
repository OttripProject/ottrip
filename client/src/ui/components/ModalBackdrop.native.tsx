import { colors } from "@/ui/tokens/colors";
import { blurs } from "@/ui/tokens/surfaces";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";

interface ModalBackdropProps {
  onPress?: () => void;
}

export default function ModalBackdrop({ onPress }: ModalBackdropProps) {
  const layers = (
    <>
      <BlurView
        intensity={blurs.modalBackdrop}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.dim} />
    </>
  );

  if (onPress) {
    return (
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
        {layers}
      </Pressable>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlayDim,
  },
});
