import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/auth';

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 2 ? '==' : base64.length % 4 === 3 ? '=' : '';
  try { return decodeURIComponent(escape(atob(base64 + pad))); } catch { return atob(base64 + pad); }
}

export default function AuthCallbackScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const idToken = params.get('id_token');
    const run = async () => {
      if (!idToken) {
        // @ts-ignore
        navigation.replace('OTTRIP LOGIN');
        return;
      }
      try {
        const response = await authApi.googleLogin(idToken);
        // 이메일 파싱 (REGISTER_TERMS로 전달 용도)
        let email: string | undefined = undefined;
        try {
          const [, payload] = idToken.split('.') as [string, string, string];
          const json = base64UrlDecode(payload);
          const obj = JSON.parse(json);
          email = typeof obj?.email === 'string' ? obj.email : undefined;
        } catch {}
        if (response.isRegistered) {
          await login({
            isRegistered: true,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          });
        } else {
          await login(response);
          // @ts-ignore
          navigation.replace('REGISTER_TERMS', { registerToken: response.registerToken, prefill: response.prefill, email });
          return;
        }
      } finally {
        // 해시 제거
        try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
      }
    };
    run();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#111" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});


