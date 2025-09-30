import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { authApi } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';

type RouteParams = {
  registerToken: string;
  prefill: { name?: string | null; profile_image?: string | null };
  email: string;
  terms?: { tos: boolean; privacy: boolean; marketing: boolean };
};

// 길이 계산: 한글(가-힣)은 2, 그 외는 1로 계산
function getDisplayLength(text: string): number {
  let len = 0;
  for (const ch of text) {
    if (/^[\u3131-\uD79D]$/.test(ch)) len += 2; // 한글 범위
    else len += 1;
  }
  return len;
}

// 닉네임 검증: 한글 1~10자 또는 영문 1~20자, 특수문자 '_', '-', '.' 허용
function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  const trimmed = nickname.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: '닉네임을 입력해주세요.' };
  }
  
  // 한글 1~10자 또는 영문 1~20자, 특수문자 _-. 허용
  const pattern = /^(?:[가-힣0-9_.-]{1,10}|[A-Za-z0-9_.-]{1,20})$/;
  if (!pattern.test(trimmed)) {
    return { 
      isValid: false, 
      error: '닉네임은 한글 1~10자 또는 영문 1~20자이며, 특수문자는 \'_\', \'-\', \'.\'만 허용합니다.' 
    };
  }
  
  return { isValid: true };
}

function toHandleFromEmail(email: string): string {
  const local = email.split('@')[0] || '';
  const base = local.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return base.slice(0, 20) || 'user123';
}

export default function RegisterProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { registerToken, prefill, email, terms } = route.params as RouteParams;

  const [nickname, setNickname] = useState(prefill?.name || '');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [handle] = useState(() => toHandleFromEmail(email));
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const checkNicknameTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerNicknameCheck = useCallback((nickname: string) => {
    if (checkNicknameTimer.current) clearTimeout(checkNicknameTimer.current);
    checkNicknameTimer.current = setTimeout(async () => {
      setCheckingNickname(true);
      try {
        const res = await authApi.validateNickname(nickname);
        setNicknameError(res.error);
      } catch (e: any) {
        setNicknameError('중복 확인 실패. 잠시 후 다시 시도해주세요.');
      } finally {
        setCheckingNickname(false);
      }
    }, 500);
  }, []);

  const onNicknameChange = (text: string) => {
    setNickname(text);
    const validation = validateNickname(text);
    if (validation.isValid) {
      setNicknameError(null);
      triggerNicknameCheck(text);
    } else {
      setNicknameError(validation.error || null);
    }
  };

  const canSubmit = !nicknameError && !checkingNickname && nickname.trim().length > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      const registerResponse = await authApi.registerUser(
        {
          handle,
          nickname: nickname.trim(),
          description: '구글 로그인으로 가입한 사용자입니다.',
          gender,
          agreed_terms: terms?.tos ?? true,
          agreed_privacy: terms?.privacy ?? true,
          agreed_marketing: terms?.marketing ?? false,
        },
        registerToken
      );

      await login({
        isRegistered: true,
        accessToken: registerResponse.accessToken,
        refreshToken: registerResponse.refreshToken,
      } as any);

      try {
        const token = await SecureStore.getItemAsync('pendingInviteToken');
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          await SecureStore.deleteItemAsync('pendingInviteToken');
        }
      } catch {}

      // 로그인 전환되며 대시보드로 이동
    } catch (e: any) {
      Alert.alert('가입 실패', e?.response?.data?.detail || e.message || '알 수 없는 오류');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로필 설정</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>이메일</Text>
        <View style={[styles.input, styles.readonly]}>
          <Text style={styles.readonlyText}>{email}</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={onNicknameChange} />
        {checkingNickname && <Text style={styles.hint}>중복 확인 중...</Text>}
        {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
        {!nicknameError && !checkingNickname && nickname.trim().length > 0 && (
          <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          {(['male','female'] as const).map((g) => (
            <Pressable key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g)}>
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g === 'male' ? '남자' : '여자'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable disabled={!canSubmit} style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} onPress={onSubmit}>
        <Text style={styles.submitText}>회원가입</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, color: '#111827' },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff' },
  readonly: { backgroundColor: '#f3f4f6' },
  readonlyText: { color: '#374151' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#2563eb22', borderWidth: 1, borderColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#2563eb', fontWeight: '700' },
  hint: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  errorText: { marginTop: 6, fontSize: 12, color: '#ef4444' },
  successText: { marginTop: 6, fontSize: 12, color: '#10b981' },
  submitBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { backgroundColor: '#a7f3d0' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});


