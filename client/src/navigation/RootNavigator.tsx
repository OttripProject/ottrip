import DashboardScreen from "@/screens/DashboardScreen";
import InviteAcceptScreen from "@/screens/InviteAcceptScreen";
import LoginScreen from "@/screens/LoginScreen";
import LoginScreenNative from "@/screens-mobile/LoginScreen.native";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import TermsConsentScreen from "@/screens/TermsConsentScreen";
import TermsConsentScreenNative from "@/screens-mobile/TermsConsentScreen.native";
import RegisterProfileScreen from "@/screens/RegisterProfileScreen";
import RegisterProfileScreenNative from "@/screens-mobile/RegisterProfileScreen.native";
import RegisterCompleteScreenNative from "@/screens-mobile/RegisterCompleteScreen.native";
import TermsDetailScreen from "@/screens/TermsDetailScreen";
import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import LandingScreen from "@/screens/LandingScreen";
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
import MobileNavigator from "@/screens-mobile/MobileNavigator";

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
    if (!isAuthenticated && Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname + window.location.search;
      const hash = window.location.hash || '';
      const hasIdToken = hash.includes('id_token=');
      const isExcluded =
        path === '/' ||
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/terms') ||
        path.startsWith('/auth');

      if (!isExcluded) {
        try { window.localStorage.setItem('postLoginRedirect', path); } catch {}
      } else {
        if (path.startsWith('/login') && !hasIdToken) {
          try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
        }
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
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
          setInitialRoute(registerComplete ? 'WELCOME' : 'OTTRIP');
        };
        checkInitialRoute();
      }
    } else if (!isAuthenticated) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
          setInitialRoute('OTTRIP_TODAY');
        } else if (!initialRoute || (initialRoute !== '로그인' && initialRoute !== '약관동의' && initialRoute !== '프로필 입력' && initialRoute !== '인증' && initialRoute !== 'OTTRIP_TODAY')) {
          setInitialRoute('로그인');
        }
      } else {
        if (!initialRoute || (initialRoute !== '로그인' && initialRoute !== '약관동의' && initialRoute !== '프로필 입력' && initialRoute !== '인증')) {
          setInitialRoute('로그인');
        }
      }
    }
  }, [isAuthenticated, isLoading, initialRoute]);

  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading && navRef.current?.isReady()) {
      navRef.current.reset({ index: 0, routes: [{ name: '로그인' }] });
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && initialRoute) {
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

        if (registerComplete && initialRoute !== 'WELCOME') {
          navRef.current?.reset({ index: 0, routes: [{ name: 'WELCOME' }] });
          return;
        }

        if (!registerComplete) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const redirect = window.localStorage.getItem('postLoginRedirect') || '';
            if (!redirect) return;
            try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
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
          } else {
            navRef.current?.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
          }
        }
      };
      checkRegisterComplete();
    }
  }, [isAuthenticated, initialRoute]);

  const prefixes = Platform.OS === 'web' && typeof window !== 'undefined'
    ? [window.location.origin]
    : ['ottrip://'];

  const linking: LinkingOptions<Record<string, object | undefined>> = {
    prefixes,
    config: {
      screens: {
        OTTRIP_TODAY: "", 
        "로그인": "login",
        인증: "auth/callback",
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

  const OttripScreen = Platform.OS === 'web' ? DashboardScreen : MobileNavigator;

  return (
    <NavigationContainer linking={linking} ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="OTTRIP" component={OttripScreen} />
            <Stack.Screen name="프로필" component={ProfileScreen} />
            <Stack.Screen name="INVITE_ACCEPT" component={InviteAcceptScreen} />
            <Stack.Screen name="WELCOME" component={WelcomeScreen} />
            <Stack.Screen name="PLAN" component={DashboardScreen} />
            <Stack.Screen name="NOT FOUND" component={NotFoundScreen} />
            <Stack.Screen name="FORBIDDEN" component={ForbiddenScreen} />
            {/* 모바일 화면 */}
            <Stack.Screen name="MOBILE" component={MobileNavigator} />
            <Stack.Screen
              name="소셜회원가입"
              component={Platform.OS === "web" ? LoginScreen : LoginScreenNative}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="OTTRIP_TODAY" 
              component={LandingScreen}
              options={{
                title: 'OTTRIP',
              }}
            />
            <Stack.Screen
              name="로그인"
              component={Platform.OS === 'web' ? LoginScreen : LoginScreenNative}
            />
            <Stack.Screen
              name="약관동의"
              component={Platform.OS === 'web' ? TermsConsentScreen : TermsConsentScreenNative}
            />
            <Stack.Screen
              name="프로필 입력"
              component={Platform.OS === 'web' ? RegisterProfileScreen : RegisterProfileScreenNative}
            />
            <Stack.Screen name="상세내용" component={TermsDetailScreen} />
            <Stack.Screen name="인증" component={AuthCallbackScreen} />
            <Stack.Screen name="가입완료" component={RegisterCompleteScreenNative} />
            {/* 모바일 화면 (로그인 없이도 접근 가능) */}
            <Stack.Screen name="MOBILE" component={MobileNavigator} />
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
