import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';

import CheckIcon from '../../assets/mobile_plan_checked.svg';

type RouteParams = {
  accessToken: string;
  refreshToken: string;
};

export default function RegisterCompleteScreenNative() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login } = useAuth();
  const { accessToken, refreshToken } = route.params as RouteParams;

  const handleStart = async () => {
    await login({
      isRegistered: true,
      accessToken,
      refreshToken,
    } as any);
    // 게스트 업그레이드는 isAuthenticated가 이미 true → 스택이 자동으로 안 바뀌므로 메인으로 보냄
    // 비로그인 가입은 스택이 갈아끼워지지만, 동일 reset으로 일관되게 OTTRIP으로 이동
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'OTTRIP' }] }),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CheckIcon width={56} height={56} />
        </View>
        <Text style={styles.title}>가입이 완료되었어요!</Text>
        <Text style={styles.subtitle}>
          {'이제 ottrip의 모든 서비스를 자유롭게\n이용할 수 있어요.'}
        </Text>
      </View>

      <View style={styles.bottomArea}>
        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>ottrip 시작하기</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: -240,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...textStyles.h2,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...textStyles.body3,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  startButton: {
    paddingVertical: 16,
    backgroundColor: colors.black,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
