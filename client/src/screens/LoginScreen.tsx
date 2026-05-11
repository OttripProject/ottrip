import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Alert, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authApi } from '../services/auth';
import { loadPublicEnv } from '../core/env/schema';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';
import { textStyles, typography } from '../ui/tokens/typography';
import GradientBackground from '../ui/components/GradientBackground';
import Card from '../ui/components/Card';
import GoogleButton from '../ui/components/GoogleButton';
import AppleButton from '../ui/components/AppleButton';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { colors } from '../ui/tokens/colors';

let appleAuthJsPromise: Promise<void> | null = null;

function loadAppleAuthJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as Window & {
    AppleID?: { auth: { init: (config: Record<string, unknown>) => void; signIn: () => Promise<AppleSignInResponse> } };
  };
  if (w.AppleID?.auth) return Promise.resolve();
  if (appleAuthJsPromise) return appleAuthJsPromise;

  appleAuthJsPromise = new Promise((resolve, reject) => {
    const fail = (msg: string) => {
      appleAuthJsPromise = null;
      reject(new Error(msg));
    };

    const existing = document.querySelector('script[data-ottrip-appleid]');
    if (existing) {
      if (w.AppleID?.auth) {
        resolve();
        return;
      }
      const done = () => {
        if (w.AppleID?.auth) resolve();
        else fail('Apple JS unavailable');
      };
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => fail('Apple 스크립트 로드 실패'));
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-ottrip-appleid', '1');
    s.onload = () => {
      if (w.AppleID?.auth) resolve();
      else fail('Apple JS unavailable');
    };
    s.onerror = () => fail('Apple 스크립트 로드 실패');
    document.head.appendChild(s);
  });

  return appleAuthJsPromise;
}

type AppleSignInResponse = {
  authorization?: {
    id_token?: string;
    code?: string;
    state?: string;
  };
};

const SOCIAL_LOGIN_CONFLICT_DEFAULT = '이 계정은 다른 사용자와 연결되어 있습니다.';
const SOCIAL_LOGIN_FAILURE_DEFAULT = '로그인에 실패했습니다.';

/** RN Web에서 `Alert.alert`가 동작하지 않는 경우가 있어 웹은 `window.alert` 사용 */
function alertDialog(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function showSocialLoginError(err: unknown) {
  const e = err as { response?: { status?: number; data?: { detail?: string } } };
  const is409 = e?.response?.status === 409;
  const detail = e?.response?.data?.detail;
  const message = is409
    ? (typeof detail === 'string' && detail ? detail : SOCIAL_LOGIN_CONFLICT_DEFAULT)
    : SOCIAL_LOGIN_FAILURE_DEFAULT;
  alertDialog(is409 ? '안내' : '알림', message);
}

const generateNonce = async () => {
  if (Platform.OS === 'web' && typeof crypto !== 'undefined') {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
};

const env = loadPublicEnv();

export default function LoginScreen() {
  const { login, loginAsGuest } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const guestUpgrade =
    (route.params as { guestUpgrade?: boolean } | undefined)?.guestUpgrade === true;
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState<string>('');
  
  // Google Sign-In 초기화 (네이티브만)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const iosClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
    const webClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (Platform.OS === 'ios' && iosClientId) {
      GoogleSignin.configure({
        iosClientId,
        webClientId, // 서버 인증용 (id_token 검증)
        offlineAccess: false,
      });
    } else if (Platform.OS === 'android' && webClientId) {
      GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;

      if (hash && hash.includes('invite=')) {
        const params = new URLSearchParams(hash.substring(1));
        const inviteToken = params.get('invite');
        if (inviteToken) {
          try { window.localStorage.setItem('pendingInviteToken', inviteToken); } catch {}
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      if (hash && hash.includes('id_token=')) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
        
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get('id_token');
        if (idToken) {
          handleGoogleSignIn(idToken);
        }
      }
    }
  }, [nonce]);

  const onGoogleSignIn = async () => {
    try {
      if (Platform.OS === 'web') {
        const clientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

        if (!clientId) {
          alertDialog('알림', 'Google OAuth 클라이언트 ID가 설정되지 않았습니다.');
          return;
        }

        const newNonce = await generateNonce();
        setNonce(newNonce);
        const redirectUriRaw = `${window.location.origin}/auth/callback`;
        const redirectUri = encodeURIComponent(redirectUriRaw);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        const prompt = encodeURIComponent('consent select_account');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}&prompt=${prompt}`;

        try {
          window.location.assign(authUrl);
        } catch {
          alertDialog('알림', 'Google 로그인 페이지로 이동할 수 없습니다.');
        }
      } else {
        setIsLoading(true);
        // 네이티브: Google Sign-In 패키지 사용
        try {
          // Android만 Play Services 확인 필요
          if (Platform.OS === 'android') {
            await GoogleSignin.hasPlayServices();
          }
          
          const signInResult = await GoogleSignin.signIn();
          
          // Google Sign-In 응답에서 idToken 추출
          // @react-native-google-signin/google-signin의 응답 구조에 따라 조정
          const idToken = (signInResult as any).data?.idToken || 
                         (signInResult as any).idToken;
          
          if (idToken) {
            await handleGoogleSignIn(idToken);
          } else {
            alertDialog('알림', '로그인에 실패했습니다. id_token을 받을 수 없습니다.');
            setIsLoading(false);
          }
        } catch (error: any) {
          console.error('Google Sign-In 에러:', error);
          
          if (error.code === 'SIGN_IN_CANCELLED') {
          setIsLoading(false);
          } else if (error.code === 'IN_PROGRESS') {
            // 이미 진행 중 - 로딩 상태 유지
        } else {
            alertDialog('알림', '로그인에 실패했습니다: ' + (error.message || '알 수 없는 알림'));
          setIsLoading(false);
          }
        }
      }
    } catch (error: any) {
      alertDialog('알림', '로그인 중 알림가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const base64UrlDecode = (input: string) => {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 2 ? '==' : base64.length % 4 === 3 ? '=' : '';
    const str = atob(base64 + pad);
    try { return decodeURIComponent(escape(str)); } catch { return str; }
  };

  const parseIdToken = (idToken: string): any | null => {
    try {
      const [, payload] = idToken.split('.');
      const json = base64UrlDecode(payload);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      const response = await authApi.googleLogin(idToken);
      
      if (response.isRegistered) {
        await login({
          isRegistered: true,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        
        // 초대 토큰 처리
        try {
          const token = Platform.OS === 'web'
            ? window.localStorage.getItem('pendingInviteToken')
            : await SecureStore.getItemAsync('pendingInviteToken');
          if (token) {
            await api.post(`/private/plans/invitations/${token}/accept`);
            if (Platform.OS === 'web') {
              window.localStorage.removeItem('pendingInviteToken');
              window.dispatchEvent(new Event('plans-refresh'));
            } else {
              await SecureStore.deleteItemAsync('pendingInviteToken');
            }
          }
        } catch {}
        
        setIsLoading(false);
        if (guestUpgrade) {
          navigation.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
        }
      } else {
        await login(response);
        const payload = parseIdToken(idToken);
        const email = payload?.email ?? '';
        navigation.navigate('약관동의', {
          registerToken: response.registerToken,
          prefill: response.prefill,
          email,
        });
        setIsLoading(false);
      }
    } catch (error: unknown) {
      setIsLoading(false);
      showSocialLoginError(error);
    }
  };

  const handleAppleSignIn = async (idToken: string) => {
    try {
      const response = await authApi.appleLogin(idToken);

      if (response.isRegistered) {
        await login({
          isRegistered: true,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });

        try {
          const token = Platform.OS === 'web'
            ? window.localStorage.getItem('pendingInviteToken')
            : await SecureStore.getItemAsync('pendingInviteToken');
          if (token) {
            await api.post(`/private/plans/invitations/${token}/accept`);
            if (Platform.OS === 'web') {
              window.localStorage.removeItem('pendingInviteToken');
              window.dispatchEvent(new Event('plans-refresh'));
            } else {
              await SecureStore.deleteItemAsync('pendingInviteToken');
            }
          }
        } catch {}

        setIsLoading(false);
        if (guestUpgrade) {
          navigation.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
        }
      } else {
        await login(response);
        const payload = parseIdToken(idToken);
        const email = payload?.email ?? '';
        navigation.navigate('약관동의', {
          registerToken: response.registerToken,
          prefill: response.prefill,
          email,
        });
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      showSocialLoginError(err);
    }
  };

  const onAppleSignInWeb = async () => {
    if (Platform.OS !== 'web') return;
    const clientId = env.EXPO_PUBLIC_APPLE_SERVICES_ID;
    if (!clientId) {
      alertDialog('알림', 'Apple 로그인(Services ID)이 설정되지 않았습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await loadAppleAuthJs();
      const w = window as unknown as {
        AppleID: { auth: { init: (config: Record<string, unknown>) => void; signIn: () => Promise<AppleSignInResponse> } };
      };
      const redirectURI = `${window.location.origin}/auth/callback`;
      w.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI,
        usePopup: true,
      });
      const res = await w.AppleID.auth.signIn();
      const idToken = res?.authorization?.id_token;
      if (!idToken) {
        alertDialog('알림', 'Apple 로그인 토큰을 받을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      await handleAppleSignIn(idToken);
    } catch (e: unknown) {
      const err = e as { error?: string };
      if (err.error === 'popup_closed_by_user') {
        setIsLoading(false);
        return;
      }
      const message = e instanceof Error ? e.message : 'Apple 로그인에 실패했습니다.';
      alertDialog('알림', message);
      setIsLoading(false);
    }
  };

  const onGuestPlanContinue = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
    }
  };

  const onGuestStart = async () => {
    setIsLoading(true);
    try {
      await loginAsGuest();
      try {
        const token = Platform.OS === 'web'
          ? window.localStorage.getItem('pendingInviteToken')
          : await SecureStore.getItemAsync('pendingInviteToken');
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          if (Platform.OS === 'web') {
            window.localStorage.removeItem('pendingInviteToken');
            window.dispatchEvent(new Event('plans-refresh'));
          } else {
            await SecureStore.deleteItemAsync('pendingInviteToken');
          }
        }
      } catch {}
    } catch {
      alertDialog('알림', '비회원으로 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      try {
        await authApi.getServerTime();
      } catch (error: any) {
        alertDialog('연결 알림', '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        setIsLoading(false);
        return;
      }

      try {
        const tokenData = await authApi.createTestUser();
        
        if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken) {
          throw new Error('Invalid token response structure');
        }
        
        await login({
          isRegistered: true,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        });
        
      } catch (error: any) {
        let errorMessage = '알 수 없는 알림';
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.status === 401) {
          errorMessage = '인증이 필요합니다. 서버 설정을 확인해주세요.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Dev 라우터를 찾을 수 없습니다. 서버가 개발 모드로 실행되고 있는지 확인해주세요.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alertDialog('로그인 실패', errorMessage);
      }
    } catch (error: any) {
      const userErrorMessage = error.response?.data?.detail || error.message || '알 수 없는 알림';
      alertDialog('알림', `테스트 로그인 중 알림가 발생했습니다: ${userErrorMessage}`);
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
    <SafeAreaView style={styles.container}>
        <Card variant="basic">
        <View style={styles.header}>
          <Text style={styles.title}>OTTRIP</Text>
          <Text style={styles.subtitle}>
            {guestUpgrade
              ? 'Google 또는 Apple로 로그인하고\n기존 여행일정을 유지할 수 있어요'
              : '여행 계획을 더 스마트하게'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
            <GoogleButton
            onPress={onGoogleSignIn}
            disabled={isLoading}
              isLoading={isLoading}
            />
            {Platform.OS === 'web' && !!env.EXPO_PUBLIC_APPLE_SERVICES_ID ? (
              <AppleButton
                onPress={onAppleSignInWeb}
                disabled={isLoading}
                isLoading={isLoading}
                style={styles.appleButton}
                iconSize={30}
              />
            ) : null}
            <Pressable
              onPress={guestUpgrade ? onGuestPlanContinue : onGuestStart}
              disabled={isLoading}
              style={({ pressed }) => [styles.guestLink, pressed && styles.guestLinkPressed]}
            >
              <Text style={styles.guestLinkText}>
                {guestUpgrade ? '게스트로 이어하기' : '게스트로 시작하기'}
              </Text>
            </Pressable>
          </View>
        </Card>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 180,
    marginBottom: 0,
  },
  title: {
    fontSize: 32,
    color: '#0066FF',
    marginBottom: 8, 
    fontFamily: typography.fontFamily.poppinsSemiBold,
  },
  subtitle: {
    ...textStyles.body2,
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  appleButton: {
    marginTop: 12,
  },
  guestLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  guestLinkPressed: {
    opacity: 0.6,
  },
  guestLinkText: {
    ...textStyles.body3,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },
}); 