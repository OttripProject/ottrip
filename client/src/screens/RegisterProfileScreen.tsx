import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useNicknameValidation } from "@/hooks/useNicknameValidation";
import api from "@/services/api";
import { authApi } from "@/services/auth";
import { plansApi } from "@/services/plans";
import { Gender } from "@/types/api";
import Card from "@/ui/components/Card";
import GradientBackground from "@/ui/components/GradientBackground";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GenderCheckIcon from "../../assets/gender_check.svg";
import LeftArrowIcon from "../../assets/left_arrow.svg";

type RouteParams = {
  registerToken: string;
  prefill: { name?: string | null; profile_image?: string | null };
  email: string;
  terms?: { tos: boolean; privacy: boolean; marketing: boolean };
};

function toHandleFromEmail(email: string): string {
  const local = email.split("@")[0] || "";
  const base = local.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  return base.slice(0, 20) || "user123";
}

export default function RegisterProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { registerToken, prefill, email, terms } = route.params as RouteParams;

  const [nickname, setNickname] = useState(prefill?.name || "");
  const [gender, setGender] = useState<Gender | null>(null);
  const [handle] = useState(() => toHandleFromEmail(email));

  const { nicknameError, checkingNickname, onNicknameChange, isValid } =
    useNicknameValidation();

  useEffect(() => {
    if (nickname.trim().length > 0) {
      onNicknameChange(nickname);
    }
  }, []);

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    onNicknameChange(text);
  };

  const canSubmit = isValid && nickname.trim().length > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      const registerResponse = await authApi.registerUser(
        {
          handle,
          nickname: nickname.trim(),
          description: "",
          gender,
          agreed_terms: terms?.tos ?? true,
          agreed_privacy: terms?.privacy ?? true,
          agreed_marketing: terms?.marketing ?? false,
        },
        registerToken,
      );

      await login({
        isRegistered: true,
        accessToken: registerResponse.accessToken,
        refreshToken: registerResponse.refreshToken,
      } as any);

      try {
        const token =
          Platform.OS === "web"
            ? window.localStorage.getItem("pendingInviteToken")
            : await SecureStore.getItemAsync("pendingInviteToken");
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          if (Platform.OS === "web") {
            window.localStorage.removeItem("pendingInviteToken");
            window.dispatchEvent(new Event("plans-refresh"));
          } else {
            await SecureStore.deleteItemAsync("pendingInviteToken");
          }
        }
      } catch {}

      if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
          const saveId = window.localStorage.getItem("pendingSavePublicId");
          if (saveId) {
            window.localStorage.removeItem("pendingSavePublicId");
            const result = await plansApi.saveExport(saveId);
            window.location.replace(
              `${window.location.origin}/plans/${result.planPublicId}`,
            );
            return;
          }
        } catch {}
        try {
          window.localStorage.setItem("registerComplete", "true");
        } catch {}
        window.location.replace(`${window.location.origin}/welcome`);
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: "WELCOME" }] });
    } catch (e: any) {
      Alert.alert(
        "가입 실패",
        e?.response?.data?.detail || e.message || "알 수 없는 오류",
      );
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          <Card variant="basic" alignItems="flex-start">
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("로그인");
                }
              }}
            >
              <LeftArrowIcon width={24} height={24} fill={colors.black} />
            </Pressable>

            <Text style={styles.title}>프로필 설정</Text>
            <Text style={styles.subtitle}>
              개인정보 및 환경설정을 관리하세요.
            </Text>

            <Text style={styles.emailLabel}>이메일</Text>
            <View style={styles.emailContainer}>
              <Text style={styles.emailText}>{email}</Text>
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
            {nicknameError && (
              <Text style={styles.errorText}>{nicknameError}</Text>
            )}
            {!nicknameError &&
              !checkingNickname &&
              nickname.trim().length > 0 && (
                <Text style={styles.successText}>
                  사용 가능한 닉네임입니다.
                </Text>
              )}

            <Text style={styles.genderLabel}>성별</Text>
            <View style={styles.genderContainer}>
              {[Gender.MALE, Gender.FEMALE].map(g => (
                <Pressable
                  key={g}
                  style={styles.genderOption}
                  onPress={() => setGender(prev => (prev === g ? null : g))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: gender === g }}
                >
                  <View
                    style={[
                      styles.radioButton,
                      gender === g && styles.radioButtonSelected,
                    ]}
                  >
                    {gender === g && (
                      <GenderCheckIcon
                        width={16}
                        height={16}
                        color={colors.white}
                      />
                    )}
                  </View>
                  <Text style={styles.genderText}>
                    {g === Gender.MALE ? "남성" : "여성"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              disabled={!canSubmit}
              style={[
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  !canSubmit && styles.submitButtonTextDisabled,
                ]}
              >
                회원가입
              </Text>
            </Pressable>
          </Card>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 40,
    top: 50,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  title: {
    position: "absolute",
    left: 40,
    top: 96,
    ...textStyles.h2,
  },
  subtitle: {
    position: "absolute",
    left: 40,
    top: 140,
    ...textStyles.body3,
    color: colors.gray700,
  },
  emailLabel: {
    position: "absolute",
    left: 40,
    top: 206,
    ...textStyles.h7,
  },
  emailContainer: {
    position: "absolute",
    left: 40,
    top: 234,
    width: 400,
    height: 48,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emailText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  nicknameLabel: {
    position: "absolute",
    left: 40,
    top: 306,
    ...textStyles.h7,
  },
  nicknameInputContainer: {
    position: "absolute",
    left: 40,
    top: 334,
    width: 400,
  },
  input: {
    height: 48,
  },
  errorText: {
    position: "absolute",
    left: 40,
    top: 390,
    ...textStyles.body5,
    color: colors.danger,
  },
  successText: {
    position: "absolute",
    left: 40,
    top: 390,
    ...textStyles.body5,
    color: colors.success,
  },
  genderLabel: {
    position: "absolute",
    left: 40,
    top: 432,
    ...textStyles.h7,
  },
  genderContainer: {
    position: "absolute",
    left: 40,
    top: 460,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  genderText: {
    ...textStyles.body2,
  },
  submitButton: {
    position: "absolute",
    left: 40,
    top: 520,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  submitButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.gray700,
  },
});
