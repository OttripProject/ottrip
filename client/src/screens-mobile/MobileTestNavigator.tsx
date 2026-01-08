import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/ui/tokens/colors';
import TodayScreen from './TodayScreen.native';
import WeeklyScreen from './WeeklyScreen.native';
import ProfileScreen from './ProfileScreen.native';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

let previousTabIndex: number | null = null;
let isInitialMount = true;

function SlideScreenWrapper({ 
  children, 
  screenIndex,
  screenName 
}: { 
  children: React.ReactNode; 
  screenIndex: number;
  screenName: string;
}) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const hasAnimated = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isInitialMount && screenIndex === 0) {
        isInitialMount = false;
        previousTabIndex = screenIndex;
        translateX.value = 0;
        opacity.value = 1;
        hasAnimated.current = true;
        return;
      }

      if (previousTabIndex === null || previousTabIndex === screenIndex) {
        if (previousTabIndex === null) {
          previousTabIndex = screenIndex;
        }
        return;
      }

      const direction = screenIndex > previousTabIndex ? 1 : -1;
      
      translateX.value = direction * 50;
      opacity.value = 0.5;
      
      translateX.value = withSpring(0, {
        damping: 18,
        stiffness: 100,
        mass: 0.7,
      });
      
      opacity.value = withTiming(1, {
        duration: 250,
      });

      previousTabIndex = screenIndex;
      hasAnimated.current = true;
    }, [translateX, opacity, screenIndex])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View
        style={[
          styles.screenContainer,
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function TodayScreenWithAnimation() {
  return (
    <SlideScreenWrapper screenIndex={0} screenName="Today">
      <TodayScreen />
    </SlideScreenWrapper>
  );
}

function WeeklyScreenWithAnimation() {
  return (
    <SlideScreenWrapper screenIndex={1} screenName="Weekly">
      <WeeklyScreen />
    </SlideScreenWrapper>
  );
}

function ProfileScreenWithAnimation() {
  return (
    <SlideScreenWrapper screenIndex={2} screenName="Profile">
      <ProfileScreen />
    </SlideScreenWrapper>
  );
}

export default function MobileTestNavigator() {
  return (
    <View style={styles.navigatorContainer}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          lazy: true, // 탭을 필요할 때만 로드하여 초기 로딩 최적화
          tabBarActiveTintColor: colors.gray900,
          tabBarInactiveTintColor: colors.gray600,
          tabBarStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.5)',
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 88 : 64,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
      <Tab.Screen
        name="Today"
        component={TodayScreenWithAnimation}
        options={{
          tabBarLabel: '오늘',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Weekly"
        component={WeeklyScreenWithAnimation}
        options={{
          tabBarLabel: '여행 일정',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreenWithAnimation}
        options={{
          tabBarLabel: '프로필',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  navigatorContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.white,
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.white,
  },
});

