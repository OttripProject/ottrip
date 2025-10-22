import DashboardScreen from "@/screens/DashboardScreen";
import InviteAcceptScreen from "@/screens/InviteAcceptScreen";
import LoginScreen from "@/screens/LoginScreen";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import TermsConsentScreen from "@/screens/TermsConsentScreen";
import RegisterProfileScreen from "@/screens/RegisterProfileScreen";
import TermsDetailScreen from "@/screens/TermsDetailScreen";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRef } from "react";
import type { LinkingOptions } from "@react-navigation/native";

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
  // 미인증 상태에서 보호 경로 접근 시, 로그인 후 복귀할 경로 저장
  useEffect(() => {
    if (!isAuthenticated && Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname + window.location.search;
      const hash = window.location.hash || '';
      const hasIdToken = hash.includes('id_token=');
      // 제외 규칙: 로그인/회원가입/약관 경로는 저장하지 않음
      const isExcluded =
        path === '/' ||
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/terms') ||
        path.startsWith('/auth');

      if (!isExcluded) {
        try { window.localStorage.setItem('postLoginRedirect', path); } catch {}
      } else {
        // /login으로 사용자가 직접 진입했고 해시에 id_token이 없다면, 오래된 redirect를 정리
        if (path.startsWith('/login') && !hasIdToken) {
          try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
        }
      }
    }
  }, [isAuthenticated]);

  // 로그인 직후 저장된 경로로 이동 (스택이 인증 스크린을 포함한 뒤 실행)
  const navRef = useRef<NavigationContainerRef<any>>(null);
  useEffect(() => {
    if (isAuthenticated && Platform.OS === 'web' && typeof window !== 'undefined') {
      const redirect = window.localStorage.getItem('postLoginRedirect') || '';
      if (!redirect) return;
      try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
      const planMatch = redirect.match(/^\/plans\/(\d+)/);
      if (planMatch) {
        const planId = Number(planMatch[1]);
        navRef.current?.reset({ index: 0, routes: [{ name: 'PLAN', params: { planId } }] });
        return;
      }
      if (redirect.startsWith('/profile')) {
        navRef.current?.reset({ index: 0, routes: [{ name: '프로필' }] });
        return;
      }
      navRef.current?.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
    }
  }, [isAuthenticated]);

  // Web URL ↔ 스크린 매핑 (링크 공유/직접 진입 지원)
  const prefixes = Platform.OS === 'web' && typeof window !== 'undefined'
    ? [window.location.origin]
    : ['ottrip://'];

  const linking: LinkingOptions<Record<string, object | undefined>> = {
    prefixes,
    config: {
      screens: {
        // 비인증 스택
        "로그인": "login",
        인증: "auth/callback",
        OTTRIP: {
          path: "",
        },
        프로필: "profile",
        PLAN: {
          path: "plans/:planId",
          parse: {
            planId: (value: string) => Number(value),
          },
          stringify: {
            planId: (value: number) => String(value),
          },
        },
      },
    },
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking} ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isAuthenticated ? 'OTTRIP' : '로그인'}>
        {isAuthenticated ? (
          // 인증된 사용자
          <>
            <Stack.Screen name="OTTRIP" component={DashboardScreen} />
            <Stack.Screen name="프로필" component={ProfileScreen} />
            <Stack.Screen name="INVITE_ACCEPT" component={InviteAcceptScreen} />
            {/* 동일 화면을 경로 기반으로 진입하기 위한 별칭 */}
            <Stack.Screen name="PLAN" component={DashboardScreen} />
          </>
        ) : (
          // 미인증 사용자 + 가입 플로우
          <>
            <Stack.Screen name="로그인" component={LoginScreen} />
            <Stack.Screen name="약관동의" component={TermsConsentScreen} />
            <Stack.Screen name="프로필 입력" component={RegisterProfileScreen} />
            <Stack.Screen name="상세내용" component={TermsDetailScreen} />
            <Stack.Screen name="인증" component={AuthCallbackScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
