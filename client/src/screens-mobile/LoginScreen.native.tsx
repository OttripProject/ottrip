import { useAuth } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";
import api from "@/services/api";
import { type AuthResponse, authApi } from "@/services/auth";
import AppleButton from "@/ui/components/AppleButton";
import GoogleButton from "@/ui/components/GoogleButton";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
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

const env = loadPublicEnv();

const base64UrlDecode = (input: string) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 2 ? "==" : base64.length % 4 === 3 ? "=" : "";
  const str = atob(base64 + pad);
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
};

const parseIdToken = (idToken: string): any | null => {
  try {
    const [, payload] = idToken.split(".");
    const json = base64UrlDecode(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const SOCIAL_LOGIN_CONFLICT_DEFAULT =
  "이 계정은 다른 사용자와 연결되어 있습니다.";

function showSocialLoginError(err: unknown) {
  const e = err as {
    response?: { status?: number; data?: { detail?: string } };
  };
  if (e?.response?.status !== 409) return;
  const detail = e?.response?.data?.detail;
  const message =
    typeof detail === "string" && detail
      ? detail
      : SOCIAL_LOGIN_CONFLICT_DEFAULT;
  Alert.alert("안내", message);
}

export default function LoginScreenNative() {
  const { login, loginAsGuest } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const guestUpgrade =
    (route.params as { guestUpgrade?: boolean } | undefined)?.guestUpgrade ===
    true;
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS !== "ios") {
        return;
      }
      try {
        const ok = await AppleAuthentication.isAvailableAsync();
        if (mounted) {
          setIsAppleAuthAvailable(ok);
        }
      } catch {
        if (mounted) {
          setIsAppleAuthAvailable(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const iosClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
    const webClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (iosClientId && webClientId) {
      GoogleSignin.configure({
        iosClientId,
        webClientId,
        offlineAccess: false,
      });
    } else if (webClientId) {
      GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
      });
    }
  }, []);

  const completeAuthResponse = async (
    response: AuthResponse,
    tokenForEmail: string,
  ) => {
    if (response.isRegistered) {
      await login({
        isRegistered: true,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      try {
        const token = await SecureStore.getItemAsync("pendingInviteToken");
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          await SecureStore.deleteItemAsync("pendingInviteToken");
        }
      } catch {}

      setIsLoading(false);
      if (guestUpgrade) {
        navigation.reset({ index: 0, routes: [{ name: "OTTRIP" }] });
      }
      return;
    }

    await login(response);
    const payload = parseIdToken(tokenForEmail);
    const email = payload?.email ?? "";
    navigation.navigate("약관동의", {
      registerToken: response.registerToken,
      prefill: response.prefill,
      email,
    });
    setIsLoading(false);
  };

  const submitGoogleToken = async (idToken: string) => {
    try {
      const response = await authApi.googleLogin(idToken);
      await completeAuthResponse(response, idToken);
    } catch (err: unknown) {
      setIsLoading(false);
      showSocialLoginError(err);
    }
  };

  const submitAppleToken = async (identityToken: string) => {
    try {
      const response = await authApi.appleLogin(identityToken);
      await completeAuthResponse(response, identityToken);
    } catch (err: unknown) {
      setIsLoading(false);
      showSocialLoginError(err);
    }
  };

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "android") {
        try {
          await GoogleSignin.hasPlayServices();
        } catch {
          setIsLoading(false);
          return;
        }
      }

      const signInResult = await GoogleSignin.signIn();
      const idToken =
        (signInResult as any).data?.idToken || (signInResult as any).idToken;

      if (idToken) {
        await submitGoogleToken(idToken);
      } else {
        setIsLoading(false);
      }
    } catch (_error: any) {
      setIsLoading(false);
    }
  };

  const onGuestPlanContinue = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: "OTTRIP" }] });
    }
  };

  const onGuestStart = async () => {
    setIsLoading(true);
    try {
      await loginAsGuest();
      try {
        const token = await SecureStore.getItemAsync("pendingInviteToken");
        if (token) {
          await api.post(`/private/plans/invitations/${token}/accept`);
          await SecureStore.deleteItemAsync("pendingInviteToken");
        }
      } catch {}
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const onAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      return;
    }
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await submitAppleToken(credential.identityToken);
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>OTTRIP</Text>
          <Text style={styles.subtitle}>
            {guestUpgrade
              ? "Google 또는 Apple로 로그인하고\n기존 여행일정을 유지할 수 있어요"
              : "여행 계획을 더 스마트하게"}
          </Text>

          <View style={styles.buttonContainer}>
            <GoogleButton
              onPress={onGoogleSignIn}
              disabled={isLoading}
              isLoading={isLoading}
              style={styles.googleButton}
              iconSize={20}
              textStyle={styles.googleButtonText}
            />
            {isAppleAuthAvailable ? (
              <AppleButton
                onPress={onAppleSignIn}
                disabled={isLoading}
                isLoading={isLoading}
                style={styles.appleButton}
                textStyle={styles.appleButtonText}
                iconSize={34}
              />
            ) : null}
            <Pressable
              onPress={guestUpgrade ? onGuestPlanContinue : onGuestStart}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.guestLink,
                pressed && styles.guestLinkPressed,
              ]}
            >
              <Text style={styles.guestLinkText}>
                {guestUpgrade ? "게스트로 이어하기" : "게스트로 시작하기"}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 327,
    alignItems: "center",
  },
  title: {
    ...textStyles.h1,
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...textStyles.body2,
    color: colors.gray800,
    marginBottom: 36,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  googleButton: {
    width: "100%",
    maxWidth: 327,
    height: 50,
    borderRadius: 12,
  },
  googleButtonText: {
    ...textStyles.h6,
  },
  appleButton: {
    width: "100%",
    maxWidth: 327,
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
  appleButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  guestLink: {
    marginTop: 8,
  },
  guestLinkPressed: {
    opacity: 0.6,
  },
  guestLinkText: {
    ...textStyles.body4,
    color: colors.gray500,
    textDecorationLine: "underline",
  },
});
