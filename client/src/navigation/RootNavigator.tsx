import GuestPromptModal from "@/components/modals/GuestPromptModal";
import { useAuth } from "@/contexts/AuthContext";
import LoginScreenNative from "@/screens-mobile/LoginScreen.native";
import MobileNavigator from "@/screens-mobile/MobileNavigator";
import RegisterCompleteScreenNative from "@/screens-mobile/RegisterCompleteScreen.native";
import RegisterProfileScreenNative from "@/screens-mobile/RegisterProfileScreen.native";
import TermsConsentScreenNative from "@/screens-mobile/TermsConsentScreen.native";
import DashboardScreen from "@/screens/DashboardScreen";
import InviteAcceptScreen from "@/screens/InviteAcceptScreen";
import LoginScreen from "@/screens/LoginScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import RegisterProfileScreen from "@/screens/RegisterProfileScreen";
import TermsConsentScreen from "@/screens/TermsConsentScreen";
import TermsDetailScreen from "@/screens/TermsDetailScreen";
import TripViewerScreen from "@/screens/TripViewerScreen";
import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import ForbiddenScreen from "@/screens/error/ForbiddenScreen";
import NotFoundScreen from "@/screens/error/NotFoundScreen";
import {
  NavigationContainer,
  type NavigationContainerRef,
} from "@react-navigation/native";
import type { LinkingOptions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4285F4" />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(() => {
    return null;
  });

  useEffect(() => {
    if (
      !isAuthenticated &&
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const path = window.location.pathname + window.location.search;
      const hash = window.location.hash || "";
      const hasIdToken = hash.includes("id_token=");
      const isExcluded =
        path === "/" ||
        path.startsWith("/login") ||
        path.startsWith("/register") ||
        path.startsWith("/terms") ||
        path.startsWith("/auth") ||
        path.startsWith("/welcome") ||
        path.startsWith("/trip");

      if (!isExcluded) {
        try {
          window.localStorage.setItem("postLoginRedirect", path);
        } catch {}
      } else {
        if (path.startsWith("/login") && !hasIdToken) {
          try {
            window.localStorage.removeItem("postLoginRedirect");
          } catch {}
        }
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      if (!initialRoute || initialRoute === "로그인") {
        const checkInitialRoute = async () => {
          let preferWelcome = false;
          if (Platform.OS === "web" && typeof window !== "undefined") {
            try {
              const pathBase =
                window.location.pathname.replace(/\/$/, "") || "/";
              preferWelcome =
                window.localStorage.getItem("registerComplete") === "true" ||
                pathBase === "/welcome";
            } catch {}
          } else {
            try {
              const value = await SecureStore.getItemAsync("registerComplete");
              preferWelcome = value === "true";
            } catch {}
          }
          setInitialRoute(preferWelcome ? "WELCOME" : "OTTRIP");
        };
        checkInitialRoute();
      }
    } else if (!isAuthenticated) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path === "/" || path === "" || path === "/login") {
          setInitialRoute("로그인");
        } else if (path.startsWith("/trip/")) {
          setInitialRoute("TRIP");
        } else if (
          !initialRoute ||
          (initialRoute !== "로그인" &&
            initialRoute !== "약관동의" &&
            initialRoute !== "프로필 입력" &&
            initialRoute !== "인증" &&
            initialRoute !== "TRIP")
        ) {
          setInitialRoute("로그인");
        }
      } else {
        if (
          !initialRoute ||
          (initialRoute !== "로그인" &&
            initialRoute !== "약관동의" &&
            initialRoute !== "프로필 입력" &&
            initialRoute !== "인증")
        ) {
          setInitialRoute("로그인");
        }
      }
    }
  }, [isAuthenticated, isLoading, initialRoute]);

  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading && navRef.current?.isReady()) {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/trip/")
      ) {
        return;
      }
      navRef.current.reset({ index: 0, routes: [{ name: "로그인" }] });
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && initialRoute) {
      const checkRegisterComplete = async () => {
        let registerComplete = false;
        if (Platform.OS === "web" && typeof window !== "undefined") {
          try {
            registerComplete =
              window.localStorage.getItem("registerComplete") === "true";
            if (registerComplete) {
              window.localStorage.removeItem("registerComplete");
            }
          } catch {}
          const pathBase = window.location.pathname.replace(/\/$/, "") || "/";
          if (pathBase === "/welcome") {
            return;
          }
        } else {
          try {
            const value = await SecureStore.getItemAsync("registerComplete");
            registerComplete = value === "true";
            if (registerComplete) {
              await SecureStore.deleteItemAsync("registerComplete");
            }
          } catch {}
        }

        if (registerComplete && initialRoute !== "WELCOME") {
          if (Platform.OS !== "web") {
            navRef.current?.reset({ index: 0, routes: [{ name: "WELCOME" }] });
          }
          return;
        }

        if (!registerComplete) {
          if (Platform.OS === "web" && typeof window !== "undefined") {
            // registerComplete 제거 후 이 effect가 다시 돌면 postLoginRedirect만 보고 메인으로 보낼 수 있음
            if (initialRoute === "WELCOME") {
              return;
            }
            const redirect =
              window.localStorage.getItem("postLoginRedirect") || "";
            if (!redirect) return;
            try {
              window.localStorage.removeItem("postLoginRedirect");
            } catch {}
            const publicIdMatch = redirect.match(
              /^\/plans\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
            );
            if (publicIdMatch) {
              const publicId = publicIdMatch[1];
              navRef.current?.reset({
                index: 0,
                routes: [{ name: "PLAN", params: { publicId } }],
              });
              return;
            }
            if (redirect.startsWith("/profile")) {
              navRef.current?.reset({ index: 0, routes: [{ name: "프로필" }] });
              return;
            }
            navRef.current?.reset({ index: 0, routes: [{ name: "OTTRIP" }] });
          } else {
            navRef.current?.reset({ index: 0, routes: [{ name: "OTTRIP" }] });
          }
        }
      };
      checkRegisterComplete();
    }
  }, [isAuthenticated, initialRoute]);

  const linking = useMemo((): LinkingOptions<
    Record<string, object | undefined>
  > => {
    const prefixes =
      Platform.OS === "web" && typeof window !== "undefined"
        ? [window.location.origin]
        : ["ottrip://"];

    const planScreen = {
      path: "plans/:publicId" as const,
      parse: {
        publicId: (value: string) => value,
      },
      stringify: {
        publicId: (value: string) => value,
      },
    };

    const tripViewerScreen = {
      path: "trip/:publicId" as const,
      parse: {
        publicId: (value: string) => value,
      },
      stringify: {
        publicId: (value: string) => value,
      },
    };

    if (Platform.OS === "web") {
      if (isAuthenticated) {
        return {
          prefixes,
          config: {
            screens: {
              WELCOME: "welcome",
              OTTRIP: "",
              인증: "auth/callback",
              프로필: "profile",
              PLAN: planScreen,
              TRIP: tripViewerScreen,
              "NOT FOUND": "not-found",
              FORBIDDEN: "forbidden",
            },
          },
        };
      }
      return {
        prefixes,
        config: {
          screens: {
            로그인: "",
            인증: "auth/callback",
            TRIP: tripViewerScreen,
          },
        },
      };
    }

    if (isAuthenticated) {
      return {
        prefixes,
        config: {
          screens: {
            프로필: "profile",
            PLAN: planScreen,
            TRIP: tripViewerScreen,
            "NOT FOUND": "not-found",
            FORBIDDEN: "forbidden",
          },
        },
      };
    }

    return {
      prefixes,
      config: {
        screens: {
          로그인: "login",
          인증: "auth/callback",
          TRIP: tripViewerScreen,
        },
      },
    };
  }, [isAuthenticated]);

  if (isLoading || !initialRoute) {
    return <LoadingScreen />;
  }

  const OttripScreen =
    Platform.OS === "web" ? DashboardScreen : MobileNavigator;

  return (
    <NavigationContainer linking={linking} ref={navRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="OTTRIP" component={OttripScreen} />
            <Stack.Screen name="프로필" component={ProfileScreen} />
            <Stack.Screen name="INVITE_ACCEPT" component={InviteAcceptScreen} />
            <Stack.Screen
              name="WELCOME"
              component={WelcomeScreen}
              options={
                Platform.OS === "web"
                  ? { animation: "none" as const }
                  : undefined
              }
            />
            <Stack.Screen name="PLAN" component={DashboardScreen} />
            <Stack.Screen name="TRIP" component={TripViewerScreen} />
            <Stack.Screen name="NOT FOUND" component={NotFoundScreen} />
            <Stack.Screen name="FORBIDDEN" component={ForbiddenScreen} />
            <Stack.Screen name="인증" component={AuthCallbackScreen} />
            {/* 모바일 화면 */}
            <Stack.Screen name="MOBILE" component={MobileNavigator} />
            <Stack.Screen
              name="소셜회원가입"
              component={
                Platform.OS === "web" ? LoginScreen : LoginScreenNative
              }
            />
            {/* 게스트 → 소셜 가입(registerToken) 시에도 약관·프로필·가입완료로 이어지게 동일 화면 등록 */}
            <Stack.Screen
              name="약관동의"
              component={
                Platform.OS === "web"
                  ? TermsConsentScreen
                  : TermsConsentScreenNative
              }
            />
            <Stack.Screen
              name="프로필 입력"
              component={
                Platform.OS === "web"
                  ? RegisterProfileScreen
                  : RegisterProfileScreenNative
              }
            />
            <Stack.Screen
              name="가입완료"
              component={RegisterCompleteScreenNative}
            />
            <Stack.Screen name="상세내용" component={TermsDetailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="로그인"
              component={
                Platform.OS === "web" ? LoginScreen : LoginScreenNative
              }
            />
            <Stack.Screen
              name="약관동의"
              component={
                Platform.OS === "web"
                  ? TermsConsentScreen
                  : TermsConsentScreenNative
              }
            />
            <Stack.Screen
              name="프로필 입력"
              component={
                Platform.OS === "web"
                  ? RegisterProfileScreen
                  : RegisterProfileScreenNative
              }
            />
            <Stack.Screen name="상세내용" component={TermsDetailScreen} />
            <Stack.Screen name="인증" component={AuthCallbackScreen} />
            <Stack.Screen
              name="가입완료"
              component={RegisterCompleteScreenNative}
            />
            {/* 모바일 화면 (로그인 없이도 접근 가능) */}
            <Stack.Screen name="MOBILE" component={MobileNavigator} />
            <Stack.Screen name="TRIP" component={TripViewerScreen} />
          </>
        )}
      </Stack.Navigator>
      {isAuthenticated ? <GuestPromptModal /> : null}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
