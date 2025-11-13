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
}

export default function WarningBanner({ 
  message, 
  visible, 
  duration = 5000,
  onHide 
}: WarningBannerProps) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (visible) {
      const slideDuration = 1000;
      
      // 나타나는 애니메이션 시작
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: slideDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: slideDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 나타나는 애니메이션이 완료된 후 duration만큼 머무르기
        if (duration > 0) {
          timer = setTimeout(() => {
            // 사라지는 애니메이션 시작
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: -60,
                duration: slideDuration,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: slideDuration,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onHide?.();
            });
          }, duration);
        }
      });
    } else {
      translateY.setValue(-60);
      opacity.setValue(0);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [visible, duration, onHide, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.banner,
        {
          transform: [{ translateY }],
          opacity,
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
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.gray700,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    zIndex: 10000,
    elevation: 10,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  text: {
    ...textStyles.body5,
    color: colors.white,
  },
});

