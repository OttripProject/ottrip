import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usersApi, UserProfile } from '@/services/users';
import HeaderBar from '@/components/modals/HeaderModal';
import { useAuth } from '@/contexts/AuthContext';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // 닉네임 검증 훅 사용
  const { nicknameError, checkingNickname, onNicknameChange, isValid } = useNicknameValidation(me?.nickname);

  useEffect(() => {
    const load = async () => {
      const profile = await usersApi.getMe();
      setMe(profile);
      setNickname(profile.nickname);
      setGender(profile.gender);
    };
    load();
  }, []);

  // 닉네임 변경 핸들러 (훅과 연동)
  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const save = async () => {
    // 닉네임 검증
    if (!isValid) {
      Alert.alert('오류', '닉네임을 확인해주세요.');
      return;
    }
    
    const updated = await usersApi.updateMe({ nickname, gender });
    setMe(updated);
    navigation.navigate('OTTRIP');
  };

  const handleDeleteAccount = () => {
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await usersApi.deleteAccount();
      setDeleteModalOpen(false);
      logout();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '탈퇴 중 오류가 발생했습니다.';
      setDeleteModalOpen(false);
      if (Platform.OS === 'web') {
        window.alert(`오류: ${errorMessage}`);
      } else {
        Alert.alert('오류', errorMessage);
      }
    }
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
        <Input placeholder={PLACEHOLDERS.profile.nickname} value={nickname} onChangeText={handleNicknameChange} />
        {checkingNickname && <Text style={styles.hint}>중복 확인 중...</Text>}
        {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
        {!nicknameError && !checkingNickname && nickname.trim().length > 0 && nickname !== me?.nickname && (
          <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          {['남자', '여자'].map((g) => (
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

      <Pressable style={styles.contactBtn} onPress={() => setContactOpen(true)}>
        <Text style={styles.contactBtnText}>문의하기</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Pressable style={[styles.actionBtn, styles.logoutBtn]} onPress={logout}>
          <Text style={styles.actionBtnText}>로그아웃</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>계정 탈퇴</Text>
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
                style={[styles.copyBtn, copied && styles.copyBtnCopied]}
                onPress={async () => {
                  try {
                    await navigator.clipboard.writeText('ottrip.official@gmail.com');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    // noop
                  }
                }}
              >
                <Text style={styles.copyBtnText}>{copied ? '복사됨' : '복사'}</Text>
              </Pressable>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setContactOpen(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 탈퇴 확인 모달 */}
      <Modal visible={deleteModalOpen} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalCard}>
            <Text style={styles.deleteModalTitle}>정말 계정을 삭제하시겠어요?</Text>
            <Text style={styles.deleteModalText}>
              계정을 삭제하면 지금까지 만든 여행 일정이 모두 사라지며,{'\n'}
              다시 복구할 수 없어요.
            </Text>
            <View style={styles.deleteModalButtonRow}>
              <Pressable 
                style={styles.deleteModalButton} 
                onPress={() => setDeleteModalOpen(false)}
              >
                <Text style={styles.deleteModalButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={styles.deleteModalButton} 
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.deleteModalButtonText}>삭제</Text>
              </Pressable>
            </View>
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
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  successText: { fontSize: 12, color: '#10b981', marginTop: 4 },
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
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#374151', marginBottom: 8 },
  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  emailText: { fontSize: 14, fontWeight: '600' },
  copyBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  copyBtnCopied: { backgroundColor: '#10b981' },
  copyBtnText: { color: '#fff', fontWeight: '700' },
  modalClose: { alignSelf: 'flex-end', marginTop: 12 },
  modalCloseText: { color: '#374151' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#f3f4f6' },
  modalButtonDelete: { backgroundColor: '#dc2626' },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalButtonDeleteText: { color: '#fff' },
  // 탈퇴 모달 스타일
  deleteModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20
  },
  deleteModalCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center'
  },
  deleteModalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#374151', 
    marginBottom: 12,
    textAlign: 'center'
  },
  deleteModalText: { 
    fontSize: 14, 
    color: '#6b7280', 
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24
  },
  deleteModalButtonRow: { 
    flexDirection: 'row', 
    width: '100%',
    gap: 12
  },
  deleteModalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderRadius: 8, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  deleteModalButtonText: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#dc2626'
  },
});


