import DashboardScreen from "@/screens/DashboardScreen";
import InviteAcceptScreen from "@/screens/InviteAcceptScreen";
import LoginScreen from "@/screens/LoginScreen";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import TermsConsentScreen from "@/screens/TermsConsentScreen";
import RegisterProfileScreen from "@/screens/RegisterProfileScreen";
import TermsDetailScreen from "@/screens/TermsDetailScreen";
import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import NotFoundScreen from "@/screens/error/NotFoundScreen";
import ForbiddenScreen from "@/screens/error/ForbiddenScreen";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRef } from "react";
import type { LinkingOptions } from "@react-navigation/native";
import * as SecureStore from 'expo-secure-store';

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
  // 초기 라우트를 동기적으로 결정 (미인증일 때는 즉시 '로그인'으로 설정)
  const [initialRoute, setInitialRoute] = useState<string | null>(() => {
    // 초기 렌더링 시 동기적으로 설정
    return null; // 로딩 중이므로 null로 시작
  });
  
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

  // 초기 라우트 결정 (회원가입 완료 플래그 확인)
  useEffect(() => {
    if (isLoading) {
      // 로딩 중일 때는 초기 라우트를 설정하지 않음
      return;
    }

    if (isAuthenticated) {
      // 인증 상태일 때: initialRoute가 없거나, 이전에 미인증 라우트('로그인')로 설정된 경우 업데이트
      if (!initialRoute || initialRoute === '로그인') {
        const checkInitialRoute = async () => {
          let registerComplete = false;
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
              registerComplete = window.localStorage.getItem('registerComplete') === 'true';
            } catch {}
          } else {
            try {
              const value = await SecureStore.getItemAsync('registerComplete');
              registerComplete = value === 'true';
            } catch {}
          }
          setInitialRoute(registerComplete ? 'REGISTER_COMPLETE' : 'OTTRIP');
        };
        checkInitialRoute();
      }
    } else if (!isAuthenticated) {
      // 미인증 상태일 때: initialRoute가 없거나, 이전에 인증 라우트로 설정된 경우 업데이트
      if (!initialRoute || (initialRoute !== '로그인' && initialRoute !== '약관동의' && initialRoute !== '프로필 입력' && initialRoute !== '인증')) {
        setInitialRoute('로그인');
      }
    }
  }, [isAuthenticated, isLoading, initialRoute]);

  // 로그인 직후 저장된 경로로 이동 (스택이 인증 스크린을 포함한 뒤 실행)
  const navRef = useRef<NavigationContainerRef<any>>(null);
  useEffect(() => {
    if (isAuthenticated && initialRoute) {
      // 회원가입 완료 플래그 확인 및 제거
      const checkRegisterComplete = async () => {
        let registerComplete = false;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            registerComplete = window.localStorage.getItem('registerComplete') === 'true';
            if (registerComplete) {
              window.localStorage.removeItem('registerComplete');
            }
          } catch {}
        } else {
          try {
            const value = await SecureStore.getItemAsync('registerComplete');
            registerComplete = value === 'true';
            if (registerComplete) {
              await SecureStore.deleteItemAsync('registerComplete');
            }
          } catch {}
        }

        if (registerComplete && initialRoute !== 'REGISTER_COMPLETE') {
          navRef.current?.reset({ index: 0, routes: [{ name: 'REGISTER_COMPLETE' }] });
          return;
        }

        // 기존 리다이렉트 로직 (회원가입 완료가 아닌 경우에만)
        if (!registerComplete && Platform.OS === 'web' && typeof window !== 'undefined') {
          const redirect = window.localStorage.getItem('postLoginRedirect') || '';
          if (!redirect) return;
          try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
          // UUID 패턴 매칭 (8-4-4-4-12 형식)
          const publicIdMatch = redirect.match(/^\/plans\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (publicIdMatch) {
            const publicId = publicIdMatch[1];
            navRef.current?.reset({ index: 0, routes: [{ name: 'PLAN', params: { publicId } }] });
            return;
          }
          if (redirect.startsWith('/profile')) {
            navRef.current?.reset({ index: 0, routes: [{ name: '프로필' }] });
            return;
          }
          navRef.current?.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
        }
      };
      checkRegisterComplete();
    }
  }, [isAuthenticated, initialRoute]);

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
          path: "plans/:publicId",
          parse: {
            publicId: (value: string) => value,
          },
          stringify: {
            publicId: (value: string) => value,
          },
        },
        'NOT FOUND': "not-found",
        FORBIDDEN: "forbidden",
      },
    },
  };

  if (isLoading || !initialRoute) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking} ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        {isAuthenticated ? (
          // 인증된 사용자
          <>
            <Stack.Screen name="OTTRIP" component={DashboardScreen} />
            <Stack.Screen name="프로필" component={ProfileScreen} />
            <Stack.Screen name="INVITE_ACCEPT" component={InviteAcceptScreen} />
            <Stack.Screen name="REGISTER_COMPLETE" component={WelcomeScreen} />
            {/* 동일 화면을 경로 기반으로 진입하기 위한 별칭 */}
            <Stack.Screen name="PLAN" component={DashboardScreen} />
            <Stack.Screen name="NOT FOUND" component={NotFoundScreen} />
            <Stack.Screen name="FORBIDDEN" component={ForbiddenScreen} />
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
