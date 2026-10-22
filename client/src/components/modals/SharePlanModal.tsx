import { PLACEHOLDERS } from "@/constants/placeholders";
import { type PlanShare, plansApi } from "@/services/plans";
import { useBackdropClose } from "@/hooks/useBackdropClose";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { toUserMessage } from "@/utils/crossPlatformAlert";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import ShareAddIcon from "../../../assets/share_add.svg";
import ShareDeleteIcon from "../../../assets/share_del.svg";
import WarnTriangleIcon from "../../../assets/warn_triangle.svg";
import CloseXIcon from "../../../assets/close_x.svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: {
    email: string;
    role: "editor" | "viewer";
    expires_days?: number;
  }) => Promise<void>;
  planId: number;
  planName?: string;
};

export default function SharePlanModal({
  visible,
  onClose,
  onSubmit,
  planId,
  planName,
}: Props) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState(false);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [days, _setDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [shares, setShares] = useState<PlanShare[]>([]);

  const loadShares = async () => {
    if (!planId) return;
    setListLoading(true);
    try {
      const data = await plansApi.listShares(planId);
      setShares(data);
    } catch (_e: any) {
    } finally {
      setListLoading(false);
    }
  };

  const isEmailValid = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const showEmailError =
    emailTouched && email.trim().length > 0 && !isEmailValid(email);

  useEffect(() => {
    if (visible) {
      void loadShares();
    } else {
      setEmail("");
      setEmailTouched(false);
      setDuplicateEmailError(false);
    }
  }, [visible]);

  const submit = async () => {
    setEmailTouched(true);
    setDuplicateEmailError(false);
    if (!email.trim()) {
      Alert.alert("알림", "이메일을 입력해주세요");
      return;
    }
    if (!isEmailValid(email)) return;
    if (shares.some(s => s.email === email.trim())) {
      setDuplicateEmailError(true);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        email: email.trim(),
        role,
        expires_days: Number(days) || undefined,
      });
      setEmail("");
      await loadShares();
    } catch (e: any) {
      Alert.alert("알림", toUserMessage(e, "초대 전송에 실패했습니다"));
    } finally {
      setLoading(false);
    }
  };

  const backdrop = useBackdropClose(onClose);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay} {...backdrop.overlayProps}>
        <View style={styles.card} {...backdrop.cardProps}>
            <View style={styles.header}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title}>
                  {planName ? `여행 공유: ${planName}` : "여행 공유"}
                </Text>
                <Text style={styles.description}>
                  다른 사람과 여행을 공유하고 함께 계획을 세워보세요.
                </Text>
              </View>
              <MotionPressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <MotionIcon>
                  <CloseXIcon width={16} height={16} color={colors.gray900} />
                </MotionIcon>
              </MotionPressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>이메일</Text>
              <View
                style={[
                  styles.emailRow,
                  (showEmailError || duplicateEmailError) && {
                    marginBottom: 0,
                  },
                ]}
              >
                <Input
                  variant="filled"
                  placeholder={PLACEHOLDERS.plan.email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={val => {
                    setEmail(val);
                    setEmailTouched(false);
                    setDuplicateEmailError(false);
                  }}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                  containerStyle={styles.emailInputContainer}
                  style={[
                    styles.emailInput,
                    (showEmailError || duplicateEmailError) &&
                      styles.emailInputError,
                  ]}
                />
                <MotionPressable
                  style={[
                    styles.inviteButton,
                    !email.trim() && styles.inviteButtonDisabled,
                  ]}
                  hoverStyle={shadows.darkHover}
                  onPress={submit}
                  disabled={!email.trim() || loading}
                  accessibilityLabel="초대"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <MotionIcon>
                      <ShareAddIcon
                        width={18}
                        height={18}
                        color={email.trim() ? colors.white : colors.gray400}
                      />
                    </MotionIcon>
                  )}
                </MotionPressable>
              </View>
              {(showEmailError || duplicateEmailError) && (
                <View style={styles.emailError}>
                  <WarnTriangleIcon width={13} height={13} />
                  <Text style={styles.emailErrorText}>
                    {duplicateEmailError
                      ? "이미 공유된 사용자예요."
                      : "올바른 이메일 형식이 아니에요."}
                  </Text>
                </View>
              )}
              <View style={styles.roleOptions}>
                {(
                  [
                    { value: "viewer", label: "보기" },
                    { value: "editor", label: "수정" },
                  ] as const
                ).map(option => {
                  const active = role === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={styles.roleOption}
                      onPress={() => setRole(option.value)}
                    >
                      <View
                        style={[
                          styles.roleRadio,
                          radioTransition,
                          active && styles.roleRadioActive,
                        ]}
                      />
                      <Text style={styles.roleLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>공유된 사용자</Text>
              {listLoading ? (
                <ActivityIndicator
                  color={colors.gray600}
                  style={{ marginTop: 12 }}
                />
              ) : shares.length === 0 ? (
                <Text style={styles.empty}>아직 공유된 사용자가 없습니다.</Text>
              ) : (
                <ScrollView
                  style={styles.shareList}
                  contentContainerStyle={styles.shareListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {shares.map(s => {
                    const roleLabel =
                      s.role == null
                        ? "OWNER"
                        : s.role === "editor"
                          ? "EDITOR"
                          : "VIEWER";
                    const isOwner = s.role == null;
                    return (
                      <View
                        key={`${s.handle}-${s.role ?? "owner"}`}
                        style={styles.shareChip}
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
                                  const msg =
                                    e?.response?.status === 403
                                      ? "권한이 없습니다"
                                      : toUserMessage(e, "삭제에 실패했습니다");
                                  Alert.alert("알림", msg);
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

            <MotionPressable
              style={styles.primaryButton}
              hoverStyle={shadows.darkHover}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>완료</Text>
            </MotionPressable>
        </View>
      </View>
    </Modal>
  );
}

const radioTransition = {
  transitionProperty: "border-width, border-color",
  transitionDuration: "120ms",
} as ViewStyle;

const styles = StyleSheet.create({
  overlay: {
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lgPlus,
  },
  card: {
    ...modalMotion.card,
    width: 420 + spacing.xl * 2,
    maxWidth: "100%",
    maxHeight: "min(680px, calc(100dvh - 80px))" as ViewStyle["maxHeight"],
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerTextGroup: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  description: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  fieldGroup: {
    width: "100%",
  },
  label: {
    ...textStyles.h7,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  emailInputContainer: {
    flex: 1,
  },
  emailInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray350,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    ...textStyles.body5,
    color: colors.gray900,
  },
  emailInputError: {
    borderColor: colors.warning,
  },
  emailError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  emailErrorText: {
    ...textStyles.h9,
    color: colors.danger,
  },
  inviteButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    ...surfaces.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonDisabled: {
    borderWidth: 1,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    backgroundImage: "none",
    boxShadow: "none",
  } as ViewStyle,
  roleOptions: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
  },
  roleRadioActive: {
    borderWidth: 5,
    borderColor: colors.gray900,
  },
  roleLabel: {
    ...textStyles.body4,
    color: colors.gray900,
  },
  shareList: {
    maxHeight: 200,
  },
  shareListContent: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  shareChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  shareChipText: {
    flex: 1,
    marginRight: spacing.md,
  },
  shareEmail: {
    ...textStyles.body4,
    color: colors.primary,
  },
  shareChipMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  shareRoleText: {
    ...textStyles.h9,
    color: colors.gray700,
  },
  shareRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  primaryButton: {
    height: 52,
    borderRadius: radii.mdPlus,
    ...surfaces.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
