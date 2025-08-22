import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/auth';
import { validateEnv } from '../core/env/schema';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

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

const env = validateEnv();

export default function LoginScreen() {
  const { login, getStorageInfo } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState<string>('');

  // URL에서 ID 토큰 추출 (웹 전용)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      
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
      Alert.alert('오류', 'Google Client ID가 설정되지 않았습니다.');
      return;
    }

    setIsLoading(true);
    try {
      // nonce 생성
      const newNonce = await generateNonce();
      setNonce(newNonce);
      
      if (Platform.OS === 'web') {
        // 웹용 구글 로그인
        const redirectUri = encodeURIComponent(window.location.origin);
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}`;
        
        // 현재 창에서 리다이렉트
        window.location.href = authUrl;
      } else {
        // 모바일용 구글 로그인 (WebBrowser 사용)
        const redirectUri = 'com.ottrip.app.OttripAlpha://oauth2redirect';
        const scope = encodeURIComponent('openid email profile');
        const responseType = 'id_token';
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${newNonce}`;
        
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

  const handleGoogleSignIn = async (accessToken: string) => {
    try {
      const response = await authApi.googleLogin(accessToken);
      
      if (response.isRegistered) {
        await login({
          isRegistered: true,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        // 로그인 성공 시 즉시 로딩 상태 해제하지 않음 (화면 전환 후 자동 해제)
      } else {
        // 신규 사용자 - 자동 등록 처리
          
          try {
            // 자동으로 사용자 등록
            const userData = {
              handle: (response.prefill.name?.toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'user123').substring(0, 36),
              nickname: (response.prefill.name || '사용자').substring(0, 30),
              description: '구글 로그인으로 가입한 사용자입니다.',
              gender: 'male',
            };
            
            const registerResponse = await authApi.registerUser(
              userData,
              response.registerToken
            );
            
            // 등록 완료 후 로그인
            await login({
              isRegistered: true,
              accessToken: registerResponse.accessToken,
              refreshToken: registerResponse.refreshToken,
            });
            // 로그인 성공 시 즉시 로딩 상태 해제하지 않음 (화면 전환 후 자동 해제)
          } catch (error: any) {
            console.error('자동 등록 실패:', error.message);
            setIsLoading(false); // 오류 시에만 로딩 상태 해제
            Alert.alert('오류', '사용자 등록에 실패했습니다.');
          }
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>OTTRIP</Text>
          <Text style={styles.subtitle}>여행 계획을 더 스마트하게</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.googleButton, isLoading && styles.disabledButton]}
            onPress={onGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonText}>
              {isLoading ? '로그인 중...' : 'Google로 로그인'}
            </Text>
          </Pressable>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]}
            onPress={handleTestLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.testButtonText}>
                테스트 로그인 (Dev)
              </Text>
            )}
          </Pressable>

          <Text style={styles.note}>
            * 테스트 로그인은 개발 환경에서만 사용하세요.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    width: 240,
    height: 48,
    marginBottom: 20,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 