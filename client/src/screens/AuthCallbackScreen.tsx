import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/auth';
import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';

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
    
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {}
    
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const idToken = params.get('id_token');
    
    const run = async () => {
      if (!idToken) {
        // @ts-ignore
        navigation.replace('로그인');
        return;
      }
      try {
        const response = await authApi.googleLogin(idToken);
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
          // @ts-ignore
          navigation.replace('약관동의', { registerToken: response.registerToken, prefill: response.prefill, email });
          return;
        }
      } catch (error: any) {
        // @ts-ignore
        navigation.replace('로그인');
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


