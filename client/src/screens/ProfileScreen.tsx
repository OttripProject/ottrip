import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usersApi, UserProfile } from '@/services/users';
import HeaderBar from '@/components/HeaderBar';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const profile = await usersApi.getMe();
      setMe(profile);
      setNickname(profile.nickname);
      setGender(profile.gender);
      setDescription(profile.description ?? '');
    };
    load();
  }, []);

  const save = async () => {
    const updated = await usersApi.updateMe({ nickname, gender, description });
    setMe(updated);
    navigation.navigate('OTTRIP');
  };

  return (
    <View style={styles.container}>
      <HeaderBar />
      <Text style={styles.title}>프로필</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>이메일</Text>
        <View style={[styles.input, styles.readonly]}>
          <Text style={styles.readonlyText}>{me?.email ?? ''}</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>닉네임</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          {['male', 'female'].map((g) => (
            <Pressable
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>소개</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="자기 소개를 입력하세요"
        />
      </View>

      <Pressable style={styles.contactBtn} onPress={() => setContactOpen(true)}>
        <Text style={styles.contactBtnText}>문의하기</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Pressable style={[styles.actionBtn, styles.logoutBtn]} onPress={logout}>
          <Text style={styles.actionBtnText}>로그아웃</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={save}>
          <Text style={styles.actionBtnText}>변경사항 저장</Text>
        </Pressable>
      </View>

      <Modal visible={contactOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>문의하기</Text>
            <Text style={styles.modalText}>ottrip 공식 이메일로 문의를 보내주세요.</Text>
            <View style={styles.copyRow}>
              <Text style={styles.emailText}>ottrip.official@gmail.com</Text>
              <Pressable
                style={styles.copyBtn}
                onPress={async () => {
                  try {
                    await navigator.clipboard.writeText('ottrip.official@gmail.com');
                  } catch {
                    // noop
                  }
                }}
              >
                <Text style={styles.copyBtnText}>복사</Text>
              </Pressable>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setContactOpen(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#111827' },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  readonly: { backgroundColor: '#f3f4f6' },
  readonlyText: { color: '#374151' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#2563eb22', borderWidth: 1, borderColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#2563eb', fontWeight: '700' },
  contactBtn: { alignSelf: 'flex-start', backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  contactBtnText: { color: '#fff', fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
  logoutBtn: { backgroundColor: '#ef4444' },
  saveBtn: { backgroundColor: '#10b981' },
  actionBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#374151', marginBottom: 8 },
  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  emailText: { fontSize: 14, fontWeight: '600' },
  copyBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { color: '#fff', fontWeight: '700' },
  modalClose: { alignSelf: 'flex-end', marginTop: 12 },
  modalCloseText: { color: '#374151' },
});


