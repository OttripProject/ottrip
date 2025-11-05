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
import api from '@/services/api';
import { textStyles, typography } from '../ui/tokens/typography';
import GradientBackground from '../ui/components/GradientBackground';
import Card from '../ui/components/Card';
import GoogleButton from '../ui/components/GoogleButton';

// nonce 생성 함수 (크로스 플랫폼)
const generateNonce = async () => {
  if (Platform.OS === 'web' && typeof crypto !== 'undefined') {
    // 웹에서는 crypto API 사용
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // 모바일에서는 expo-crypto 사용
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
};

const env = loadPublicEnv();

export default function LoginScreen() {
  const { login, getStorageInfo } = useAuth();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState<string>('');

  // URL에서 ID 토큰 추출 (웹 전용)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;

      // 초대 토큰 보관(#invite=...)
      if (hash && hash.includes('invite=')) {
        const params = new URLSearchParams(hash.substring(1));
        const inviteToken = params.get('invite');
        if (inviteToken) {
          try { window.localStorage.setItem('pendingInviteToken', inviteToken); } catch {}
          // 해시 제거
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      // 구글 id_token 처리 (콜백 경로가 아닌 /login으로 돌아온 경우도 대비한 폴백)
      if (hash && hash.includes('id_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get('id_token');
        if (idToken) {
          handleGoogleSignIn(idToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [nonce]);

  // 크로스 플랫폼 구글 로그인
  const onGoogleSignIn = async () => {
    const clientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.error('Google Client ID가 비어있습니다. Cloudflare Pages 환경변수를 확인하세요.');
      }
      return;
    }

    setIsLoading(true);
    try {
      // nonce 생성
      const newNonce = await generateNonce();
      setNonce(newNonce);
      
      if (Platform.OS === 'web') {
        // 웹용 구글 로그인
        const redirectUriRaw = `${window.location.origin}/auth/callback`; // 콜백 전용 경로
        const redirectUri = encodeURIComponent(redirectUriRaw);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        const prompt = encodeURIComponent('consent select_account');
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}&prompt=${prompt}`;
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line no-console
          console.log('Google Auth URL:', decodeURIComponent(authUrl));
        }
        
        // 현재 창에서 리다이렉트
        try {
          window.location.href = authUrl;
        } catch (e) {
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line no-console
            console.error('구글 로그인 리다이렉트 실패:', e);
          }
        }
      } else {
        // 모바일용 구글 로그인 (WebBrowser 사용)
        const redirectUri = 'com.ottrip.app.OttripAlpha://oauth2redirect';
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        const prompt = encodeURIComponent('consent select_account');
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}&prompt=${prompt}`;
        
        // WebBrowser로 구글 로그인 페이지 열기
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        
        if (result.type === 'success' && result.url) {
          // URL에서 id_token 추출
          let idToken: string | null = null;
          
          try {
            const url = new URL(result.url);
            const fragment = url.hash.substring(1);
            const params = new URLSearchParams(fragment);
            idToken = params.get('id_token');
          } catch (urlError) {
            // URL 파싱 실패 시 다른 방법 시도
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
          console.log('사용자가 로그인을 취소했습니다.');
          setIsLoading(false); // 취소 시 로딩 상태 해제
        } else {
          Alert.alert('오류', '로그인에 실패했습니다.');
          setIsLoading(false); // 실패 시 로딩 상태 해제
        }
      }
    } catch (error: any) {
      console.error('Google 로그인 오류:', error.message);
      Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
      setIsLoading(false); // 오류 시에만 로딩 상태 해제
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
        // 웹: 네비게이션은 RootNavigator가 postLoginRedirect로 처리하도록 위임
        // 여기서는 아무 것도 하지 않음(레이스/스택 미존재 오류 방지)
        // 로그인 직후 pending 초대 토큰 자동 처리
        try {
          const token = Platform.OS === 'web'
            ? window.localStorage.getItem('pendingInviteToken')
            : await SecureStore.getItemAsync('pendingInviteToken');
          if (token) {
            await api.post(`/private/plans/invitations/${token}/accept`);
            if (Platform.OS === 'web') window.localStorage.removeItem('pendingInviteToken');
            else await SecureStore.deleteItemAsync('pendingInviteToken');
          }
        } catch {}
        // 로그인 성공 시 즉시 로딩 상태 해제하지 않음 (화면 전환 후 자동 해제)
      } else {
        // 미등록 사용자: 약관 → 프로필 설정 플로우로 이동
        await login(response); // registerToken 저장
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
      console.error('Google 로그인 오류:', error.message);
      setIsLoading(false); // 오류 시에만 로딩 상태 해제
      Alert.alert('오류', '로그인에 실패했습니다.');
    }
  };

  // Dev 테스트 라우터를 사용한 실제 로그인
  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      // 서버 연결 테스트
      try {
        const timeData = await authApi.getServerTime();
      } catch (error) {
        console.error('서버 시간 확인 실패:', error);
        Alert.alert('연결 오류', '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        return;
      }

      // Dev 테스트 라우터로 테스트 유저 생성 및 토큰 발급
      try {
        const tokenData = await authApi.createTestUser();
        
        // 응답 데이터 구조 확인
        if (!tokenData || !tokenData.accessToken || !tokenData.refreshToken) {
          console.error('토큰 데이터 구조:', tokenData);
          throw new Error('Invalid token response structure');
        }
        
        // 실제 토큰으로 로그인
        await login({
          isRegistered: true,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        });
        
        // 로그인 성공 시 즉시 로딩 상태 해제하지 않음 (화면 전환 후 자동 해제)
        
      } catch (error: any) {
        console.error('테스트 유저 생성 실패:', error);
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
      console.error('Test login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류';
      Alert.alert('오류', `테스트 로그인 중 오류가 발생했습니다: ${errorMessage}`);
      setIsLoading(false); // 오류 시에만 로딩 상태 해제
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
    fontWeight: '600',
    color: '#0066FF',
    marginBottom: 8, 
    fontFamily: typography.fontFamily.poppins,
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