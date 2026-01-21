import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../services/auth';
import { loadPublicEnv } from '../core/env/schema';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import api from '@/services/api';
import { textStyles, typography } from '../ui/tokens/typography';
import GradientBackground from '../ui/components/GradientBackground';
import Card from '../ui/components/Card';
import GoogleButton from '../ui/components/GoogleButton';

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

const isWebView = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  
  // 예: http://localhost:8081/login?test_webview=true
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('test_webview') === 'true') {
    return true;
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  return (
    userAgent.includes('wv') ||
    userAgent.includes('naver') ||
    userAgent.includes('kakaotalk') ||
    userAgent.includes('instagram') ||
    userAgent.includes('line') ||
    userAgent.includes('fbav') || 
    userAgent.includes('fban') || 
    userAgent.includes('fbsv') || 
    (userAgent.includes('mobile') && userAgent.includes('safari') && !userAgent.includes('chrome'))
  );
};

const env = loadPublicEnv();

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data && event.data.type === 'google_oauth_token' && event.data.id_token) {
          handleGoogleSignIn(event.data.id_token);
        } else if (event.data && event.data.type === 'google_oauth_error') {
          Alert.alert('오류', '로그인에 실패했습니다.');
          setIsLoading(false);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
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
      
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [nonce]);

  const onGoogleSignIn = async () => {
    const clientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return;
    }

    setIsLoading(true);
    try {
      const newNonce = await generateNonce();
      setNonce(newNonce);
      
      if (Platform.OS === 'web') {
        const redirectUriRaw = `${window.location.origin}/auth/callback`;
        const redirectUri = encodeURIComponent(redirectUriRaw);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        const prompt = encodeURIComponent('consent select_account');
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}&prompt=${prompt}`;
        
        // 웹뷰 감지 후 조건부 처리
        if (isWebView()) {
          // 웹뷰: 팝업으로 열기
          const popup = window.open(
            authUrl,
            'google_oauth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          );
          
          if (!popup) {
            Alert.alert('팝업 차단', '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
            setIsLoading(false);
            return;
          }
          
          const checkPopup = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkPopup);
              setIsLoading(false);
            }
          }, 500);
          
          setTimeout(() => {
            clearInterval(checkPopup);
            if (!popup.closed) {
              popup.close();
              setIsLoading(false);
            }
          }, 5 * 60 * 1000);
        } else {
          try {
            window.location.href = authUrl;
          } catch (e) {
            Alert.alert('오류', '로그인 페이지를 열 수 없습니다.');
            setIsLoading(false);
          }
        }
      } else {

        const getWebRedirectUri = (): string => {
          const channel = env.EXPO_PUBLIC_CHANNEL;
          if (channel === 'prod') {
            return 'https://ottrip.today/auth/callback';
          } else {
            const apiUrl = env.EXPO_PUBLIC_API_URL;

            return 'https://ottrip-dev-web.onrender.com/auth/callback'; 
          }
        };
        
        const redirectUri = getWebRedirectUri();
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        const prompt = encodeURIComponent('consent select_account');
        
        const encodedRedirectUri = encodeURIComponent(redirectUri);
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}&prompt=${prompt}`;
        
        const appScheme = Platform.OS === 'ios'
          ? (Constants.expoConfig?.ios?.bundleIdentifier || 'com.ottrip.app.OttripAlpha')
          : (Constants.expoConfig?.android?.package || 'com.ottrip.app.OttripAlpha');
        const appRedirectUri = `${appScheme}://oauth2redirect`;
        
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl, 
          appRedirectUri, 
          {
            preferEphemeralSession: false, 
            showInRecents: true,
          }
        );
        
        if (result.type === 'success' && result.url) {
          let idToken: string | null = null;
          
          try {
            const url = new URL(result.url);
            const fragment = url.hash.substring(1);
            const params = new URLSearchParams(fragment);
            idToken = params.get('id_token');
          } catch (urlError) {
            const urlString = result.url;
            const idTokenMatch = urlString.match(/id_token=([^&]+)/);
            idToken = idTokenMatch ? idTokenMatch[1] : null;
          }
          
          if (idToken) {
            await handleGoogleSignIn(idToken);
          } else {
            Alert.alert('오류', '로그인에 실패했습니다.');
          }
        } else if (result.type === 'cancel') {
          setIsLoading(false);
        } else {
          Alert.alert('오류', '로그인에 실패했습니다.');
          setIsLoading(false);
        }
      }
    } catch (error: any) {
      Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
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

  const handleGoogleSignIn = async (accessToken: string) => {
    try {
      const response = await authApi.googleLogin(accessToken);
      
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
      } else {
        await login(response);
        const payload = parseIdToken(accessToken);
        const email = payload?.email ?? '';
        navigation.navigate('약관동의', {
          registerToken: response.registerToken,
          prefill: response.prefill,
          email,
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('오류', '로그인에 실패했습니다.');
    }
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      try {
        await authApi.getServerTime();
      } catch (error: any) {
        Alert.alert('연결 오류', '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
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
        let errorMessage = '알 수 없는 오류';
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.status === 401) {
          errorMessage = '인증이 필요합니다. 서버 설정을 확인해주세요.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Dev 라우터를 찾을 수 없습니다. 서버가 개발 모드로 실행되고 있는지 확인해주세요.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Alert.alert('로그인 실패', errorMessage);
      }
    } catch (error: any) {
      const userErrorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류';
      Alert.alert('오류', `테스트 로그인 중 오류가 발생했습니다: ${userErrorMessage}`);
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
    <SafeAreaView style={styles.container}>
        <Card variant="basic">
        <View style={styles.header}>
          <Text style={styles.title}>OTTRIP</Text>
          <Text style={styles.subtitle}>여행 계획을 더 스마트하게</Text>
        </View>

        <View style={styles.buttonContainer}>
            <GoogleButton
            onPress={onGoogleSignIn}
            disabled={isLoading}
              isLoading={isLoading}
            />
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
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
}); 