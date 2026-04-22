import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { authApi, type AuthResponse } from '@/services/auth';
import { loadPublicEnv } from '@/core/env/schema';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import api from '@/services/api';
import { textStyles } from '@/ui/tokens/typography';
import { colors } from '@/ui/tokens/colors';
import GoogleButton from '@/ui/components/GoogleButton';
import AppleButton from '@/ui/components/AppleButton';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const env = loadPublicEnv();

const base64UrlDecode = (input: string) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 2 ? '==' : base64.length % 4 === 3 ? '=' : '';
  const str = atob(base64 + pad);
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
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

export default function LoginScreenNative() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS !== 'ios') {
        return;
      }
      try {
        const ok = await AppleAuthentication.isAvailableAsync();
        if (mounted) {
          setIsAppleAuthAvailable(ok);
        }
      } catch {
        if (mounted) {
          setIsAppleAuthAvailable(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const iosClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
    const webClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (iosClientId && webClientId) {
      GoogleSignin.configure({
        iosClientId,
        webClientId,
        offlineAccess: false,
      });
    } else if (webClientId) {
      GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
      });
    }
  }, []);

  const completeAuthResponse = async (response: AuthResponse, tokenForEmail: string) => {
    if (response.isRegistered) {
      await login({
        isRegistered: true,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      try {
        const token = await SecureStore.getItemAsync('pendingInviteToken');
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          await SecureStore.deleteItemAsync('pendingInviteToken');
        }
      } catch {}

      setIsLoading(false);
      return;
    }

    await login(response);
    const payload = parseIdToken(tokenForEmail);
    const email = payload?.email ?? '';
    navigation.navigate('약관동의', {
      registerToken: response.registerToken,
      prefill: response.prefill,
      email,
    });
    setIsLoading(false);
  };

  const submitGoogleToken = async (idToken: string) => {
    try {
      const response = await authApi.googleLogin(idToken);
      await completeAuthResponse(response, idToken);
    } catch {
      setIsLoading(false);
      Alert.alert('오류', '로그인에 실패했습니다.');
    }
  };

  const submitAppleToken = async (identityToken: string) => {
    try {
      const response = await authApi.appleLogin(identityToken);
      await completeAuthResponse(response, identityToken);
    } catch {
      setIsLoading(false);
      Alert.alert('오류', '로그인에 실패했습니다.');
    }
  };

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices();
        } catch {
          Alert.alert('오류', 'Google Play Services를 사용할 수 없습니다.');
          setIsLoading(false);
          return;
        }
      }

      const signInResult = await GoogleSignin.signIn();
      const idToken =
        (signInResult as any).data?.idToken || (signInResult as any).idToken;

      if (idToken) {
        await submitGoogleToken(idToken);
      } else {
        Alert.alert('오류', '로그인에 실패했습니다. id_token을 받을 수 없습니다.');
        setIsLoading(false);
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        setIsLoading(false);
      } else if (error.code !== 'IN_PROGRESS') {
        Alert.alert('오류', '로그인에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        setIsLoading(false);
      }
    }
  };

  const onAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      return;
    }
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await submitAppleToken(credential.identityToken);
      } else {
        setIsLoading(false);
        Alert.alert('오류', 'Apple 로그인 토큰을 받을 수 없습니다.');
      }
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined;
      if (code === 'ERR_REQUEST_CANCELED') {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      const message = e instanceof Error ? e.message : 'Apple 로그인에 실패했습니다.';
      Alert.alert('오류', message);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>OTTRIP</Text>
          <Text style={styles.subtitle}>여행 계획을 더 스마트하게</Text>

          <View style={styles.buttonContainer}>
            <GoogleButton
              onPress={onGoogleSignIn}
              disabled={isLoading}
              isLoading={isLoading}
              style={styles.googleButton}
              iconSize={20}
              textStyle={styles.googleButtonText}
            />
            {isAppleAuthAvailable ? (
              <AppleButton
                onPress={onAppleSignIn}
                disabled={isLoading}
                isLoading={isLoading}
                style={styles.appleButton}
                textStyle={styles.appleButtonText}
                iconSize={34}
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 327,
    alignItems: 'center',
  },
  title: {
    ...textStyles.h1,
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...textStyles.body2,
    color: colors.gray800,
    marginBottom: 36,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    maxWidth: 327,
    height: 50,
    borderRadius: 12,
  },
  googleButtonText: {
    ...textStyles.h6,
  },
  appleButton: {
    width: '100%',
    maxWidth: 327,
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
  appleButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
