import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import GradientBackground from '../ui/components/GradientBackground';
import { colors } from '../ui/tokens/colors';       
import { textStyles } from '../ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';

export default function LandingScreen() {
  const navigation = useNavigation();
  const rotateAnim1 = useRef(new Animated.Value(0)).current; 
  const rotateAnim2 = useRef(new Animated.Value(0)).current;
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const startRotation = () => {
      rotateAnim1.setValue(0);
      Animated.timing(rotateAnim1, {
        toValue: 1,
        duration: 40000,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          startRotation();
        }
      });
    };
    startRotation();
    return () => {
      rotateAnim1.stopAnimation();
    };
  }, [rotateAnim1]);

  useEffect(() => {
    const startRotation = () => {
      rotateAnim2.setValue(0);
      Animated.timing(rotateAnim2, {
        toValue: 1,
        duration: 60000, 
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          startRotation();
        }
      });
    };
    startRotation();
    return () => {
      rotateAnim2.stopAnimation();
    };
  }, [rotateAnim2]);

  const rotate1 = rotateAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotate2 = rotateAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const svgSize = 480; 
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const squareSize1 = 350; 
  const squareSize2 = 380; 
  const strokeWidth1 = 8; 
  const strokeWidth2 = 15;
  
  const createSquarePath = (size: number) => {
    const half = size / 2;
    const topLeft = { x: centerX - half, y: centerY - half };
    const topRight = { x: centerX + half, y: centerY - half };
    const bottomRight = { x: centerX + half, y: centerY + half };
    const bottomLeft = { x: centerX - half, y: centerY + half };
    
    return `M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} L ${bottomLeft.x} ${bottomLeft.y} Z`;
  };
  
  const squarePath1 = createSquarePath(squareSize1);
  const squarePath2 = createSquarePath(squareSize2); 

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.contentWrapper}>
          <Animated.View
            style={[
              styles.rotatingCircleWrapper,
              {
                transform: [{ rotate: rotate1 }],
              },
            ]}
          >
            <Svg width={480} height={480} style={styles.svg}>
              <Path
                d={squarePath1}
                fill="none"
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth={strokeWidth1}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.rotatingCircleWrapper,
              {
                transform: [{ rotate: rotate2 }],
              },
            ]}
          >
            <Svg width={480} height={480} style={styles.svg}>
              <Path
                d={squarePath2}
                fill="none"
                stroke="rgba(255, 255, 255, 0.7)"
                strokeWidth={strokeWidth2}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>OTTRIP</Text>
              <Text style={styles.description}>여행 계획을 더 스마트하게</Text>
            <Text style={styles.subDescription}>
              AI 기반 여행 일정 관리로 더 나은 여행을 계획하세요
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[
            styles.button,
            isHovered && styles.buttonHovered,
          ]}
          onPress={() => navigation.navigate('로그인' as never)}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          } as any)}
        >
          <Text style={[
            styles.buttonText,
            isHovered && styles.buttonTextHovered,
          ]}>여행 시작하기</Text>
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
    width: 480,
    height: 480,
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
    fontSize: 56,
    color: colors.gray900,
    letterSpacing: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: spacing.xl,
  },
  description: {
    ...textStyles.h3,
    color: colors.gray800,
    textAlign: 'center',
  },
  subDescription: {
    ...textStyles.body2,
    textAlign: 'center',
    color: colors.gray800,
    lineHeight: 22,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: 30,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonHovered: {
    backgroundColor: colors.black,
  },
  buttonText: {
    ...textStyles.h5,
    color: colors.gray800,
  },
  buttonTextHovered: {
    color: colors.white,
  },
});
