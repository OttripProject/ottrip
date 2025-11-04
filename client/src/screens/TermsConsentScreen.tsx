import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/ui/components/GradientBackground';
import Card from '@/ui/components/Card';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

const leftArrowIcon = require('../../assets/left_arrow.png');

type RouteParams = {
  registerToken: string;
  prefill: { name?: string | null; profile_image?: string | null };
  email: string;
};

export default function TermsConsentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { registerToken, prefill, email } = route.params as RouteParams;

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);

  // 모두 동의 체크박스 상태 관리
  useEffect(() => {
    setAgreeAll(agree1 && agree2 && agree3);
  }, [agree1, agree2, agree3]);

  // 모두 동의 토글
  const handleAgreeAll = () => {
    const newValue = !agreeAll;
    setAgreeAll(newValue);
    setAgree1(newValue);
    setAgree2(newValue);
    setAgree3(newValue);
  };

  // 3번은 선택 항목이므로 필수 동의는 1, 2번만
  const allChecked = agree1 && agree2;

  // 그라데이션 각도: 116.82deg → React Native 좌표 변환
  // 116.82도 ≈ 117도, 대각선 방향
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          {/* 카드 - 중앙 정렬 */}
          <Card variant="basic">
            {/* 뒤로가기 버튼 - 카드 내부 기준: left: 64, top: 50 */}
            <Pressable 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Image source={leftArrowIcon} style={styles.backIcon} resizeMode="contain" />
            </Pressable>

            {/* 타이틀 - 카드 내부 기준: left: 40, top: 106 */}
            <Text style={styles.title}>
              Ottrip 계정{'\n'}서비스 약관에 동의해주세요
            </Text>

            {/* 모두 동의 체크박스 - 카드 내부 기준: left: 40, top: 301 */}
            <View style={styles.checkboxAllWrapper}>
              <Pressable 
                style={styles.checkboxAllContainer}
                onPress={handleAgreeAll}
              >
                <View style={[styles.checkbox, agreeAll && styles.checkboxChecked]}>
                  {agreeAll && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>모두 동의</Text>
              </Pressable>
            </View>

            {/* 구분선 - 카드 내부 기준: left: 40, top: 349, width: 400 */}
            <View style={styles.divider} />

            {/* 필수 약관 1 체크박스 - 카드 내부 기준: left: 40, top: 374 */}
            <View style={[styles.checkboxRow, { top: 377 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree1(!agree1)}
              >
                <View style={[styles.checkbox, agree1 && styles.checkboxChecked]}>
                  {agree1 && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>[필수] 서비스 이용 약관</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('상세내용', { key: 'tos' })}>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>

            {/* 필수 약관 2 체크박스 - 카드 내부 기준: left: 40, top: 414 */}
            <View style={[styles.checkboxRow, { top: 417 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree2(!agree2)}
              >
                <View style={[styles.checkbox, agree2 && styles.checkboxChecked]}>
                  {agree2 && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>[필수] 개인정보 수집 및 이용</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('상세내용', { key: 'privacy' })}>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>

            {/* 선택 약관 체크박스 - 카드 내부 기준: left: 40, top: 454 */}
            <View style={[styles.checkboxRow, { top: 457 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree3(!agree3)}
              >
                <View style={[styles.checkbox, agree3 && styles.checkboxChecked]}>
                  {agree3 && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>[선택] 이벤트*혜택 정보 수신 및 활용 동의</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('상세내용', { key: 'marketing' })}>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>

            {/* 다음 버튼 - 카드 내부 기준: left: 40, top: 518, width: 400 */}
            <Pressable
              disabled={!allChecked}
              style={[styles.nextButton, !allChecked && styles.nextButtonDisabled]}
              onPress={() =>
                navigation.navigate('프로필 입력', {
                  registerToken,
                  prefill,
                  email,
                  terms: { tos: agree1, privacy: agree2, marketing: agree3 },
                })
              }
            >
              <Text style={[styles.nextButtonText, !allChecked && styles.nextButtonTextDisabled]}>
                다음
              </Text>
            </Pressable>
          </Card>
        </View>
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
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 뒤로가기 버튼 - 카드 내부 기준: left: 24 (544-520, padding 고려), top: 10 (250-200-40, paddingTop 고려)
  backButton: {
    position: 'absolute',
    left: 40, // 544 - 480 - 40(padding) = 24, 또는 padding 기준으로는 544-520=24
    top: 50, // 250 - 200 - 40(paddingTop) = 10
    width: 24,
    height: 24,
    zIndex: 1,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  // 타이틀 - 카드 내부 기준: left: 40 (520-480), top: 106 (306-200)
  title: {
    position: 'absolute',
    left: 40,
    top: 106,
    ...textStyles.h2,
  },
  // 모두 동의 - 카드 내부 기준: left: 40 (520-480), top: 301 (501-200)
  checkboxAllWrapper: {
    position: 'absolute',
    left: 43,
    top: 304,
  },
  checkboxAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 필수 약관 체크박스 row - left: 40 (520-480), top은 각각 설정
  checkboxRow: {
    position: 'absolute',
    left: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 400,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18, // 전체 체크박스 (Box 18px + padding 3px * 2)
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.gray400, // #D4D4D4 (CSS와 동일)
    backgroundColor: colors.white,
    marginRight: 8, // 텍스트 x=552, 체크박스 x=520, width=24 → 552-520-24=8
    justifyContent: 'center',
    alignItems: 'center',
    // box-sizing: border-box (기본값이 border-box)
  },
  checkboxChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  checkMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  checkboxLabel: {
    ...textStyles.body2,
  },
  // 구분선 - 카드 내부 기준: left: 40 (520-480), top: 349 (549-200), width: 400
  divider: {
    position: 'absolute',
    left: 40,
    top: 349,
    width: 400,
    height: 1,
    backgroundColor: colors.gray300,
  },
  chevron: {
    fontSize: 24,
    color: colors.gray600,
    paddingLeft: 8,
  },
  // 다음 버튼 - 카드 내부 기준: left: 40 (520-480), top: 518 (718-200), width: 400
  nextButton: {
    position: 'absolute',
    left: 40,
    top: 518,
    width: 400,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  nextButtonText: {
    ...textStyles.h5,
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    lineHeight: 24,
  },
  nextButtonTextDisabled: {
    color: colors.black,
  },
});


