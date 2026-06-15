import { SelectedPlanProvider } from "@/contexts/SelectedPlanContext";
import { colors } from "@/ui/tokens/colors";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import React, { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import CalendarSelectedIcon from "../../assets/mobile_calendar_black.svg";
import CalendarUnselectedIcon from "../../assets/mobile_calendar_white.svg";
import HomeSelectedIcon from "../../assets/mobile_home_black.svg";
import HomeUnselectedIcon from "../../assets/mobile_home_white.svg";
import TodayScreen from "./TodayScreen.native";
import WeeklyScreen from "./WeeklyScreen.native";

const Tab = createBottomTabNavigator();

let previousTabIndex: number | null = null;
let isInitialMount = true;

function SlideScreenWrapper({
  children,
  screenIndex,
  screenName,
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
    }, [translateX, opacity, screenIndex]),
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View style={[styles.screenContainer, animatedStyle]}>
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

export default function MobileNavigator() {
  return (
    <SelectedPlanProvider>
      <View style={styles.navigatorContainer}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            lazy: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray600,
            tabBarStyle: {
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.5)",
              paddingBottom: Platform.OS === "ios" ? 24 : 8,
              paddingTop: 8,
              height: Platform.OS === "ios" ? 88 : 64,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "500",
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
              tabBarLabel: "오늘",
              tabBarIcon: ({
                color,
                focused,
              }: { color: string; focused: boolean }) =>
                focused ? (
                  <HomeSelectedIcon
                    width={24}
                    height={24}
                    color={colors.primary}
                  />
                ) : (
                  <HomeUnselectedIcon
                    width={24}
                    height={24}
                    color={colors.black}
                  />
                ),
            }}
          />
          <Tab.Screen
            name="Weekly"
            component={WeeklyScreenWithAnimation}
            options={{
              tabBarLabel: "여행 일정",
              tabBarIcon: ({
                color,
                focused,
              }: { color: string; focused: boolean }) =>
                focused ? (
                  <CalendarSelectedIcon
                    width={24}
                    height={24}
                    color={colors.primary}
                  />
                ) : (
                  <CalendarUnselectedIcon
                    width={24}
                    height={24}
                    color={colors.black}
                  />
                ),
            }}
          />
        </Tab.Navigator>
      </View>
    </SelectedPlanProvider>
  );
}

const styles = StyleSheet.create({
  navigatorContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.white,
  },
  screenContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.white,
  },
});
