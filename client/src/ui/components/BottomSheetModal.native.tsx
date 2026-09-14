import { colors } from "@/ui/tokens/colors";
import { type ReactNode, useEffect } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: number; // 0~1 사이의 비율 또는 픽셀 값
  dragThreshold?: number;
  maxUpwardDrag?: number;
  showDragHandle?: boolean;
  backdropOpacity?: number;
}

const DEFAULT_DRAG_THRESHOLD = 80;
const DEFAULT_MAX_UPWARD_DRAG = 50;
const DEFAULT_MODAL_HEIGHT = Dimensions.get("window").height * 0.5;

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  height = DEFAULT_MODAL_HEIGHT,
  dragThreshold = DEFAULT_DRAG_THRESHOLD,
  maxUpwardDrag = DEFAULT_MAX_UPWARD_DRAG,
  showDragHandle = true,
  backdropOpacity = 0.5,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();
  const modalHeight =
    typeof height === "number" && height <= 1
      ? Dimensions.get("window").height * height
      : height;

  const slidePosition = useSharedValue(modalHeight);
  const dragOffset = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragOffset.value = 0;
      slidePosition.value = withSpring(0, {
        damping: 30,
        stiffness: 80,
        mass: 0.8,
      });
    } else {
      slidePosition.value = withTiming(modalHeight, { duration: 250 });
    }
  }, [visible, modalHeight]);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      const clamped = Math.max(-maxUpwardDrag, e.translationY);
      dragOffset.value = clamped;
    })
    .onEnd(e => {
      if (e.translationY > dragThreshold || e.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        dragOffset.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const totalTranslateY = slidePosition.value + dragOffset.value;
    const clampedTranslateY = Math.max(0, totalTranslateY);

    return {
      transform: [{ translateY: clampedTranslateY }],
    };
  });

  const handleBackdropPress = () => {
    dragOffset.value = 0;
    slidePosition.value = withTiming(
      modalHeight,
      { duration: 250 },
      finished => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 배경 오버레이 */}
        <Pressable
          style={[
            styles.backdrop,
            { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` },
          ]}
          onPress={handleBackdropPress}
        />

        {/* 모달 컨텐츠 */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.modalContent,
              { height: modalHeight },
              animatedStyle,
            ]}
          >
            <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              {/* 드래그 핸들 */}
              {showDragHandle && (
                <View style={styles.dragHandleContainer}>
                  <View style={styles.dragHandle} />
                </View>
              )}
              {/* 컨텐츠 */}
              <View style={styles.content}>{children}</View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get("window").height * 0.94,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 4,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
  },
  content: {
    flex: 1,
  },
});
