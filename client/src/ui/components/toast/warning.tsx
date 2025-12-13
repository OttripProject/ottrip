import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import WarnIcon from '../../../../assets/warn.svg';

interface WarningBannerProps {
  message: string;
  visible: boolean;
  duration?: number; // milliseconds
  onHide?: () => void;
  bottomOffset?: number; // 버튼 위로부터의 거리 (기본값: 44, undefined면 상단 고정)
}

export default function WarningBanner({ 
  message, 
  visible, 
  duration = 3000,
  onHide,
  bottomOffset = 70
}: WarningBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (visible) {
      // 나타나는 애니메이션
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // duration 후 사라지는 애니메이션
      timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide?.();
        });
      }, duration);
    } else {
      opacity.setValue(0);
      scale.setValue(0.8);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [visible, duration, onHide, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.banner,
        {
          opacity,
          transform: [{ scale }],
          ...(bottomOffset !== undefined ? { bottom: bottomOffset } : { top: 0 }),
        }
      ]}
    >
      <WarnIcon width={16} height={16} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.gray700,
    height: 40,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    zIndex: 99999, // 제일 위에 표시
    elevation: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    ...textStyles.body5,
    color: colors.white,
  },
});

