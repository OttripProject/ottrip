import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TermCheckIcon from "../../assets/check_black.svg";
import LeftArrowIcon from "../../assets/left_arrow_L.svg";
import CheckWithCircleIcon from "../../assets/mobile_agreed.svg";
import CloseIcon from "../../assets/mobile_x.svg";
import RightArrowTermIcon from "../../assets/right_arrow_term.svg";

type RouteParams = {
  registerToken: string;
  prefill: { name?: string | null; profile_image?: string | null };
  email: string;
};

export default function TermsConsentScreenNative() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { registerToken, prefill, email } = route.params as RouteParams;

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);

  useEffect(() => {
    setAgreeAll(agree1 && agree2 && agree3);
  }, [agree1, agree2, agree3]);

  const handleAgreeAll = () => {
    const newValue = !agreeAll;
    setAgreeAll(newValue);
    setAgree1(newValue);
    setAgree2(newValue);
    setAgree3(newValue);
  };

  const allRequiredChecked = agree1 && agree2;

  const goBackOrLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("로그인" as never);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 헤더 — 게스트(로그인됨)에서 소셜 → 약관일 때는 스택에 '로그인'이 없을 수 있어 goBack 우선 */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={goBackOrLogin} hitSlop={8}>
          <LeftArrowIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>회원가입</Text>
        <Pressable style={styles.headerBtn} onPress={goBackOrLogin} hitSlop={8}>
          <CloseIcon width={24} height={24} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 타이틀 */}
        <Text style={styles.title}>
          Ottrip 계정{"\n"}서비스 약관에 동의해주세요
        </Text>

        {/* 모두 동의 */}
        <Pressable style={styles.agreeAllRow} onPress={handleAgreeAll}>
          <View style={styles.agreeAllIconWrap}>
            <CheckWithCircleIcon
              width={24}
              height={24}
              color={agreeAll ? colors.black : colors.gray400}
            />
          </View>
          <Text style={styles.agreeAllLabel}>모두 동의</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* [필수] 서비스 이용 약관 */}
        <View style={styles.termRow}>
          <Pressable
            style={styles.termCheckArea}
            onPress={() => setAgree1(!agree1)}
          >
            <View style={styles.termIconWrap}>
              <TermCheckIcon
                width={24}
                height={24}
                color={agree1 ? colors.black : colors.gray400}
              />
            </View>
            <Text style={styles.termLabel}>[필수] 서비스 이용 약관</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("상세내용", { key: "tos" })}
            hitSlop={8}
          >
            <RightArrowTermIcon width={16} height={16} />
          </Pressable>
        </View>

        {/* [필수] 개인정보 수집 및 이용 */}
        <View style={styles.termRow}>
          <Pressable
            style={styles.termCheckArea}
            onPress={() => setAgree2(!agree2)}
          >
            <View style={styles.termIconWrap}>
              <TermCheckIcon
                width={24}
                height={24}
                color={agree2 ? colors.black : colors.gray400}
              />
            </View>
            <Text style={styles.termLabel}>[필수] 개인정보 수집 및 이용</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("상세내용", { key: "privacy" })}
            hitSlop={8}
          >
            <RightArrowTermIcon width={16} height={16} />
          </Pressable>
        </View>

        {/* [선택] 이벤트 혜택 */}
        <View style={styles.termRow}>
          <Pressable
            style={styles.termCheckArea}
            onPress={() => setAgree3(!agree3)}
          >
            <View style={styles.termIconWrap}>
              <TermCheckIcon
                width={24}
                height={24}
                color={agree3 ? colors.black : colors.gray400}
              />
            </View>
            <Text style={styles.termLabel}>
              [선택] 이벤트*혜택 정보 수신 및 활용 동의
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate("상세내용", { key: "marketing" })
            }
            hitSlop={8}
          >
            <RightArrowTermIcon width={16} height={16} />
          </Pressable>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        <Pressable
          style={[
            styles.nextButton,
            !allRequiredChecked && styles.nextButtonDisabled,
          ]}
          disabled={!allRequiredChecked}
          onPress={() =>
            navigation.navigate("프로필 입력", {
              registerToken,
              prefill,
              email,
              terms: { tos: agree1, privacy: agree2, marketing: agree3 },
            })
          }
        >
          <Text
            style={[
              styles.nextButtonText,
              !allRequiredChecked && styles.nextButtonTextDisabled,
            ]}
          >
            다음
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.white,
  },
  headerBtn: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    ...textStyles.h5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 24,
  },
  title: {
    ...textStyles.h2,
    marginBottom: 36,
  },
  agreeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  agreeAllIconWrap: {
    width: 24,
    height: 24,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  agreeAllLabel: {
    ...textStyles.h6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginVertical: 6,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  termCheckArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  termLabel: {
    ...textStyles.body4,
    flex: 1,
  },
  termIconWrap: {
    width: 24,
    height: 24,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  nextButton: {
    paddingVertical: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  nextButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  nextButtonTextDisabled: {
    color: colors.white,
  },
});
