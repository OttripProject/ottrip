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
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import LogoutModal from '@/components/modals/LogoutModal';

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
    navigation.navigate('OTTRIP');
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
      if (Platform.OS === 'web') {
        window.alert(`오류: ${errorMessage}`);
      } else {
        Alert.alert('오류', errorMessage);
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          <Card variant="basic" alignItems="flex-start">
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
            
            {/* 남성 라디오 버튼 */}
            <Pressable
              style={styles.maleRadioButton}
              onPress={() => setGender(Gender.MALE)}
            >
              <View style={[styles.radioButton, gender === Gender.MALE && styles.radioButtonSelected]}>
                {gender === Gender.MALE && <GenderCheckIcon width={16} height={16} fill={colors.white} />}
              </View>
            </Pressable>
            <Pressable
              style={styles.maleTextButton}
              onPress={() => setGender(Gender.MALE)}
            >
              <Text style={styles.genderText}>남성</Text>
            </Pressable>

            {/* 여성 라디오 버튼 */}
            <Pressable
              style={styles.femaleRadioButton}
              onPress={() => setGender(Gender.FEMALE)}
            >
              <View style={[styles.radioButton, gender === Gender.FEMALE && styles.radioButtonSelected]}>
                {gender === Gender.FEMALE && <GenderCheckIcon width={16} height={16} fill={colors.white} />}
              </View>
            </Pressable>
            <Pressable
              style={styles.femaleTextButton}
              onPress={() => setGender(Gender.FEMALE)}
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
              disabled={!canSave}
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={save}
            >
              <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
                저장
              </Text>
            </Pressable>

            <View style={styles.footerRow}>
              <Pressable style={styles.footerButton} onPress={() => setLogoutModalOpen(true)}>
                <Text style={styles.footerButtonText}>로그아웃</Text>
              </Pressable>
              <View style={styles.footerDivider} />
              <Pressable style={styles.footerButton} onPress={handleDeleteAccount}>
                <Text style={styles.footerButtonTextInactive}>계정 삭제</Text>
              </Pressable>
            </View>
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
  contactButtonText: {
    ...textStyles.h7,
    color: colors.gray800,
  },
  saveButton: {
    position: 'absolute',
    right: 40,
    top: 520,
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
    top: 538,
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


