import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
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
    const token = hash.startsWith('#token=') ? hash.replace('#token=', '') : '';
    const run = async () => {
      if (!token) {
        setStatus('error');
        Alert.alert('오류', '유효하지 않은 초대 링크입니다.');
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
        Alert.alert('완료', '초대를 수락했습니다. 플랜 목록에서 확인하세요.');
        // @ts-ignore
        navigation.navigate('OTTRIP');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('plans-refresh'));
        }
      } catch (e: any) {
        setStatus('error');
        Alert.alert('오류', e?.response?.data?.detail || '초대 수락에 실패했습니다.');
      }
    };
    run();
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      {status === 'pending' && <ActivityIndicator size="large" color="#111" />}
      {status === 'done' && <Text style={styles.text}>초대가 수락되었습니다.</Text>}
      {status === 'error' && <Text style={styles.text}>초대 처리 중 오류가 발생했습니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '600' },
});


