import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useBackdropClose } from "@/hooks/useBackdropClose";
import { useMe } from "@/hooks/useMe";
import { useNicknameValidation } from "@/hooks/useNicknameValidation";
import { type UserProfile, usersApi } from "@/services/users";
import { Gender } from "@/types/api";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DeleteAccountModal from "@/components/modals/DeleteAccountModal";
import LogoutModal from "@/components/modals/LogoutModal";
import TermsPolicyDetailModal from "@/components/modals/TermsPolicyDetailModal";
import TermsPolicyModal from "@/components/modals/TermsPolicyModal";
import type { TermsKey } from "@/constants/terms";
import { toUserMessage } from "@/utils/crossPlatformAlert";
import { guestPrompt } from "@/utils/guestPrompt";
import ChatIcon from "../../../assets/chat.svg";
import CopyIcon from "../../../assets/copy.svg";
import DocumentIcon from "../../../assets/document.svg";
import XIcon from "../../../assets/x.svg";

const GENDER_OPTIONS = [
  { label: "남성", value: Gender.MALE },
  { label: "여성", value: Gender.FEMALE },
  { label: "선택 안함", value: null },
] as const;

const LANGUAGE_OPTIONS = [
  { label: "한국어", value: "ko" },
  { label: "English", value: "en" },
] as const;

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const profileBackdrop = useBackdropClose(onClose);
  const contactBackdrop = useBackdropClose(() => setContactOpen(false));
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const [saving, setSaving] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [termsPolicyModalOpen, setTermsPolicyModalOpen] = useState(false);
  const [termsDetailModalOpen, setTermsDetailModalOpen] = useState(false);
  const [termsDetailKey, setTermsDetailKey] = useState<TermsKey>("tos");
  const [deletingGuestData, setDeletingGuestData] = useState(false);

  const CONTACT_EMAIL = "ottrip.official@gmail.com";

  const { data: profile } = useMe();

  useEffect(() => {
    if (profile) {
      setMe(profile);
      setNickname(profile.nickname);
      setGender(profile.gender);
    }
  }, [profile]);

  const { nicknameError, checkingNickname, onNicknameChange, isValid } =
    useNicknameValidation(me?.nickname);

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const save = async () => {
    if (saving) return;
    if (!isValid) {
      Alert.alert("알림", "닉네임을 확인해주세요");
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({ nickname, gender });
      setMe(updated);
      queryClient.setQueryData(["me"], updated);
      onClose();
    } catch (error) {
      showToast(toUserMessage(error), { icon: "info" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => setDeleteModalOpen(true);

  const confirmDeleteAccount = async () => {
    try {
      await usersApi.deleteAccount();
    } catch (error: any) {
      const errorMessage = toUserMessage(error);
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
  const canSave = isValid && hasChanges && !saving;
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
      const message = toUserMessage(error);
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
      showToast("문의 이메일을 복사했어요.", {
        icon: "check",
        closable: false,
        effect: "confetti",
      });
    } catch {}
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.overlay} {...profileBackdrop.overlayProps}>
          {isGuest ? (
            <ScrollView
              style={styles.memberScroll}
              contentContainerStyle={styles.memberScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.memberCard} {...profileBackdrop.cardProps}>
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>프로필 설정</Text>
                    <Text style={styles.subtitle}>게스트 · 일정 임시 저장</Text>
                  </View>
                  <MotionPressable
                    onPress={onClose}
                    hitSlop={8}
                    style={styles.closeButton}
                  >
                    <MotionIcon>
                      <XIcon width={16} height={16} color={colors.gray900} />
                    </MotionIcon>
                  </MotionPressable>
                </View>

                <Text style={styles.guestDescription}>
                  로그인하면 임시 저장된 일정을 계정과 연동할 수 있어요.
                </Text>

                <View style={styles.guestActions}>
                  <MotionPressable
                    disabled={deletingGuestData}
                    style={[
                      styles.guestLoginButton,
                      deletingGuestData && styles.guestButtonDisabled,
                    ]}
                    onPress={handleSignUp}
                  >
                    <Text style={styles.guestLoginButtonText}>로그인</Text>
                  </MotionPressable>
                  <MotionPressable
                    disabled={deletingGuestData}
                    style={[
                      styles.guestDeleteRecordsButton,
                      deletingGuestData && styles.guestButtonDisabled,
                    ]}
                    hoverStyle={shadows.xsHover}
                    onPress={handleDeleteTemporaryRecords}
                  >
                    <Text style={styles.guestDeleteRecordsButtonText}>
                      임시 기록 삭제
                    </Text>
                  </MotionPressable>
                </View>

                <View style={styles.divider} />

                <View>
                  <Text style={styles.fieldLabel}>문의하기</Text>
                  <MotionPressable
                    style={styles.contactEmailButton}
                    onPress={handleCopy}
                  >
                    <Text style={styles.contactEmailText} numberOfLines={1}>
                      {CONTACT_EMAIL}
                    </Text>
                    <MotionIcon>
                      <CopyIcon width={16} height={16} fill={colors.gray700} />
                    </MotionIcon>
                  </MotionPressable>
                  <Text style={styles.contactReplyText}>
                    최대한 빠르게 답변드리겠습니다.
                  </Text>
                </View>

                <View style={styles.links}>
                  <MotionPressable
                    style={styles.linkRow}
                    onPress={() => setTermsPolicyModalOpen(true)}
                    hitSlop={6}
                  >
                    <MotionIcon>
                      <DocumentIcon
                        width={13}
                        height={13}
                        color={colors.gray900}
                      />
                    </MotionIcon>
                    <Text style={styles.linkText}>약관 및 정책 확인하기</Text>
                  </MotionPressable>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.memberScroll}
              contentContainerStyle={styles.memberScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.memberCard} {...profileBackdrop.cardProps}>
                {/* 헤더 */}
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>프로필 설정</Text>
                    <Text style={styles.subtitle}>
                      개인정보 및 환경설정을 관리하세요.
                    </Text>
                  </View>
                  <MotionPressable
                    onPress={onClose}
                    hitSlop={8}
                    style={styles.closeButton}
                  >
                    <MotionIcon>
                      <XIcon width={16} height={16} color={colors.gray900} />
                    </MotionIcon>
                  </MotionPressable>
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
                    ) : !checkingNickname &&
                      nickname.trim().length > 0 &&
                      nickname !== me?.nickname ? (
                      <Text style={styles.successText}>
                        사용 가능한 닉네임입니다.
                      </Text>
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
                          <MotionPressable
                            key={opt.label}
                            style={[
                              styles.genderChip,
                              selected && styles.genderChipSelected,
                            ]}
                            hoverStyle={
                              selected ? shadows.darkHover : shadows.xsHover
                            }
                            onPress={() => setGender(opt.value)}
                          >
                            <Text
                              style={[
                                styles.genderChipText,
                                selected && styles.genderChipTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </MotionPressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* 언어 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>언어</Text>
                    <View style={styles.genderChips}>
                      {LANGUAGE_OPTIONS.map(opt => {
                        const selected = language === opt.value;
                        return (
                          <MotionPressable
                            key={opt.value}
                            style={[
                              styles.genderChip,
                              selected && styles.genderChipSelected,
                            ]}
                            hoverStyle={
                              selected ? shadows.darkHover : shadows.xsHover
                            }
                            onPress={() => setLanguage(opt.value)}
                          >
                            <Text
                              style={[
                                styles.genderChipText,
                                selected && styles.genderChipTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </MotionPressable>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* 구분선 */}
                <View style={styles.divider} />

                {/* 링크 */}
                <View style={styles.links}>
                  <MotionPressable
                    style={styles.linkRow}
                    onPress={() => setContactOpen(true)}
                  >
                    <MotionIcon>
                      <ChatIcon width={13} height={13} color={colors.gray900} />
                    </MotionIcon>
                    <Text style={styles.linkText}>문의하기</Text>
                  </MotionPressable>
                  <MotionPressable
                    style={styles.linkRow}
                    onPress={() => setTermsPolicyModalOpen(true)}
                    hitSlop={6}
                  >
                    <MotionIcon>
                      <DocumentIcon
                        width={13}
                        height={13}
                        color={colors.gray900}
                      />
                    </MotionIcon>
                    <Text style={styles.linkText}>약관 및 정책 확인하기</Text>
                  </MotionPressable>
                </View>

                {/* 푸터 */}
                <View style={styles.footer}>
                  <View style={styles.footerLeft}>
                    <MotionPressable onPress={() => setLogoutModalOpen(true)}>
                      <Text style={styles.logoutText}>로그아웃</Text>
                    </MotionPressable>
                    <Text style={styles.footerSep}>|</Text>
                    <MotionPressable onPress={handleDeleteAccount}>
                      <Text style={styles.deleteText}>계정 삭제</Text>
                    </MotionPressable>
                  </View>
                  <MotionPressable
                    disabled={!canSave}
                    style={[
                      styles.saveButton,
                      !canSave && styles.saveButtonDisabled,
                    ]}
                    onPress={save}
                  >
                    <Text style={styles.saveButtonText}>저장</Text>
                  </MotionPressable>
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        <Modal
          visible={contactOpen}
          transparent
          animationType="none"
          onRequestClose={() => setContactOpen(false)}
        >
          <View style={styles.modalOverlay} {...contactBackdrop.overlayProps}>
            <View style={styles.contactCard} {...contactBackdrop.cardProps}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.contactTitle}>문의하기</Text>
                  <Text style={styles.contactSubtitle}>
                    도움이 필요하거나 피드백이 있으시면 연락주세요.
                  </Text>
                </View>
                <MotionPressable
                  onPress={() => setContactOpen(false)}
                  hitSlop={8}
                  style={styles.closeButton}
                >
                  <MotionIcon>
                    <XIcon width={16} height={16} color={colors.gray900} />
                  </MotionIcon>
                </MotionPressable>
              </View>
              <View>
                <MotionPressable
                  style={styles.contactEmailButton}
                  onPress={handleCopy}
                >
                  <Text style={styles.contactEmailText} numberOfLines={1}>
                    {CONTACT_EMAIL}
                  </Text>
                  <MotionIcon>
                    <CopyIcon width={16} height={16} fill={colors.gray700} />
                  </MotionIcon>
                </MotionPressable>
                <Text style={styles.contactReplyText}>
                  최대한 빠르게 답변드리겠습니다.
                </Text>
              </View>
              <MotionPressable
                style={styles.contactConfirmButton}
                onPress={() => setContactOpen(false)}
              >
                <Text style={styles.contactConfirmButtonText}>확인</Text>
              </MotionPressable>
            </View>
          </View>
        </Modal>
      </Modal>

      <TermsPolicyModal
        visible={visible && termsPolicyModalOpen && !termsDetailModalOpen}
        onClose={() => setTermsPolicyModalOpen(false)}
        onPickTerm={openTermsDetailModal}
      />

      <TermsPolicyDetailModal
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
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
  },

  // --- 게스트 ---
  guestDescription: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  guestActions: {
    gap: spacing.sm,
  },
  guestLoginButton: {
    height: 48,
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  guestLoginButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  guestDeleteRecordsButton: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    ...surfaces.outline,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  guestDeleteRecordsButtonText: {
    ...textStyles.h6,
    color: colors.danger,
  },
  guestButtonDisabled: {
    opacity: 0.5,
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
    ...modalMotion.card,
    width: 420 + spacing.xl * 2,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  subtitle: {
    ...textStyles.body5,
    color: colors.gray700,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  readonlyInput: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  readonlyText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  nicknameInput: {
    ...textStyles.body5,
    color: colors.gray900,
    borderColor: colors.gray350,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
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
    marginBottom: spacing.sm,
  },
  genderOptional: {
    ...textStyles.body5,
    color: colors.gray600,
    marginLeft: spacing.xs,
  },
  genderChips: {
    flexDirection: "row",
    gap: 8,
  },
  genderChip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray350,
    ...surfaces.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipSelected: {
    borderColor: colors.gray900,
    ...surfaces.dark,
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
    marginHorizontal: -spacing.xl,
  },
  links: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: spacing.md,
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
    paddingTop: spacing.xs,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    ...textStyles.h8,
    color: colors.danger,
  },
  footerSep: {
    ...textStyles.body6,
    color: colors.gray400,
  },
  deleteText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  saveButton: {
    height: 40,
    paddingHorizontal: spacing["2xl"],
    borderRadius: radii.md,
    ...surfaces.primary,
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
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  contactCard: {
    ...modalMotion.card,
    width: 420 + spacing.xl * 2,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.xl,
  },
  contactTitle: {
    ...textStyles.h2,
    color: colors.gray900,
  },
  contactSubtitle: {
    ...textStyles.body5,
    color: colors.gray700,
    marginTop: spacing.sm,
  },
  contactEmailButton: {
    ...surfaces.subtle,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  contactEmailText: {
    ...textStyles.body5,
    color: colors.gray700,
    flex: 1,
  },
  contactReplyText: {
    ...textStyles.body5,
    color: colors.success,
    marginTop: spacing.sm,
  },
  contactConfirmButton: {
    height: 48,
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  contactConfirmButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
