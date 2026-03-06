import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import CloseIcon from '../../../../assets/x.svg';
import DeleteIcon from '../../../../assets/delete_gray.svg';
import AddIcon from '../../../../assets/add.svg';
import DropdownIcon from '../../../../assets/dropdown_time.svg';

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

export default function SharedMembersModal({
  visible,
  onClose,
  planId,
  sharedMembers = [],
}: SharedMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('에디터');
  const [showRolePicker, setShowRolePicker] = useState(false);

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
            <Pressable style={styles.iconButton} onPress={() => {}} hitSlop={8}>
              <DeleteIcon width={20} height={20} color={colors.gray600} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={onClose} hitSlop={8}>
              <CloseIcon width={24} height={24} color={colors.black} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 멤버 초대 */}
          <Text style={styles.sectionLabel}>멤버 초대</Text>
          <View style={styles.inviteRow}>
            <TextInput
              style={styles.emailInput}
              placeholder="이메일 주소"
              placeholderTextColor={colors.gray600}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.roleButton}
              onPress={() => setShowRolePicker(!showRolePicker)}
            >
              <Text style={styles.roleButtonText}>{selectedRole}</Text>
              <DropdownIcon width={16} height={16} color={colors.black} />
            </Pressable>
          </View>
          <Pressable style={styles.inviteButton} onPress={handleInvite}>
            <AddIcon width={16} height={16} color={colors.white} />
            <Text style={styles.inviteButtonText}>초대하기</Text>
          </Pressable>

          {/* 참여자 목록 */}
          <Text style={styles.sectionLabel}>참여자 ({sharedMembers.length})</Text>
          <View style={styles.memberList}>
            {sharedMembers.map((member, index) => (
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
            ))}
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
  iconButton: {
    padding: 4,
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
    marginBottom: 12,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  emailInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.gray200,
    borderRadius: radii.base,
    paddingHorizontal: 16,
    ...textStyles.body3,
    color: colors.black,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    width: 93,
    backgroundColor: colors.gray200,
    borderRadius: radii.base,
    paddingHorizontal: 10,
  },
  roleButtonText: {
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
    borderRadius: radii.base,
    marginBottom: 32,
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
    paddingVertical: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.base,
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
    fontFamily: typography.fontFamily.pretendardBold,
    fontSize: 10,
    lineHeight: 16,
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
