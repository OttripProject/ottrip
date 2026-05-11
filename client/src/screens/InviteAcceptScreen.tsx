import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';

export default function InviteAcceptScreen() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'pending'|'done'|'error'>( 'pending');
  const navigation = useNavigation<any>();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    let token = '';
    if (hash.includes('invite=')) {
      const match = hash.match(/invite=([^&]*)/);
      token = match ? match[1] : '';
    }
    const run = async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      if (!isAuthenticated) {
        try {
          if (Platform.OS === 'web') {
            window.localStorage.setItem('pendingInviteToken', token);
          } else {
            await SecureStore.setItemAsync('pendingInviteToken', token);
          }
        } catch {}
        // @ts-ignore
        navigation.navigate('로그인');
        setStatus('pending');
        return;
      }
      try {
        await api.post(`/private/plans/invitations/${token}/accept`);
        setStatus('done');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('plans-refresh'));
        }
        // @ts-ignore
        navigation.navigate('OTTRIP');
      } catch (e: any) {
        setStatus('error');
      }
    };
    run();
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      {status === 'pending' && <ActivityIndicator size="large" color="#111" />}
      {status === 'done' && <Text style={styles.text}>초대가 수락되었습니다.</Text>}
      {status === 'error' && <Text style={styles.text}>초대 처리 중 알림가 발생했습니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
});


