import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/services/auth';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import { Input } from '@/ui/components/input/Input';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { Gender } from '@/types/api';
import api from '@/services/api';

import LeftArrowIcon from '../../assets/left_arrow_L.svg';
import CloseIcon from '../../assets/mobile_x.svg';
import GenderCheckIcon from '../../assets/gender_check.svg';

type RouteParams = {
  registerToken: string;
  prefill: { name?: string | null; profile_image?: string | null };
  email: string;
  terms?: { tos: boolean; privacy: boolean; marketing: boolean };
};

function toHandleFromEmail(email: string): string {
  const local = email.split('@')[0] || '';
  const base = local.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return base.slice(0, 20) || 'user123';
}

export default function RegisterProfileScreenNative() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { registerToken, prefill, email, terms } = route.params as RouteParams;

  const [nickname, setNickname] = useState(prefill?.name || '');
  const [gender, setGender] = useState<Gender | null>(null);
  const [handle] = useState(() => toHandleFromEmail(email));

  const { nicknameError, checkingNickname, onNicknameChange, isValid } = useNicknameValidation();

  useEffect(() => {
    if (nickname.trim().length > 0) {
      onNicknameChange(nickname);
    }
  }, []);

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const canSubmit = isValid && nickname.trim().length > 0 && gender !== null;

  const onSubmit = async () => {
    if (!canSubmit || gender === null) return;
    try {
      const registerResponse = await authApi.registerUser(
        {
          handle,
          nickname: nickname.trim(),
          description: '',
          gender,
          agreed_terms: terms?.tos ?? true,
          agreed_privacy: terms?.privacy ?? true,
          agreed_marketing: terms?.marketing ?? false,
        },
        registerToken
      );

      try {
        await SecureStore.setItemAsync('registerComplete', 'true');
      } catch {}

      try {
        const token = await SecureStore.getItemAsync('pendingInviteToken');
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          await SecureStore.deleteItemAsync('pendingInviteToken');
        }
      } catch {}

      navigation.navigate('가입완료', {
        accessToken: registerResponse.accessToken,
        refreshToken: registerResponse.refreshToken,
      });

    } catch (e: any) {
      Alert.alert('가입 실패', e?.response?.data?.detail || e.message || '알 수 없는 오류');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('로그인')}
          hitSlop={8}
        >
          <LeftArrowIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>회원가입</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.navigate('로그인')}
          hitSlop={8}
        >
          <CloseIcon width={24} height={24} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 타이틀 */}
          <Text style={styles.title}>프로필 설정</Text>
          <Text style={styles.subtitle}>개인정보 및 환경설정을 관리하세요.</Text>

          {/* 이메일 */}
          <Text style={styles.fieldLabel}>이메일</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* 닉네임 */}
          <Text style={styles.fieldLabel}>닉네임</Text>
          <Input
            placeholder="닉네임을 입력해주세요."
            placeholderTextColor={colors.gray600}
            value={nickname}
            onChangeText={handleNicknameChange}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {nicknameError ? (
            <Text style={styles.errorText}>{nicknameError}</Text>
          ) : !checkingNickname && nickname.trim().length > 0 ? (
            <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
          ) : null}

          {/* 성별 */}
          <View style={styles.genderRow}>
            {([Gender.MALE, Gender.FEMALE] as Gender[]).map((g) => (
              <Pressable key={g} style={styles.genderOption} onPress={() => setGender(g)}>
                <View style={[styles.radio, gender === g ? styles.radioSelected : styles.radioUnselected]}>
                  <GenderCheckIcon width={16} height={16} color={colors.white} />
                </View>
                <Text style={styles.genderLabel}>{g === Gender.MALE ? '남성' : '여성'}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        <Pressable
          style={[styles.nextButton, !canSubmit && styles.nextButtonDisabled]}
          disabled={!canSubmit}
          onPress={onSubmit}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.white,
  },
  headerBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...textStyles.h5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 24,
  },
  title: {
    ...textStyles.h2,
    marginBottom: 8,
  },
  subtitle: {
    ...textStyles.body3,
    color: colors.gray600,
    marginBottom: 32,
  },
  fieldLabel: {
    ...textStyles.h7,
    marginBottom: 8,
  },
  emailBox: {
    height: 48,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emailText: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  input: {
    height: 48,
    marginBottom: 6,
  },
  errorText: {
    ...textStyles.body5,
    color: colors.danger,
  },
  successText: {
    ...textStyles.body5,
    color: colors.success,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 14,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    borderColor: colors.gray400,
    backgroundColor: colors.gray400,
  },
  radioSelected: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  genderLabel: {
    ...textStyles.body3,
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  nextButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  nextButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
