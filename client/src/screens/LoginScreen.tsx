import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
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
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
  const { login } = useAuth();
  const navigation = useNavigation<any>();
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
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        const clientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
          Alert.alert('오류', 'Google OAuth 클라이언트 ID가 설정되지 않았습니다.');
          setIsLoading(false);
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
          window.location.href = authUrl;
        } catch (e) {
        }
      } else {
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
            Alert.alert('오류', '로그인에 실패했습니다. id_token을 받을 수 없습니다.');
            setIsLoading(false);
          }
        } catch (error: any) {
          console.error('Google Sign-In 에러:', error);
          
          if (error.code === 'SIGN_IN_CANCELLED') {
            setIsLoading(false);
          } else if (error.code === 'IN_PROGRESS') {
            // 이미 진행 중 - 로딩 상태 유지
          } else {
            Alert.alert('오류', '로그인에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
            setIsLoading(false);
          }
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