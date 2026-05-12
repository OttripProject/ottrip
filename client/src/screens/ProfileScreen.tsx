import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { useNicknameValidation } from '@/hooks/useNicknameValidation';
import { useMe } from '@/hooks/useMe';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import GradientBackground from '@/ui/components/GradientBackground';
import Card from '@/ui/components/Card';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { Gender } from '@/types/api';

import GenderCheckIcon from '../../assets/gender_check.svg';
import QnaIcon from '../../assets/qna.svg';
import XIcon from '../../assets/x.svg';
import CopyIcon from '../../assets/copy.svg';
import FilesIcon from '../../assets/memo.svg';
import type { TermsKey } from '@/constants/terms';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import LogoutModal from '@/components/modals/LogoutModal';
import TermsPolicyPickerModal from '@/components/modals/TermsPolicyPickerModal';
import TermsDetailModal from '@/components/modals/TermsDetailModal';
import { guestPrompt } from '@/utils/guestPrompt';

const MEMBER_PROFILE_CARD_HEIGHT = 652;

export default function ProfileScreen() {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [termsPolicyModalOpen, setTermsPolicyModalOpen] = useState(false);
  const [termsDetailModalOpen, setTermsDetailModalOpen] = useState(false);
  const [termsDetailKey, setTermsDetailKey] = useState<TermsKey>('tos');
  const [deletingGuestData, setDeletingGuestData] = useState(false);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const CONTACT_EMAIL = 'ottrip.official@gmail.com';
  
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
      Alert.alert('알림', '닉네임을 확인해주세요.');
      return;
    }
    
    const updated = await usersApi.updateMe({ nickname, gender });
    setMe(updated);
    queryClient.setQueryData(['me'], updated);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('OTTRIP');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await usersApi.deleteAccount();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || '탈퇴 중 알림가 발생했습니다.';
      setDeleteModalOpen(false);
      if (Platform.OS === 'web') {
        window.alert(`알림: ${errorMessage}`);
      } else {
        Alert.alert('알림', errorMessage);
      }
      throw error; // 모달에서 에러를 감지할 수 있도록 throw
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
  const isGuest = !!me?.isGuest;

  const handleSignUp = () => {
    guestPrompt.notifyBeforeSignUpNavigation();
    queueMicrotask(() => {
      navigation.navigate('소셜회원가입' as never, { guestUpgrade: true } as never);
    });
  };

  const performDeleteTemporaryRecords = async () => {
    setDeletingGuestData(true);
    try {
      await usersApi.deleteAccount();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('OTTRIP');
      }
      await logout();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const message =
        typeof err?.response?.data?.detail === 'string'
          ? err.response.data.detail
          : '삭제 중 알림가 발생했습니다.';
      if (Platform.OS === 'web') {
        window.alert(`알림: ${message}`);
      } else {
        Alert.alert('알림', message);
      }
    } finally {
      setDeletingGuestData(false);
    }
  };

  const openTermsDetailModal = (key: TermsKey) => {
    setTermsDetailKey(key);
    setTermsDetailModalOpen(true);
  };

  const handleDeleteTemporaryRecords = () => {
    const message =
      '이 기기에 저장된 임시 일정이 모두 삭제되며 복구할 수 없습니다. 계속할까요?';
    if (Platform.OS === 'web') {
      const ok = window.confirm(`임시 기록 삭제\n\n${message}`);
      if (ok) void performDeleteTemporaryRecords();
      return;
    }
    Alert.alert('임시 기록 삭제', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void performDeleteTemporaryRecords(),
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          <Card
            variant="basic"
            alignItems="flex-start"
            minHeight={isGuest ? 568 : MEMBER_PROFILE_CARD_HEIGHT}
            maxHeight={isGuest ? undefined : MEMBER_PROFILE_CARD_HEIGHT}
          >
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('OTTRIP');
                }
              }}
            >
              <XIcon width={24} height={24} fill={colors.black} />
            </Pressable>

            <Text style={styles.title}>프로필 설정</Text>
            {isGuest ? (
              <>
                <Text style={styles.guestStatusLine}>게스트 · 일정 임시 저장</Text>
                <Text style={styles.guestDescription}>
                  로그인하면 임시 저장된 일정을 계정과 연동할 수 있어요.
                </Text>
                <Pressable
                  disabled={deletingGuestData}
                  style={[styles.guestLoginButton, deletingGuestData && styles.guestButtonDisabled]}
                  onPress={handleSignUp}
                >
                  <Text style={styles.guestLoginButtonText}>로그인</Text>
                </Pressable>
                <Pressable
                  disabled={deletingGuestData}
                  style={[styles.guestDeleteRecordsButton, deletingGuestData && styles.guestButtonDisabled]}
                  onPress={handleDeleteTemporaryRecords}
                >
                  <Text style={styles.guestDeleteRecordsButtonText}>임시 기록 삭제</Text>
                </Pressable>
                <Text style={styles.guestInquiryTitle}>문의하기</Text>
                <View style={styles.guestInquiryEmailBox}>
                  <Text style={styles.guestInquiryEmailText} numberOfLines={1} selectable>
                    {CONTACT_EMAIL}
                  </Text>
                  <View style={styles.guestInquiryCopyWrap}>
                    {copied ? (
                      <Text style={styles.guestInquiryCopiedText}>복사됨!</Text>
                    ) : (
                      <Pressable
                        hitSlop={8}
                        style={styles.guestInquiryCopyIcon}
                        onPress={async () => {
                          try {
                            await navigator.clipboard.writeText(CONTACT_EMAIL);
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
                <Text style={styles.guestInquiryReplyText}>최대한 빠르게 답변드리겠습니다.</Text>
                <Pressable
                  style={styles.guestTermsPolicyRow}
                  onPress={() => setTermsPolicyModalOpen(true)}
                  hitSlop={6}
                >
                  <FilesIcon width={16} height={16} />
                  <Text style={styles.guestTermsPolicyText}>약관 및 정책 확인하기</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>개인정보 및 환경설정을 관리하세요.</Text>

                <Text style={styles.emailLabel}>이메일</Text>
                <View style={styles.emailContainer}>
                  <Text style={styles.emailText}>{me?.email ?? ''}</Text>
                </View>

                <Text style={styles.nicknameLabel}>닉네임</Text>
                <View style={styles.nicknameInputContainer}>
                  <Input
                    placeholder={PLACEHOLDERS.profile.nickname}
                    value={nickname}
                    onChangeText={handleNicknameChange}
                    style={styles.input}
                  />
                </View>
                {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
                {!nicknameError && !checkingNickname && nickname.trim().length > 0 && nickname !== me?.nickname && (
                  <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
                )}

                <Text style={styles.genderLabel}>성별</Text>

                <Pressable
                  style={styles.maleRadioButton}
                  onPress={() => setGender((prev) => (prev === Gender.MALE ? null : Gender.MALE))}
                >
                  <View style={[styles.radioButton, gender === Gender.MALE && styles.radioButtonSelected]}>
                    {gender === Gender.MALE && <GenderCheckIcon width={16} height={16} color={colors.white} />}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.maleTextButton}
                  onPress={() => setGender((prev) => (prev === Gender.MALE ? null : Gender.MALE))}
                >
                  <Text style={styles.genderText}>남성</Text>
                </Pressable>

                <Pressable
                  style={styles.femaleRadioButton}
                  onPress={() => setGender((prev) => (prev === Gender.FEMALE ? null : Gender.FEMALE))}
                >
                  <View style={[styles.radioButton, gender === Gender.FEMALE && styles.radioButtonSelected]}>
                    {gender === Gender.FEMALE && <GenderCheckIcon width={16} height={16} color={colors.white} />}
                  </View>
                </Pressable>
                <Pressable
                  style={styles.femaleTextButton}
                  onPress={() => setGender((prev) => (prev === Gender.FEMALE ? null : Gender.FEMALE))}
                >
                  <Text style={styles.genderText}>여성</Text>
                </Pressable>

                <View style={styles.divider} />

                <Pressable style={styles.contactIconButton} onPress={() => setContactOpen(true)}>
                  <QnaIcon width={16} height={16} fill={colors.gray800} />
                </Pressable>
                <Pressable style={styles.contactTextButton} onPress={() => setContactOpen(true)}>
                  <Text style={styles.contactButtonText}>문의하기</Text>
                </Pressable>

                <Pressable
                  style={styles.termsPolicyIconButton}
                  onPress={() => setTermsPolicyModalOpen(true)}
                  hitSlop={6}
                >
                  <FilesIcon width={16} height={16} />
                </Pressable>
                <Pressable
                  style={styles.termsPolicyTextButton}
                  onPress={() => setTermsPolicyModalOpen(true)}
                  hitSlop={6}
                >
                  <Text style={styles.contactButtonText}>약관 및 정책 확인하기</Text>
                </Pressable>

                <Pressable
                  disabled={!canSave}
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  onPress={save}
                >
                  <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
                    저장
                  </Text>
                </Pressable>
              </>
            )}

            {!isGuest && (
            <View style={styles.footerRow}>
              <Pressable style={styles.footerButton} onPress={() => setLogoutModalOpen(true)}>
                <Text style={styles.footerButtonText}>로그아웃</Text>
              </Pressable>
              <>
                <View style={styles.footerDivider} />
                <Pressable style={styles.footerButton} onPress={handleDeleteAccount}>
                  <Text style={styles.footerButtonTextInactive}>계정 삭제</Text>
                </Pressable>
              </>
            </View>
            )}
          </Card>
        </View>
      </SafeAreaView>

      <Modal visible={contactOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.contactModalCard}>
            <Pressable
              style={styles.contactModalCloseButton}
              onPress={() => setContactOpen(false)}
            >
              <XIcon width={24} height={24} fill={colors.black} />
            </Pressable>
            
            <Text style={styles.contactModalTitle}>문의하기</Text>
            <Text style={styles.contactModalText}>도움이 필요하거나 피드백이 있으시면 연락주세요.</Text>
            
            <View style={styles.contactModalEmailContainer}>
              <Text style={styles.contactModalEmailText}>{CONTACT_EMAIL}</Text>
              <View style={styles.contactModalCopyWrapper}>
                {copied ? (
                  <Text style={styles.contactModalCopiedText}>복사됨!</Text>
                ) : (
                  <Pressable
                    style={styles.contactModalCopyIcon}
                    onPress={async () => {
                      try {
                        await navigator.clipboard.writeText(CONTACT_EMAIL);
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

      <TermsPolicyPickerModal
        visible={termsPolicyModalOpen && !termsDetailModalOpen}
        dimBackdrop={!termsDetailModalOpen}
        onClose={() => setTermsPolicyModalOpen(false)}
        onPickTerm={openTermsDetailModal}
      />

      <TermsDetailModal
        visible={termsDetailModalOpen}
        termsKey={termsDetailKey}
        onClose={() => setTermsDetailModalOpen(false)}
      />

      <DeleteAccountModal
        visible={deleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDeleteAccount}
        onCompleted={handleDeleteCompleted}
      />

      <LogoutModal
        visible={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        isGuest={isGuest}
        onSignUp={() => {
          setLogoutModalOpen(false);
          handleSignUp();
        }}
        onConfirm={() => {
          setLogoutModalOpen(false);
          logout();
        }}
      />
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
  closeButton: {
    position: 'absolute',
    right: 40,
    top: 48,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  title: {
    position: 'absolute',
    left: 40,
    top: 48,
    ...textStyles.h2,
  },
  subtitle: {
    position: 'absolute',
    left: 40,
    top: 92,
    ...textStyles.body3,
    color: colors.gray700,
  },
  guestStatusLine: {
    position: 'absolute',
    left: 40,
    top: 92,
    width: 400,
    ...textStyles.body3,
    color: colors.gray700,
  },
  guestDescription: {
    position: 'absolute',
    left: 40,
    top: 124,
    width: 400,
    ...textStyles.body3,
    color: colors.black,
  },
  guestLoginButton: {
    position: 'absolute',
    left: 40,
    top: 196,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestLoginButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  guestDeleteRecordsButton: {
    position: 'absolute',
    left: 40,
    top: 264,
    width: 400,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestDeleteRecordsButtonText: {
    ...textStyles.h5,
    color: colors.danger,
  },
  guestButtonDisabled: {
    opacity: 0.5,
  },
  guestInquiryTitle: {
    position: 'absolute',
    left: 40,
    top: 352,
    width: 400,
    ...textStyles.h7,
    color: colors.black,
  },
  guestInquiryEmailBox: {
    position: 'absolute',
    left: 40,
    top: 384,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  guestInquiryEmailText: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  guestInquiryCopyWrap: {
    minWidth: 40,
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  guestInquiryCopyIcon: {
    width: 16,
    height: 16,
  },
  guestInquiryCopiedText: {
    ...textStyles.body6,
    color: colors.gray700,
  },
  guestInquiryReplyText: {
    position: 'absolute',
    left: 40,
    top: 440,
    width: 400,
    ...textStyles.body4,
    color: colors.success,
  },
  guestTermsPolicyRow: {
    position: 'absolute',
    left: 40,
    top: 476,
    width: 400,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestTermsPolicyText: {
    ...textStyles.h7,
    color: colors.gray800,
  },
  emailLabel: {
    position: 'absolute',
    left: 40,
    top: 163,
    ...textStyles.h7,
  },
  emailContainer: {
    position: 'absolute',
    left: 40,
    top: 191,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emailText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  nicknameLabel: {
    position: 'absolute',
    left: 40,
    top: 263,
    ...textStyles.h7,
  },
  nicknameInputContainer: {
    position: 'absolute',
    left: 40,
    top: 291,
    width: 400,
  },
  input: {
    height: 48,
  },
  errorText: {
    position: 'absolute',
    left: 40,
    top: 347,
    ...textStyles.body5,
    color: colors.danger,
  },
  successText: {
    position: 'absolute',
    left: 40,
    top: 347,
    ...textStyles.body5,
    color: colors.success,
  },
  genderLabel: {
    position: 'absolute',
    left: 40,
    top: 363,
    ...textStyles.h7,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  maleRadioButton: {
    position: 'absolute',
    left: 40,
    top: 391,
    width: 20,
    height: 20,
  },
  maleTextButton: {
    position: 'absolute',
    left: 68,
    top: 390,
  },
  femaleRadioButton: {
    position: 'absolute',
    left: 112,
    top: 391,
    width: 20,
    height: 20,
  },
  femaleTextButton: {
    position: 'absolute',
    left: 140,
    top: 390,
  },
  genderText: {
    ...textStyles.body2,
  },
  divider: {
    position: 'absolute',
    left: 40,
    top: 439,
    width: 400,
    height: 1,
    backgroundColor: colors.gray300,
  },
  contactIconButton: {
    position: 'absolute',
    left: 40,
    top: 466,
    width: 16,
    height: 16,
  },
  contactTextButton: {
    position: 'absolute',
    left: 64,
    top: 465,
  },
  termsPolicyIconButton: {
    position: 'absolute',
    left: 40,
    top: 498,
    width: 16,
    height: 16,
  },
  termsPolicyTextButton: {
    position: 'absolute',
    left: 64,
    top: 497,
  },
  contactButtonText: {
    ...textStyles.h7,
    color: colors.gray800,
  },
  saveButton: {
    position: 'absolute',
    right: 40,
    top: 556,
    width: 196,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  saveButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  saveButtonTextDisabled: {
    color: colors.black,
  },
  footerRow: {
    position: 'absolute',
    left: 40,
    top: 574,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerButton: {
    paddingVertical: 4,
  },
  footerDivider: {
    width: 1,
    height: 13,
    backgroundColor: colors.gray500,
  },
  footerButtonText: {
    ...textStyles.h7,
    color: colors.warning,
  },
  footerButtonTextInactive: {
    ...textStyles.h7,
    color: colors.gray500,
  },
  modalOverlay: {
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
    width: 480,
    height: 360,
  },
  contactModalCloseButton: {
    position: 'absolute',
    right: 40,
    top: 48,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  contactModalTitle: {
    position: 'absolute',
    left: 40,
    top: 48,
    ...textStyles.h2,
  },
  contactModalText: {
    position: 'absolute',
    left: 40,
    top: 92,
    width: 400,
    ...textStyles.body3,
    color: colors.gray700,
  },
  contactModalEmailContainer: {
    position: 'absolute',
    left: 40,
    top: 146,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    position: 'absolute',
    left: 40,
    top: 202,
    ...textStyles.body4,
    color: colors.success,
  },
  contactModalConfirmButton: {
    position: 'absolute',
    left: 40,
    bottom: 48,
    width: 400,
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


