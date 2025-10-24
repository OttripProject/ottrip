import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { plansApi, PlanShare } from '@/services/plans';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: { email: string; role: 'editor' | 'viewer'; expires_days?: number }) => Promise<void>;
  planId: number;
};

export default function SharePlanModal({ visible, onClose, onSubmit, planId }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [days, setDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [shares, setShares] = useState<PlanShare[]>([]);

  const loadShares = async () => {
    if (!planId) return;
    setListLoading(true);
    try {
      const data = await plansApi.listShares(planId);
      setShares(data);
    } catch (e: any) {
      // noop
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void loadShares();
    }
  }, [visible]);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ email: email.trim(), role, expires_days: Number(days) || undefined });
      onClose();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail || e?.message || '초대 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>플랜 공유</Text>
          {/* 공유된 사용자 리스트 */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>공유된 사용자</Text>
            {listLoading ? (
              <ActivityIndicator />
            ) : shares.length === 0 ? (
              <Text style={styles.empty}>아직 공유된 사용자가 없습니다.</Text>
            ) : (
              shares.map((s) => (
                <View key={`${s.handle}-${s.role}`} style={styles.shareRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareEmail}>{s.nickname}</Text>
                    <Text style={styles.shareNickname}>@{s.handle}</Text>
                  </View>
                  <Text style={styles.roleBadge}>{s.role === 'editor' ? '수정' : '읽기'}</Text>
                  <Pressable
                    style={styles.revokeBtn}
                    onPress={async () => {
                      try {
                        await plansApi.revokeShare(planId, s.handle);
                        await loadShares();
                      } catch (e: any) {
                        const msg = e?.response?.status === 403 ? '권한이 없습니다.' : (e?.response?.data?.detail || '삭제에 실패했습니다.');
                        Alert.alert('오류', msg);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>삭제</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <Text style={styles.label}>이메일</Text>
          <Input
            placeholder={PLACEHOLDERS.plan.email}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>권한</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.roleBtn, role === 'viewer' && styles.roleBtnActive]}
              onPress={() => setRole('viewer')}
            >
              <Text style={styles.roleText}>읽기</Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'editor' && styles.roleBtnActive]}
              onPress={() => setRole('editor')}
            >
              <Text style={styles.roleText}>수정</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>만료일(일)</Text>
          <Input
            placeholder={PLACEHOLDERS.plan.share_expires_days}
            keyboardType="number-pad"
            value={days}
            onChangeText={setDays}
          />

          <View style={[styles.row, { marginTop: 12 }]}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={onClose} disabled={loading}>
              <Text style={styles.btnText}>취소</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.submit]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>전송</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  shareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  shareEmail: { fontSize: 13, fontWeight: '600', color: '#111' },
  shareNickname: { fontSize: 12, color: '#6b7280' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#111', color: '#fff', borderRadius: 6, marginRight: 8 },
  revokeBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  empty: { fontSize: 12, color: '#6b7280' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  roleBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginTop: 6 },
  roleBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  roleText: { color: '#111', fontWeight: '600' },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  cancel: { backgroundColor: '#f3f4f6', marginRight: 8 },
  submit: { backgroundColor: '#111' },
  btnText: { fontWeight: '700' },
});


