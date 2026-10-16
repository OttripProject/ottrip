import { plansApi } from "@/services/plans";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { toUserMessage } from "@/utils/crossPlatformAlert";
import { validateEmail } from "@/utils/validationUtils";
import { MenuView } from "@react-native-menu/menu";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import DotsIcon from "../../../../assets/dots.svg";
import DropdownIcon from "../../../../assets/mobile_dropdown.svg";
import CloseIcon from "../../../../assets/mobile_x.svg";
import ShareAddIcon from "../../../../assets/share_add.svg";

export type SharedMemberRole = "OWNER" | "EDITOR" | "VIEWER";

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
  myRole?: "owner" | "editor" | "viewer";
}

function planShareToSharedMember(s: {
  handle: string;
  role: "editor" | "viewer" | null;
  nickname: string;
  email: string;
}): SharedMember {
  const role: SharedMemberRole =
    s.role == null ? "OWNER" : s.role === "editor" ? "EDITOR" : "VIEWER";
  const roleLabel =
    role === "OWNER"
      ? "전체 권한"
      : role === "EDITOR"
        ? "에디터 · 전체 편집 권한"
        : "뷰어 · 조회 전용";
  return { id: s.handle, email: s.email, role, roleLabel };
}

const ROLE_OPTIONS: { value: "editor" | "viewer"; label: string }[] = [
  { value: "editor", label: "에디터" },
  { value: "viewer", label: "뷰어" },
];

export default function SharedMembersModal({
  visible,
  onClose,
  planId,
  sharedMembers: propSharedMembers,
  myRole,
}: SharedMembersModalProps) {
  const canManage = myRole === "owner" || myRole === "editor";
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"editor" | "viewer">(
    "editor",
  );
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(
    null,
  );
  const [fetchedMembers, setFetchedMembers] = useState<SharedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadShares = () => {
    if (!planId) return;
    setLoading(true);
    plansApi
      .listShares(planId)
      .then(shares => setFetchedMembers(shares.map(planShareToSharedMember)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (visible && planId) {
      loadShares();
    } else {
      setFetchedMembers([]);
    }
  }, [visible, planId]);

  const sharedMembers =
    propSharedMembers != null && propSharedMembers.length > 0
      ? propSharedMembers
      : fetchedMembers;

  const inviteDisabled = !inviteEmail.trim() || inviteLoading;

  const handleInvite = async () => {
    const result = validateEmail(inviteEmail);
    if (!result.valid) {
      Alert.alert("알림", result.message);
      return;
    }
    if (!planId) {
      Alert.alert("알림", "계획 정보를 찾을 수 없습니다");
      return;
    }
    setInviteLoading(true);
    try {
      await plansApi.invite(planId, {
        email: inviteEmail.trim().toLowerCase(),
        role: selectedRole,
      });
      setInviteEmail("");
      loadShares();
    } catch (e: any) {
      const msg =
        e?.response?.status === 403
          ? "권한이 없습니다."
          : toUserMessage(e, "초대 전송에 실패했습니다");
      Alert.alert("알림", msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: "editor" | "viewer",
  ) => {
    if (!planId) return;
    setRoleUpdateLoading(memberId);
    try {
      await plansApi.updateShare(planId, memberId, role);
      loadShares();
    } catch (e: any) {
      const msg =
        e?.response?.status === 403
          ? "권한이 없습니다"
          : toUserMessage(e, "역할 변경에 실패했습니다.");
      Alert.alert("알림", msg);
    } finally {
      setRoleUpdateLoading(null);
    }
  };

  const handleRevokeMember = async (memberId: string) => {
    if (!planId) return;
    Alert.alert("공유 취소", "해당 사용자의 공유를 취소하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "확인",
        style: "destructive",
        onPress: async () => {
          setRoleUpdateLoading(memberId);
          try {
            await plansApi.revokeShare(planId, memberId);
            loadShares();
          } catch (e: any) {
            const msg =
              e?.response?.status === 403
                ? "권한이 없습니다"
                : toUserMessage(e, "공유 취소에 실패했습니다");
            Alert.alert("알림", msg);
          } finally {
            setRoleUpdateLoading(null);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.92}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>참여 멤버</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="닫기"
          >
            <CloseIcon width={24} height={24} color={colors.paletteFg3} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {canManage && (
            <View>
              <Text style={styles.sectionLabel}>멤버 초대</Text>
              <View style={styles.inviteRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="이메일 주소"
                  placeholderTextColor={colors.paletteFg3}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <MenuView
                  actions={ROLE_OPTIONS.map(opt => ({
                    id: opt.value,
                    title: opt.label,
                    state: selectedRole === opt.value ? "on" : "off",
                  }))}
                  onPressAction={({ nativeEvent }) =>
                    setSelectedRole(nativeEvent.event as "editor" | "viewer")
                  }
                >
                  <View style={styles.roleButton}>
                    <Text style={styles.roleButtonText}>
                      {ROLE_OPTIONS.find(o => o.value === selectedRole)
                        ?.label ?? "에디터"}
                    </Text>
                    <DropdownIcon
                      width={17}
                      height={17}
                      color={colors.gray700}
                    />
                  </View>
                </MenuView>
              </View>
              <ScalePressable
                style={[
                  styles.inviteButton,
                  inviteDisabled && styles.inviteButtonDisabled,
                ]}
                onPress={handleInvite}
                disabled={inviteDisabled}
              >
                {inviteLoading ? (
                  <ActivityIndicator color={colors.paletteFg3} size="small" />
                ) : (
                  <ShareAddIcon
                    width={20}
                    height={20}
                    color={inviteDisabled ? colors.paletteFg3 : colors.white}
                  />
                )}
                <Text
                  style={[
                    styles.inviteButtonText,
                    inviteDisabled && styles.inviteButtonTextDisabled,
                  ]}
                >
                  초대하기
                </Text>
              </ScalePressable>
            </View>
          )}

          <Text
            style={[
              styles.membersTitle,
              !canManage && styles.membersTitleFirst,
            ]}
          >
            참여자 ({loading ? "..." : sharedMembers.length})
          </Text>
          {loading ? (
            <ActivityIndicator
              color={colors.paletteFg3}
              style={styles.loadingIndicator}
            />
          ) : (
            sharedMembers.map((member, index) => (
              <View
                key={member.id}
                style={[styles.memberRow, index > 0 && styles.memberRowDivider]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.email.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberEmailRow}>
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {member.email}
                    </Text>
                    {member.role === "OWNER" && (
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>OWNER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberRoleLabel}>{member.roleLabel}</Text>
                </View>
                {member.role !== "OWNER" &&
                  canManage &&
                  (roleUpdateLoading === member.id ? (
                    <View style={styles.moreButton}>
                      <ActivityIndicator
                        color={colors.paletteFg3}
                        size="small"
                      />
                    </View>
                  ) : (
                    <MenuView
                      actions={[
                        ...ROLE_OPTIONS.map(opt => ({
                          id: opt.value,
                          title: opt.label,
                          state:
                            (member.role === "EDITOR" ? "editor" : "viewer") ===
                            opt.value
                              ? ("on" as const)
                              : ("off" as const),
                        })),
                        {
                          id: "revoke",
                          title: "공유 취소",
                          attributes: { destructive: true },
                        },
                      ]}
                      onPressAction={({ nativeEvent }) => {
                        if (nativeEvent.event === "revoke") {
                          handleRevokeMember(member.id);
                        } else {
                          handleUpdateMemberRole(
                            member.id,
                            nativeEvent.event as "editor" | "viewer",
                          );
                        }
                      }}
                    >
                      <View
                        style={styles.moreButton}
                        accessibilityLabel="권한 변경"
                      >
                        <DotsIcon
                          width={19}
                          height={19}
                          color={colors.paletteFg3}
                        />
                      </View>
                    </MenuView>
                  ))}
              </View>
            ))
          )}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h2,
    letterSpacing: -0.48,
    color: colors.paletteInk,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: "auto",
    marginRight: -spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  sectionLabel: {
    ...textStyles.h6,
    color: colors.gray700,
    marginBottom: spacing.md,
  },
  inviteRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    height: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.gray200,
    fontFamily: textStyles.body2.fontFamily,
    fontSize: textStyles.body2.fontSize,
    color: colors.paletteInk,
  },
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    height: 56,
    minWidth: 116,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.gray200,
  },
  roleButtonText: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 56,
    marginTop: spacing.md,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
  },
  inviteButtonDisabled: {
    backgroundColor: colors.gray200,
    experimental_backgroundImage: "none",
    boxShadow: "none",
  },
  inviteButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  inviteButtonTextDisabled: {
    color: colors.gray600,
  },
  membersTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
    marginTop: spacing["2xl"],
    marginBottom: spacing.sm,
  },
  membersTitleFirst: {
    marginTop: 0,
  },
  loadingIndicator: {
    paddingVertical: spacing.xl,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  memberRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberEmail: {
    ...textStyles.h5,
    color: colors.paletteInk,
    flexShrink: 1,
  },
  ownerBadge: {
    backgroundColor: colors.gray900,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  ownerBadgeText: {
    ...textStyles.h8,
    color: colors.white,
  },
  memberRoleLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  moreButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
