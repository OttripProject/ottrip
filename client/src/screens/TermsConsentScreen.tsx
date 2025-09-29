import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TERMS } from '@/constants/terms';

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

  // 3번은 선택 항목이므로 필수 동의는 1, 2번만
  const allChecked = agree1 && agree2;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ottrip 계정 서비스 약관에 동의해주세요</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Pressable style={styles.row} onPress={() => setAgree1(!agree1)}>
            <View style={[styles.checkbox, agree1 && styles.checkboxOn]} />
            <Text style={styles.label}>[필수] 서비스 이용약관 동의</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TERMS_DETAIL', { key: 'tos' })}>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Pressable style={styles.row} onPress={() => setAgree2(!agree2)}>
            <View style={[styles.checkbox, agree2 && styles.checkboxOn]} />
            <Text style={styles.label}>[필수] 개인정보수집 및 이용</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TERMS_DETAIL', { key: 'privacy' })}>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Pressable style={styles.row} onPress={() => setAgree3(!agree3)}>
            <View style={[styles.checkbox, agree3 && styles.checkboxOn]} />
            <Text style={styles.label}>[선택] 이벤트*혜택 정보 수신 및 활용 동의</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TERMS_DETAIL', { key: 'marketing' })}>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        disabled={!allChecked}
        style={[styles.nextBtn, !allChecked && styles.nextBtnDisabled]}
        onPress={() =>
          navigation.navigate('REGISTER_PROFILE', {
            registerToken,
            prefill,
            email,
            terms: { tos: agree1, privacy: agree2, marketing: agree3 },
          })
        }
      >
        <Text style={styles.nextText}>다음</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16, color: '#111827' },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, backgroundColor: '#fafafa', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#9ca3af', marginRight: 12, backgroundColor: '#fff' },
  checkboxOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  label: { fontSize: 15, color: '#374151' },
  chevron: { fontSize: 18, color: '#9ca3af', paddingHorizontal: 8, paddingVertical: 4 },
  nextBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#93c5fd' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});


