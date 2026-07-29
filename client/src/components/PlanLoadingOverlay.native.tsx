import { colors } from "@/ui/tokens/colors";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import FlightIcon from "../../assets/airplane.svg";

interface PlanLoadingOverlayProps {
  visible: boolean;
}

export default function PlanLoadingOverlay({ visible }: PlanLoadingOverlayProps) {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const dot4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    dot1Anim.setValue(0);
    dot2Anim.setValue(0);
    dot3Anim.setValue(0);
    dot4Anim.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot4Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(dot1Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dot4Anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [visible, dot1Anim, dot2Anim, dot3Anim, dot4Anim]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.iconWrapper}>
        <FlightIcon width={36} height={36} color={colors.primary} />
      </View>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot4Anim }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 100,
  },
  iconWrapper: {
    transform: [{ rotate: "45deg" }],
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
