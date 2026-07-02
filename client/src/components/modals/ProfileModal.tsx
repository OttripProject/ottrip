import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useMe } from "@/hooks/useMe";
import { useNicknameValidation } from "@/hooks/useNicknameValidation";
import { type UserProfile, usersApi } from "@/services/users";
import { Gender } from "@/types/api";
import Card from "@/ui/components/Card";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DeleteAccountModal from "@/components/modals/DeleteAccountModal";
import LogoutModal from "@/components/modals/LogoutModal";
import TermsDetailModal from "@/components/modals/TermsDetailModal";
import TermsPolicyPickerModal from "@/components/modals/TermsPolicyPickerModal";
import type { TermsKey } from "@/constants/terms";
import { guestPrompt } from "@/utils/guestPrompt";
import CopyIcon from "../../../assets/copy.svg";
import GenderCheckIcon from "../../../assets/gender_check.svg";
import DocumentIcon from "../../../assets/document.svg";
import ChatIcon from "../../../assets/chat.svg";
import XIcon from "../../../assets/x.svg";

const GENDER_OPTIONS = [
  { label: "남성", value: Gender.MALE },
  { label: "여성", value: Gender.FEMALE },
  { label: "선택 안함", value: null },
] as const;

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [termsPolicyModalOpen, setTermsPolicyModalOpen] = useState(false);
  const [termsDetailModalOpen, setTermsDetailModalOpen] = useState(false);
  const [termsDetailKey, setTermsDetailKey] = useState<TermsKey>("tos");
  const [deletingGuestData, setDeletingGuestData] = useState(false);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const CONTACT_EMAIL = "ottrip.official@gmail.com";

  const { data: profile } = useMe();

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

  const { nicknameError, checkingNickname, onNicknameChange, isValid } =
    useNicknameValidation(me?.nickname);

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const save = async () => {
    if (!isValid) {
      Alert.alert("알림", "닉네임을 확인해주세요.");
      return;
    }
    const updated = await usersApi.updateMe({ nickname, gender });
    setMe(updated);
    queryClient.setQueryData(["me"], updated);
    onClose();
  };

  const handleDeleteAccount = () => setDeleteModalOpen(true);

  const confirmDeleteAccount = async () => {
    try {
      await usersApi.deleteAccount();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || "탈퇴 중 알림가 발생했습니다.";
      setDeleteModalOpen(false);
      if (Platform.OS === "web") {
        window.alert(`알림: ${errorMessage}`);
      } else {
        Alert.alert("알림", errorMessage);
      }
      throw error;
    }
  };

  const handleDeleteModalClose = () => setDeleteModalOpen(false);

  const handleDeleteCompleted = () => {
    setDeleteModalOpen(false);
    logout();
  };

  const hasChanges = nickname !== me?.nickname || gender !== me?.gender;
  const canSave = isValid && hasChanges;
  const isGuest = !!me?.isGuest;

  const handleSignUp = () => {
    guestPrompt.notifyBeforeSignUpNavigation();
    onClose();
    queueMicrotask(() => {
      navigation.navigate(
        "소셜회원가입" as never,
        { guestUpgrade: true } as never,
      );
    });
  };

  const performDeleteTemporaryRecords = async () => {
    setDeletingGuestData(true);
    try {
      await usersApi.deleteAccount();
      onClose();
      await logout();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const message =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "삭제 중 알림가 발생했습니다.";
      if (Platform.OS === "web") {
        window.alert(`알림: ${message}`);
      } else {
        Alert.alert("알림", message);
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
      "이 기기에 저장된 임시 일정이 모두 삭제되며 복구할 수 없습니다. 계속할까요?";
    if (Platform.OS === "web") {
      const ok = window.confirm(`임시 기록 삭제\n\n${message}`);
      if (ok) void performDeleteTemporaryRecords();
      return;
    }
    Alert.alert("임시 기록 삭제", message, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => void performDeleteTemporaryRecords(),
      },
    ]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          {isGuest ? (
            <View style={styles.cardWrapper}>
              <Card
                variant="basic"
                alignItems="flex-start"
                minHeight={568}
              >
                <Pressable style={styles.guestCloseButton} onPress={onClose}>
                  <XIcon width={24} height={24} fill={colors.black} />
                </Pressable>

                <Text style={styles.guestTitle}>프로필 설정</Text>
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
                      <Pressable hitSlop={8} style={styles.guestInquiryCopyIcon} onPress={handleCopy}>
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
                  <DocumentIcon width={16} height={16} color={colors.gray800} />
                  <Text style={styles.guestTermsPolicyText}>약관 및 정책 확인하기</Text>
                </Pressable>
              </Card>
            </View>
          ) : (
            <ScrollView
              style={styles.memberScroll}
              contentContainerStyle={styles.memberScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.memberCard}>
                {/* 헤더 */}
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>프로필 설정</Text>
                    <Text style={styles.subtitle}>개인정보 및 환경설정을 관리하세요.</Text>
                  </View>
                  <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
                    <XIcon width={14} height={14} color={colors.gray900} />
                  </Pressable>
                </View>

                {/* 폼 */}
                <View style={styles.form}>
                  {/* 이메일 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>이메일</Text>
                    <View style={styles.readonlyInput}>
                      <Text style={styles.readonlyText}>{me?.email ?? ""}</Text>
                    </View>
                  </View>

                  {/* 닉네임 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>닉네임</Text>
                    <Input
                      placeholder={PLACEHOLDERS.profile.nickname}
                      value={nickname}
                      onChangeText={handleNicknameChange}
                      style={styles.nicknameInput}
                    />
                    {nicknameError ? (
                      <Text style={styles.errorText}>{nicknameError}</Text>
                    ) : !checkingNickname && nickname.trim().length > 0 && nickname !== me?.nickname ? (
                      <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
                    ) : null}
                  </View>

                  {/* 성별 */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.genderLabelRow}>
                      <Text style={styles.fieldLabel}>성별</Text>
                      <Text style={styles.genderOptional}>선택</Text>
                    </View>
                    <View style={styles.genderChips}>
                      {GENDER_OPTIONS.map(opt => {
                        const selected = gender === opt.value;
                        return (
                          <Pressable
                            key={opt.label}
                            style={[styles.genderChip, selected && styles.genderChipSelected]}
                            onPress={() => setGender(opt.value)}
                          >
                            <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* 구분선 */}
                <View style={styles.divider} />

                {/* 링크 */}
                <View style={styles.links}>
                  <Pressable style={styles.linkRow} onPress={() => setContactOpen(true)}>
                    <ChatIcon width={13} height={13} color={colors.gray900} />
                    <Text style={styles.linkText}>문의하기</Text>
                  </Pressable>
                  <Pressable style={styles.linkRow} onPress={() => setTermsPolicyModalOpen(true)} hitSlop={6}>
                    <DocumentIcon width={13} height={13} color={colors.gray900} />
                    <Text style={styles.linkText}>약관 및 정책 확인하기</Text>
                  </Pressable>
                </View>

                {/* 푸터 */}
                <View style={styles.footer}>
                  <View style={styles.footerLeft}>
                    <Pressable onPress={() => setLogoutModalOpen(true)}>
                      <Text style={styles.logoutText}>로그아웃</Text>
                    </Pressable>
                    <Text style={styles.footerSep}>|</Text>
                    <Pressable onPress={handleDeleteAccount}>
                      <Text style={styles.deleteText}>계정 삭제</Text>
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
              </View>
            </ScrollView>
          )}
        </View>

        <Modal visible={contactOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.contactModalCard}>
              <Pressable style={styles.contactModalCloseButton} onPress={() => setContactOpen(false)}>
                <XIcon width={24} height={24} fill={colors.black} />
              </Pressable>
              <Text style={styles.contactModalTitle}>문의하기</Text>
              <Text style={styles.contactModalText}>
                도움이 필요하거나 피드백이 있으시면 연락주세요.
              </Text>
              <View style={styles.contactModalEmailContainer}>
                <Text style={styles.contactModalEmailText}>{CONTACT_EMAIL}</Text>
                <View style={styles.contactModalCopyWrapper}>
                  {copied ? (
                    <Text style={styles.contactModalCopiedText}>복사됨!</Text>
                  ) : (
                    <Pressable style={styles.contactModalCopyIcon} onPress={handleCopy}>
                      <CopyIcon width={16} height={16} fill={colors.gray700} />
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={styles.contactModalReplyText}>최대한 빠르게 답변드리겠습니다.</Text>
              <Pressable style={styles.contactModalConfirmButton} onPress={() => setContactOpen(false)}>
                <Text style={styles.contactModalConfirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Modal>

      <TermsPolicyPickerModal
        visible={visible && termsPolicyModalOpen && !termsDetailModalOpen}
        dimBackdrop={!termsDetailModalOpen}
        onClose={() => setTermsPolicyModalOpen(false)}
        onPickTerm={openTermsDetailModal}
      />

      <TermsDetailModal
        visible={visible && termsDetailModalOpen}
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
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // --- 게스트 ---
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  guestCloseButton: {
    position: "absolute",
    right: 40,
    top: 48,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  guestTitle: {
    position: "absolute",
    left: 40,
    top: 48,
    ...textStyles.h2,
  },
  guestStatusLine: {
    position: "absolute",
    left: 40,
    top: 92,
    width: 400,
    ...textStyles.body3,
    color: colors.gray700,
  },
  guestDescription: {
    position: "absolute",
    left: 40,
    top: 124,
    width: 400,
    ...textStyles.body3,
    color: colors.black,
  },
  guestLoginButton: {
    position: "absolute",
    left: 40,
    top: 196,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  guestLoginButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  guestDeleteRecordsButton: {
    position: "absolute",
    left: 40,
    top: 264,
    width: 400,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  guestDeleteRecordsButtonText: {
    ...textStyles.h5,
    color: colors.danger,
  },
  guestButtonDisabled: {
    opacity: 0.5,
  },
  guestInquiryTitle: {
    position: "absolute",
    left: 40,
    top: 352,
    width: 400,
    ...textStyles.h7,
    color: colors.black,
  },
  guestInquiryEmailBox: {
    position: "absolute",
    left: 40,
    top: 384,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "flex-end",
    justifyContent: "center",
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
    position: "absolute",
    left: 40,
    top: 440,
    width: 400,
    ...textStyles.body4,
    color: colors.success,
  },
  guestTermsPolicyRow: {
    position: "absolute",
    left: 40,
    top: 476,
    width: 400,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guestTermsPolicyText: {
    ...textStyles.h7,
    color: colors.gray800,
  },

  // --- 멤버 ---
  memberScroll: {
    width: "100%",
    maxHeight: "90%",
  },
  memberScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  memberCard: {
    width: 420,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  subtitle: {
    ...textStyles.body5,
    color: colors.gray600,
    marginTop: 4,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  form: {
    flexDirection: "column",
    gap: 12,
  },
  fieldGroup: {
    flexDirection: "column",
  },
  fieldLabel: {
    ...textStyles.h8,
    color: colors.gray900,
    marginBottom: 6,
  },
  readonlyInput: {
    backgroundColor: colors.gray200,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  nicknameInput: {
    height: 40,
    borderRadius: 9,
  },
  errorText: {
    ...textStyles.body6,
    color: colors.danger,
    marginTop: 4,
  },
  successText: {
    ...textStyles.body6,
    color: colors.success,
    marginTop: 4,
  },
  genderLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  genderOptional: {
    ...textStyles.body6,
    color: colors.gray500,
    marginLeft: 4,
  },
  genderChips: {
    flexDirection: "row",
    gap: 8,
  },
  genderChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipSelected: {
    borderColor: colors.gray900,
    backgroundColor: colors.gray900,
  },
  genderChipText: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  genderChipTextSelected: {
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
  },
  links: {
    flexDirection: "column",
    gap: 10,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 2,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    ...textStyles.h9,
    color: colors.danger,
  },
  footerSep: {
    ...textStyles.body6,
    color: colors.gray400,
  },
  deleteText: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  saveButton: {
    height: 40,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },

  // --- 문의 모달 ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  contactModalCard: {
    position: "relative",
    backgroundColor: colors.white,
    borderRadius: 24,
    width: 480,
    height: 360,
  },
  contactModalCloseButton: {
    position: "absolute",
    right: 40,
    top: 48,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  contactModalTitle: {
    position: "absolute",
    left: 40,
    top: 48,
    ...textStyles.h2,
  },
  contactModalText: {
    position: "absolute",
    left: 40,
    top: 92,
    width: 400,
    ...textStyles.body3,
    color: colors.gray700,
  },
  contactModalEmailContainer: {
    position: "absolute",
    left: 40,
    top: 146,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "flex-end",
    justifyContent: "center",
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
    position: "absolute",
    left: 40,
    top: 202,
    ...textStyles.body4,
    color: colors.success,
  },
  contactModalConfirmButton: {
    position: "absolute",
    left: 40,
    bottom: 48,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contactModalConfirmButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
