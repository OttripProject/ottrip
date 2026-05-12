import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { plansApi, PlanShare } from '@/services/plans';
import Input from '@/ui/components/input/Input';
import Card from '@/ui/components/Card';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import ShareAddIcon from '../../../assets/share_add.svg';
import ShareDeleteIcon from '../../../assets/share_del.svg';
import ShareCheckIcon from '../../../assets/share_check.svg';
import XIcon from '../../../assets/x.svg';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: { email: string; role: 'editor' | 'viewer'; expires_days?: number }) => Promise<void>;
  planId: number;
  planName?: string;
};

export default function SharePlanModal({ visible, onClose, onSubmit, planId, planName }: Props) {
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
      setEmail('');
      await loadShares();
    } catch (e: any) {
      Alert.alert('알림', e?.response?.data?.detail || e?.message || '초대 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card
          width="100%"
          maxWidth={420}
          paddingHorizontal={32}
          paddingVertical={32}
          borderRadius={24}
          alignItems="stretch"
          shadow={{
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.12,
            shadowRadius: 48,
            elevation: 24,
          }}
          style={{ marginHorizontal: 16 }}
        >
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>
                {planName ? `여행 공유: ${planName}` : '여행 공유'}
              </Text>
              <Text style={styles.description}>다른 사람과 여행을 공유하고 함께 계획을 세워보세요.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <XIcon width={24} height={24} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이메일</Text>
            <View style={styles.emailRow}>
              <Input
                placeholder={PLACEHOLDERS.plan.email}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                containerStyle={styles.emailInputContainer}
                style={styles.emailInput}
              />
              <Pressable
                style={[styles.inviteButton, (!email.trim() || loading) && styles.inviteButtonDisabled]}
                onPress={submit}
                disabled={!email.trim() || loading}
              >
                {loading ? <ActivityIndicator color={colors.black} /> : <ShareAddIcon width={20} height={20} />}
              </Pressable>
            </View>
            <View style={styles.roleOptions}>
              {([
                { value: 'viewer', label: '보기' },
                { value: 'editor', label: '수정' },
              ] as const).map((option) => {
                const active = role === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={styles.roleOption}
                    onPress={() => setRole(option.value)}
                  >
                    <View style={[styles.roleRadio, active && styles.roleRadioActive]}>
                      {active && <ShareCheckIcon width={13.33} height={13.33} />}
                    </View>
                    <Text style={styles.roleLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>공유된 사용자</Text>
            {listLoading ? (
              <ActivityIndicator color={colors.gray600} style={{ marginTop: 12 }} />
            ) : shares.length === 0 ? (
              <Text style={styles.empty}>아직 공유된 사용자가 없습니다.</Text>
            ) : (
              <ScrollView 
                style={styles.shareList}
                contentContainerStyle={styles.shareListContent}
                showsVerticalScrollIndicator={false}
              >
                {shares.map((s, index) => {
                  const roleLabel =
                    s.role == null ? 'OWNER' : s.role === 'editor' ? 'EDITOR' : 'VIEWER';
                  const isOwner = s.role == null;
                  return (
                    <View
                      key={`${s.handle}-${s.role ?? 'owner'}`}
                      style={[
                        styles.shareChip,
                        index !== shares.length - 1 && styles.shareChipSpacing,
                      ]}
                    >
                      <View style={styles.shareChipText}>
                        <Text style={styles.shareEmail}>{s.email}</Text>
                      </View>
                      <View style={styles.shareChipMeta}>
                        <Text style={styles.shareRoleText}>{roleLabel}</Text>
                        {!isOwner && (
                          <Pressable
                            style={styles.shareRemoveButton}
                            onPress={async () => {
                              try {
                                await plansApi.revokeShare(planId, s.handle);
                                await loadShares();
                              } catch (e: any) {
                                const msg = e?.response?.status === 403 ? '권한이 없습니다.' : (e?.response?.data?.detail || '삭제에 실패했습니다.');
                                Alert.alert('알림', msg);
                              }
                            }}
                          >
                            <ShareDeleteIcon width={20} height={20} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>완료</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    ...textStyles.h3,
    marginBottom: 8,
  },
  description: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  emailInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  emailInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    ...textStyles.body4,
  },
  inviteButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.black,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonDisabled: {
    backgroundColor: colors.gray200,
  },
  roleOptions: {
    flexDirection: 'row',
    columnGap: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleRadio: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  roleRadioActive: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  roleLabel: {
    ...textStyles.body3,
    color: colors.black,
    marginTop: 1,
  },
  shareList: {
    marginTop: 0,
    maxHeight: 200,
  },
  shareListContent: {
    paddingBottom: 4,
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareChipSpacing: {
    marginBottom: 12,
  },
  shareChipText: {
    flex: 1,
    marginRight: 12,
  },
  shareEmail: {
    ...textStyles.body4,
    color: colors.primary,
  },
  shareChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  shareRoleText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  shareRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  primaryButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});


