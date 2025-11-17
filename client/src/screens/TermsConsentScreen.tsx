import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/ui/components/GradientBackground';
import Card from '@/ui/components/Card';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

import LeftArrowIcon from '../../assets/left_arrow.svg';
import CheckIcon from '../../assets/check.svg';
import RightArrowTermIcon from '../../assets/right_arrow_term.svg';

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

  useEffect(() => {
    setAgreeAll(agree1 && agree2 && agree3);
  }, [agree1, agree2, agree3]);

  const handleAgreeAll = () => {
    const newValue = !agreeAll;
    setAgreeAll(newValue);
    setAgree1(newValue);
    setAgree2(newValue);
    setAgree3(newValue);
  };

  const allChecked = agree1 && agree2;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          <Card variant="basic" alignItems="flex-start">
            <Pressable 
              style={styles.backButton}
              onPress={() => navigation.navigate('로그인')}
            >
              <LeftArrowIcon width={24} height={24} fill={colors.black} />
            </Pressable>

            <Text style={styles.title}>
              Ottrip 계정{'\n'}서비스 약관에 동의해주세요
            </Text>

            <View style={styles.checkboxAllWrapper}>
        <Pressable 
                style={styles.checkboxAllContainer}
                onPress={handleAgreeAll}
              >
                <View style={[styles.checkbox, agreeAll && styles.checkboxChecked]}>
                  {agreeAll && <CheckIcon width={14} height={14} fill={colors.white} />}
                </View>
                <Text style={styles.checkboxLabel}>모두 동의</Text>
        </Pressable>
      </View>

            <View style={styles.divider} />

            <View style={[styles.checkboxRow, { top: 377 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree1(!agree1)}
              >
                <View style={[styles.checkbox, agree1 && styles.checkboxChecked]}>
                  {agree1 && <CheckIcon width={14} height={14} fill={colors.white} />}
                </View>
                <Text style={styles.checkboxLabel}>[필수] 서비스 이용 약관</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('상세내용', { key: 'tos' })}>
                <RightArrowTermIcon style={styles.termsChevron} />
          </Pressable>
        </View>

            <View style={[styles.checkboxRow, { top: 417 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree2(!agree2)}
              >
                <View style={[styles.checkbox, agree2 && styles.checkboxChecked]}>
                  {agree2 && <CheckIcon width={14} height={14} fill={colors.white} />}
                </View>
                <Text style={styles.checkboxLabel}>[필수] 개인정보 수집 및 이용</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('상세내용', { key: 'privacy' })}>
                <RightArrowTermIcon style={styles.termsChevron} />
          </Pressable>
        </View>

            <View style={[styles.checkboxRow, { top: 457 }]}>
              <Pressable 
                style={styles.checkboxContainer}
                onPress={() => setAgree3(!agree3)}
              >
                <View style={[styles.checkbox, agree3 && styles.checkboxChecked]}>
                  {agree3 && <CheckIcon width={14} height={14} fill={colors.white} />}
                </View>
                <Text style={styles.checkboxLabel}>[선택] 이벤트*혜택 정보 수신 및 활용 동의</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('상세내용', { key: 'marketing' })}>
                <RightArrowTermIcon style={styles.termsChevron} />
          </Pressable>
      </View>

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
  backButton: {
    position: 'absolute',
    left: 40,
    top: 50,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  title: {
    position: 'absolute',
    left: 40,
    top: 106,
    ...textStyles.h2,
  },
  checkboxAllWrapper: {
    position: 'absolute',
    left: 43,
    top: 304,
  },
  checkboxAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  checkboxLabel: {
    ...textStyles.body2,
  },
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
  nextButton: {
    position: 'absolute',
    left: 40,
    top: 518,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
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
  },
  nextButtonTextDisabled: {
    color: colors.black,
  },
  termsChevron: {
    width: 16,
    height: 16,
  },
});
