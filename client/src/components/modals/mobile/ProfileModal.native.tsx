import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import { useMe } from '@/hooks/useMe';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import Card from '@/ui/components/Card';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { Gender } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';

import GenderCheckIcon from '../../../../assets/gender_check.svg';
import CloseIcon from '../../../../assets/mobile_close.svg';
import QnaIcon from '../../../../assets/qna.svg';
import CopyIcon from '../../../../assets/copy.svg';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import LogoutModal from '@/components/modals/LogoutModal';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: profile, isLoading: profileLoading } = useMe();
  
  useEffect(() => {
    if (profile) {
      setMe(profile);
      setNickname(profile.nickname);
      setGender(profile.gender);
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const { nicknameError, checkingNickname, onNicknameChange, isValid } = useNicknameValidation(me?.nickname);

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const save = async () => {
    if (!isValid) {
      Alert.alert('오류', '닉네임을 확인해주세요.');
      return;
    }
    
    const updated = await usersApi.updateMe({ nickname, gender });
    setMe(updated);
    queryClient.setQueryData(['me'], updated);
    onClose();
  };

  const handleDeleteAccount = () => {
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await usersApi.deleteAccount();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '탈퇴 중 오류가 발생했습니다.';
      setDeleteModalOpen(false);
      Alert.alert('오류', errorMessage);
      throw error;
    }
  };

  const handleDeleteModalClose = () => {
    setDeleteModalOpen(false);
  };

  const handleDeleteCompleted = () => {
    setDeleteModalOpen(false);
    logout();
  };

  const hasChanges = nickname !== me?.nickname || gender !== me?.gender;
  const canSave = isValid && hasChanges;

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrapper}>
            <Card 
              variant="basic" 
              alignItems="flex-start"
              maxWidth={360}
              minHeight={380}
              paddingHorizontal={20}
              paddingTop={20}
              paddingBottom={20}
              style={styles.card}
            >
              {/* 헤더 */}
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  프로필 설정
                </Text>
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
                  <CloseIcon width={24} height={24} color={colors.gray500}/>
                </Pressable>
              </View>

              <Text style={styles.subtitle}>개인정보 및 환경설정을 관리하세요.</Text>

              {/* 이메일 */}
              <Text style={styles.label}>이메일</Text>
              <View style={styles.emailContainer}>
                <Text style={styles.emailText}>{me?.email ?? ''}</Text>
              </View>

              {/* 닉네임 */}
              <Text style={styles.label}>닉네임</Text>
              <View style={styles.inputContainer}>
                <Input
                  placeholder={PLACEHOLDERS.profile.nickname}
                  value={nickname}
                  onChangeText={handleNicknameChange}
                  style={styles.input}
                  textAlignVertical="center"
                />
              </View>
              <View style={styles.validationMessageContainer}>
                {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
                {!nicknameError && !checkingNickname && nickname.trim().length > 0 && nickname !== me?.nickname && (
                  <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
                )}
              </View>

              {/* 성별 */}
              <Text style={styles.label}>성별</Text>
              <View style={styles.genderContainer}>
                <Pressable
                  style={styles.genderOption}
                  onPress={() => setGender(Gender.MALE)}
                >
                  <View style={[styles.radioButton, gender === Gender.MALE && styles.radioButtonSelected]}>
                    <GenderCheckIcon width={16} height={16} color={colors.white} />
                  </View>
                  <Text style={styles.genderText}>남성</Text>
                </Pressable>
                <Pressable
                  style={styles.genderOption}
                  onPress={() => setGender(Gender.FEMALE)}
                >
                  <View style={[styles.radioButton, gender === Gender.FEMALE && styles.radioButtonSelected]}>
                    <GenderCheckIcon width={16} height={16} color={colors.white} />
                  </View>
                  <Text style={styles.genderText}>여성</Text>
                </Pressable>
              </View>

              {/* 구분선 */}
              <View style={styles.divider} />

              {/* 문의하기 */}
              <Pressable style={styles.contactButton} onPress={() => setContactOpen(true)}>
                <QnaIcon width={20} height={20} fill={colors.black} />
                <Text style={styles.contactButtonText}>문의하기</Text>
              </Pressable>



              {/* 하단 버튼 */}
              <View style={styles.footerRow}>
                <View style={styles.footerLeft}>
                  <Pressable onPress={() => setLogoutModalOpen(true)}>
                    <Text style={styles.footerLinkRed}>로그아웃</Text>
                  </Pressable>
                  <Pressable onPress={handleDeleteAccount}>
                    <Text style={styles.footerLinkGray}>계정 삭제</Text>
                  </Pressable>
                </View>
                <Pressable
                  disabled={!canSave}
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  onPress={save}
                >
                  <Text style={styles.saveButtonText}>저장</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>

      {/* 문의하기 모달 */}
      <Modal visible={contactOpen} transparent animationType="fade">
        <View style={styles.contactModalOverlay}>
          <View style={styles.contactModalCard}>
            <Pressable
              style={styles.contactModalCloseButton}
              onPress={() => setContactOpen(false)}
            >
              <Ionicons name="close" size={24} color={colors.black} />
            </Pressable>
            
            <Text style={styles.contactModalTitle}>문의하기</Text>
            <Text style={styles.contactModalText}>도움이 필요하거나 피드백이 있으시면 연락주세요.</Text>
            
            <View style={styles.contactModalEmailContainer}>
              <Text style={styles.contactModalEmailText}>ottrip.official@gmail.com</Text>
              <View style={styles.contactModalCopyWrapper}>
                {copied ? (
                  <Text style={styles.contactModalCopiedText}>복사됨!</Text>
                ) : (
                  <Pressable
                    style={styles.contactModalCopyIcon}
                    onPress={async () => {
                      try {
                        await navigator.clipboard.writeText('ottrip.official@gmail.com');
                        setCopied(true);
                        if (copiedTimerRef.current) {
                          clearTimeout(copiedTimerRef.current);
                        }
                        copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
                      } catch {
                        // noop
                      }
                    }}
                  >
                    <CopyIcon width={16} height={16} fill={colors.gray700} />
                  </Pressable>
                )}
              </View>
            </View>
            
            <Text style={styles.contactModalReplyText}>최대한 빠르게 답변드리겠습니다.</Text>
            
            <Pressable 
              style={styles.contactModalConfirmButton} 
              onPress={() => setContactOpen(false)}
            >
              <Text style={styles.contactModalConfirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <DeleteAccountModal
        visible={deleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDeleteAccount}
        onCompleted={handleDeleteCompleted}
      />

      <LogoutModal
        visible={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        isGuest={!!me?.isGuest}
        onConfirm={() => {
          setLogoutModalOpen(false);
          logout();
        }}
        onSignUp={() => {
          setLogoutModalOpen(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    width: '100%',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  title: {
    ...textStyles.h3,
    color: colors.black,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 24,
  },
  label: {
    ...textStyles.h7,
    marginBottom: 8,
  },
  emailContainer: {
    width: '100%',
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    height: 48,
    paddingBottom: 17,
  },
  validationMessageContainer: {
    width: '100%',
    height: 20,
  },
  errorText: {
    ...textStyles.body5,
    color: colors.danger,
  },
  successText: {
    ...textStyles.body5,
    color: colors.success,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  genderText: {
    ...textStyles.body3,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.gray300,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  contactButtonText: {
    ...textStyles.h6,
    color: colors.black,
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    flex: 1,
  },
  footerLinkRed: {
    ...textStyles.h7,
    color: colors.danger,
  },
  footerLinkGray: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 42,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  saveButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contactModalCard: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  contactModalCloseButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  contactModalTitle: {
    ...textStyles.h2,
    marginBottom: 8,
  },
  contactModalText: {
    ...textStyles.body3,
    color: colors.gray700,
    marginBottom: 16,
  },
  contactModalEmailContainer: {
    width: '100%',
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  contactModalEmailText: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  contactModalCopyWrapper: {
    minWidth: 40,
    height: 16,
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  contactModalCopyIcon: {
    width: 16,
    height: 16,
  },
  contactModalCopiedText: {
    ...textStyles.body6,
    color: colors.gray700,
  },
  contactModalReplyText: {
    ...textStyles.body4,
    color: colors.success,
    marginBottom: 24,
  },
  contactModalConfirmButton: {
    width: '100%',
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalConfirmButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
