import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import Svg, { Path } from 'react-native-svg';
import GradientBackground from '../ui/components/GradientBackground';
import { colors } from '../ui/tokens/colors';       
import { textStyles } from '../ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';

export default function LandingScreen() {
  const navigation = useNavigation();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 무한 회전 애니메이션
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 원의 중심과 반지름
  const svgSize = 320; // SVG 크기를 더 크게
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const radius = 138;
  const strokeWidth = 15;
  
  // 2개의 호 세그먼트 (끊기게)
  const segments = 2;
  const gapAngle = 20; // 끊기는 각도
  const segmentAngle = (360 - gapAngle) / segments; // 각 세그먼트의 각도
  
  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = (startAngle * Math.PI) / 180;
    const end = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    const largeArcFlag = end - start > Math.PI ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };
  
  // 호 세그먼트만 생성 (직선 없이)
  const arcPaths = Array.from({ length: segments }).map((_, index) => {
    const startAngle = index * (segmentAngle + gapAngle) - 90; // -90도부터 시작 (상단)
    const endAngle = startAngle + segmentAngle;
    return createArcPath(startAngle, endAngle);
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.contentWrapper}>
          <Animated.View
            style={[
              styles.rotatingCircleWrapper,
              {
                transform: [{ rotate }],
              },
            ]}
          >
            <Svg width={320} height={320} style={styles.svg}>
              {arcPaths.map((path, index) => (
                <Path
                  key={index}
                  d={path}
                  fill="none"
                  stroke="rgba(255, 255, 255)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="square"
                />
              ))}
            </Svg>
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>OTTRIP</Text>
            <Text style={styles.description}>
              여행 계획을 더 스마트하게
            </Text>
            <Text style={styles.subDescription}>
              AI 기반 여행 일정 관리로 더 나은 여행을 계획하세요
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('로그인' as never)}
        >
          <Text style={styles.buttonText}>여행 시작하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg+4,
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl']+8,
  },
  rotatingCircleWrapper: {
    position: 'absolute',
    width: 320,
    height: 320,
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    ...textStyles.h2,
    fontSize: 48,
    marginBottom: spacing.xl,
    color: colors.gray900,
  },
  description: {
    ...textStyles.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.gray800,
  },
  subDescription: {
    ...textStyles.body2,
    textAlign: 'center',
    color: colors.gray800,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: radii.base,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
