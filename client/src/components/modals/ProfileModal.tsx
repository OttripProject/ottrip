import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useMe } from "@/hooks/useMe";
import { useNicknameValidation } from "@/hooks/useNicknameValidation";
import { type UserProfile, usersApi } from "@/services/users";
import { Gender } from "@/types/api";
import Card from "@/ui/components/Card";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
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
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [language, setLanguage] = useState<"ko" | "en">("ko");
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
      Alert.alert("알림", "닉네임을 확인해주세요");
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
              <Card variant="basic" alignItems="flex-start" minHeight={568}>
                <Pressable style={styles.guestCloseButton} onPress={onClose}>
                  <XIcon width={24} height={24} fill={colors.black} />
                </Pressable>

                <Text style={styles.guestTitle}>프로필 설정</Text>
                <Text style={styles.guestStatusLine}>
                  게스트 · 일정 임시 저장
                </Text>
                <Text style={styles.guestDescription}>
                  로그인하면 임시 저장된 일정을 계정과 연동할 수 있어요.
                </Text>
                <Pressable
                  disabled={deletingGuestData}
                  style={[
                    styles.guestLoginButton,
                    deletingGuestData && styles.guestButtonDisabled,
                  ]}
                  onPress={handleSignUp}
                >
                  <Text style={styles.guestLoginButtonText}>로그인</Text>
                </Pressable>
                <Pressable
                  disabled={deletingGuestData}
                  style={[
                    styles.guestDeleteRecordsButton,
                    deletingGuestData && styles.guestButtonDisabled,
                  ]}
                  onPress={handleDeleteTemporaryRecords}
                >
                  <Text style={styles.guestDeleteRecordsButtonText}>
                    임시 기록 삭제
                  </Text>
                </Pressable>
                <Text style={styles.guestInquiryTitle}>문의하기</Text>
                <View style={styles.guestInquiryEmailBox}>
                  <Text
                    style={styles.guestInquiryEmailText}
                    numberOfLines={1}
                    selectable
                  >
                    {CONTACT_EMAIL}
                  </Text>
                  <View style={styles.guestInquiryCopyWrap}>
                    {copied ? (
                      <Text style={styles.guestInquiryCopiedText}>복사됨!</Text>
                    ) : (
                      <Pressable
                        hitSlop={8}
                        style={styles.guestInquiryCopyIcon}
                        onPress={handleCopy}
                      >
                        <CopyIcon
                          width={16}
                          height={16}
                          fill={colors.gray700}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text style={styles.guestInquiryReplyText}>
                  최대한 빠르게 답변드리겠습니다.
                </Text>
                <Pressable
                  style={styles.guestTermsPolicyRow}
                  onPress={() => setTermsPolicyModalOpen(true)}
                  hitSlop={6}
                >
                  <DocumentIcon width={16} height={16} color={colors.gray800} />
                  <Text style={styles.guestTermsPolicyText}>
                    약관 및 정책 확인하기
                  </Text>
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

        <Modal visible={contactOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.contactCard}>
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
                  {copied ? (
                    <Text style={styles.contactCopiedText}>복사됨!</Text>
                  ) : (
                    <MotionIcon>
                      <CopyIcon width={16} height={16} fill={colors.gray700} />
                    </MotionIcon>
                  )}
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
    ...surfaces.overlay,
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
    padding: spacing.md,
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
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  contactCard: {
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
  contactCopiedText: {
    ...textStyles.body5,
    color: colors.gray700,
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
