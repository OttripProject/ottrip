import { useAuth } from "@/contexts/AuthContext";
import { SelectedPlanProvider } from "@/contexts/SelectedPlanContext";
import { useToast } from "@/contexts/ToastContext";
import { plansApi } from "@/services/plans";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import CalendarIcon from "../../assets/mobile_calendar_black.svg";
import ExpenseCardIcon from "../../assets/expense_card.svg";
import ExpenseScreen from "./ExpenseScreen.native";
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

      translateX.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
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

function WeeklyScreenWithAnimation() {
  return (
    <SlideScreenWrapper screenIndex={0} screenName="Weekly">
      <WeeklyScreen />
    </SlideScreenWrapper>
  );
}

function renderTabLabel(label: string, focused: boolean) {
  return (
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
      {label}
    </Text>
  );
}

function ExpenseScreenWithAnimation() {
  return (
    <SlideScreenWrapper screenIndex={1} screenName="Expense">
      <ExpenseScreen />
    </SlideScreenWrapper>
  );
}

export default function MobileNavigator() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [preferredPlanPublicId, setPreferredPlanPublicId] = useState<
    string | null
  >(
    (route.params as { selectPlanPublicId?: string } | undefined)
      ?.selectPlanPublicId ?? null,
  );

  const resumingSaveRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || resumingSaveRef.current) return;
    resumingSaveRef.current = true;
    (async () => {
      try {
        const pendingId = await AsyncStorage.getItem("pendingSavePublicId");
        if (!pendingId) return;
        await AsyncStorage.removeItem("pendingSavePublicId");
        const result = await plansApi.saveExport(pendingId);
        await queryClient.invalidateQueries({ queryKey: ["plans"] });
        setPreferredPlanPublicId(result.planPublicId);
        showToast("내 일정으로 저장됐어요", { icon: "check" });
      } catch {
        showToast("일정을 저장하지 못했어요", { icon: "info" });
      } finally {
        resumingSaveRef.current = false;
      }
    })();
  }, [isAuthenticated, queryClient, showToast]);

  return (
    <SelectedPlanProvider preferredPlanPublicId={preferredPlanPublicId}>
      <View style={styles.navigatorContainer}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            lazy: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray600,
            tabBarStyle: {
              backgroundColor: colors.white,
              borderTopWidth: 1,
              borderTopColor: colors.paletteLine,
              paddingBottom: Platform.OS === "ios" ? 24 : insets.bottom + 8,
              paddingTop: 8,
              height: Platform.OS === "ios" ? 88 : 64 + insets.bottom,
              elevation: 0,
            },
            tabBarIconStyle: {
              marginTop: 4,
            },
          }}
        >
          <Tab.Screen
            name="Weekly"
            component={WeeklyScreenWithAnimation}
            options={{
              tabBarLabel: ({ focused }: { focused: boolean }) =>
                renderTabLabel("여행 일정", focused),
              tabBarIcon: ({ color }: { color: string }) => (
                <CalendarIcon width={22} height={22} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Expense"
            component={ExpenseScreenWithAnimation}
            options={{
              tabBarLabel: ({ focused }: { focused: boolean }) =>
                renderTabLabel("지출", focused),
              tabBarIcon: ({ color }: { color: string }) => (
                <ExpenseCardIcon width={22} height={22} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </SelectedPlanProvider>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    ...textStyles.body5,
    lineHeight: 14,
    marginTop: 4,
    color: colors.paletteFg3,
  },
  tabLabelActive: {
    ...textStyles.h8,
    lineHeight: 14,
    color: colors.primary,
  },
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
