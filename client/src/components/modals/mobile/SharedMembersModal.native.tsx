import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { plansApi } from '@/services/plans';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import CloseIcon from '../../../../assets/mobile_close.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';
import ShareAddIcon from '../../../../assets/share_add.svg';
import DropdownIcon from '../../../../assets/mobile_dropdown.svg';
import { Input } from '@/ui/components/input';

export type SharedMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface SharedMember {
  id: string;
  email: string;
  role: SharedMemberRole;
  roleLabel: string;
}

interface SharedMembersModalProps {
  visible: boolean;
  onClose: () => void;
  planId?: number;
  sharedMembers?: SharedMember[];
}

function planShareToSharedMember(s: { handle: string; role: 'editor' | 'viewer' | null; nickname: string; email: string }): SharedMember {
  const role: SharedMemberRole = s.role == null ? 'OWNER' : s.role === 'editor' ? 'EDITOR' : 'VIEWER';
  const roleLabel = role === 'OWNER' ? '전체 권한' : role === 'EDITOR' ? '편집 가능' : '조회 전용';
  return { id: s.handle, email: s.email, role, roleLabel };
}

const ROLE_OPTIONS: { value: 'editor' | 'viewer'; label: string }[] = [
  { value: 'editor', label: '에디터' },
  { value: 'viewer', label: '뷰어' },
];

export default function SharedMembersModal({
  visible,
  onClose,
  planId,
  sharedMembers: propSharedMembers,
}: SharedMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [fetchedMembers, setFetchedMembers] = useState<SharedMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && planId) {
      setLoading(true);
      plansApi
        .listShares(planId)
        .then((shares) => setFetchedMembers(shares.map(planShareToSharedMember)))
        .finally(() => setLoading(false));
    } else {
      setFetchedMembers([]);
    }
  }, [visible, planId]);

  const sharedMembers =
    propSharedMembers != null && propSharedMembers.length > 0 ? propSharedMembers : fetchedMembers;

  const handleInvite = () => {
    // TODO: API 연동
    setInviteEmail('');
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.85}
      showDragHandle
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>참여 멤버</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
              <CloseIcon width={20} height={20} color={colors.gray700} />
            </Pressable>
          </View>
        </View>

        {/* 멤버 초대 - ScrollView 밖에 두어 드롭다운이 위에 표시됨 */}
        <View style={styles.inviteSection}>
          <Text style={styles.sectionLabel}>멤버 초대</Text>
          <View style={styles.inviteRow}>
            <Input
              variant="filled"
              containerStyle={styles.emailInputContainer}
              style={styles.emailInput}
              placeholder="이메일 주소"
              placeholderTextColor={colors.gray600}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.rolePickerWrap}>
              <Pressable
                style={styles.roleButton}
                onPress={() => setShowRolePicker(!showRolePicker)}
              >
                <View style={styles.roleButtonContent}>
                  <Text style={styles.roleButtonText} numberOfLines={1}>
                    {ROLE_OPTIONS.find((o) => o.value === selectedRole)?.label ?? '에디터'}
                  </Text>
                  <DropdownIcon width={16} height={16} color={colors.gray600} />
                </View>
              </Pressable>
              {showRolePicker && (
                <View style={styles.roleDropdown}>
                  {ROLE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.roleDropdownItem, opt.value === selectedRole && styles.roleDropdownItemActive]}
                      onPress={() => {
                        setSelectedRole(opt.value);
                        setShowRolePicker(false);
                      }}
                    >
                      <Text style={styles.roleDropdownItemText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
          <Pressable style={styles.inviteButton} onPress={handleInvite}>
            <ShareAddIcon width={16} height={16} color={colors.white} />
            <Text style={styles.inviteButtonText}>초대하기</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setShowRolePicker(false)}
          scrollEventThrottle={16}
        >
          {/* 참여자 목록 */}
          <Text style={styles.sectionLabel}>참여자 ({loading ? '...' : sharedMembers.length})</Text>
          <View style={styles.memberList}>
            {loading ? (
              <ActivityIndicator color={colors.gray600} style={{ paddingVertical: 24 }} />
            ) : (
              sharedMembers.map((member, index) => (
              <React.Fragment key={member.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={styles.avatar} />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberEmailRow}>
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {member.email}
                      </Text>
                      {member.role === 'OWNER' && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>OWNER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberRoleLabel}>
                      {member.roleLabel}
                    </Text>
                  </View>
                  {member.role !== 'OWNER' && (
                    <Pressable
                      style={styles.roleSelectButton}
                      onPress={() => {}}
                    >
                      <Text style={styles.roleSelectText}>에디터</Text>
                      <DropdownIcon width={16} height={16} color={colors.gray600} />
                    </Pressable>
                  )}
                </View>
              </React.Fragment>
            ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 4,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteSection: {
    paddingHorizontal: 20,
    zIndex: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    ...textStyles.h7,
    color: colors.black,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  emailInputContainer: {
    flex: 7,
    height: 48,
  },
  emailInput: {
    height: 48,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 0,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    color: colors.black,
  },
  rolePickerWrap: {
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 10,
  },
  roleButton: {
    height: 48,
    width: 93,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  roleButtonText: {
    ...textStyles.h6,
    color: colors.black,
    flexShrink: 1,
  },
  roleDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
    zIndex: 1000,
    elevation: 10,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  roleDropdownItemActive: {
    backgroundColor: colors.gray200,
  },
  roleDropdownItemText: {
    ...textStyles.h6,
    color: colors.black,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: colors.black,
    borderRadius: 12,
    marginBottom: 24,
  },
  inviteButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  memberList: {
    backgroundColor: colors.white,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gray300,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberEmail: {
    ...textStyles.h6,
    color: colors.black,
  },
  ownerBadge: {
    backgroundColor: colors.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  ownerBadgeText: {
    ...textStyles.h9,
    color: colors.white,
    letterSpacing: 0.5,
  },
  memberRoleLabel: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  roleSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    minWidth: 82,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  roleSelectText: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginLeft: 48,
  },
});
