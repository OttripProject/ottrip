import "ts-node/register";

import type { ConfigContext, ExpoConfig } from "expo/config";
import { match } from "ts-pattern";
import { z } from "zod";

const projectId = "760d14be-9546-4b34-bb91-d0348bceaaf9";

// NOTE: app.config.ts는 런타임이 아닌 빌드 시점에 실행됩니다.
// TS 의존성을 줄이기 위해 로컬 스키마를 사용합니다.
const envSchema = z.object({
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod", "local"]).default("local"),
  DEV_CLIENT: z.coerce.boolean().default(false),
  EXPO_PUBLIC_GOOGLE_CLIENT_IOS_URL: z.string().optional(),
});

export default ({ config }: ConfigContext): ExpoConfig => {
  // iOS URL 스킴(반드시 .env에 세팅 필요)
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_IOS_URL;

  // 공통 플러그인
  const getPlugins = (): ExpoConfig["plugins"] => {
    const basePlugins: NonNullable<ExpoConfig["plugins"]> = [
      "expo-asset",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          android: {
            extraMavenRepos: [
              "https://devrepo.kakao.com/nexus/content/groups/public/",
            ],
          },
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/Pretendard-Regular.otf",
            "./assets/fonts/Pretendard-SemiBold.otf",
            "./assets/fonts/Poppins-Medium.ttf",
            "./assets/fonts/Poppins-SemiBold.ttf",
          ],
        },
      ],
    ];

    if (iosUrlScheme) {
      basePlugins.push([
        "@react-native-google-signin/google-signin",
        { iosUrlScheme },
      ]);
    } else {
      console.warn("⚠️ EXPO_PUBLIC_GOOGLE_CLIENT_IOS_URL is missing.");
    }

    return basePlugins;
  };

  const commonPlugins = getPlugins();

  // EAS_INIT 없을 때도 플러그인 적용
  if (process.env.EAS_INIT == null) {
    return {
      ...config,
      name: "OTTRIP",
      slug: "ottrip",
      extra: { eas: { projectId } },
      plugins: commonPlugins,
    };
  }

  const { data: env, error } = envSchema.safeParse(process.env);
  if (!env) {
    console.error("❌ 환경 변수 검증 실패 상세 사유:", JSON.stringify(error.format(), null, 2));
    throw new Error("Env parse fail", { cause: error });
  }

  const PROFILE = match(env)
    .with({ EXPO_PUBLIC_CHANNEL: "prod" }, () => "prod")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: false }, () => "alpha")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: true }, () => "dev")
    .with({ EXPO_PUBLIC_CHANNEL: "local" }, () => "local")
    .exhaustive();

  const switchProfile = <T>(map: Record<typeof PROFILE, T>) => map[PROFILE];

  return {
    ...config,
    newArchEnabled: true,
    name: switchProfile({
      dev: "Ottrip Dev",
      alpha: "Ottrip Alpha",
      prod: "Ottrip",
      local: "Ottrip Local",
    }),
    slug: "ottrip",
    owner: "ottrip",
    extra: { eas: { projectId } },
    updates: {
      url: `https://u.expo.dev/${projectId}`,
    },
    runtimeVersion: "1.4.2", // TODO : 정책 결정하기
    scheme: switchProfile({
      dev: "ottrip-dev",
      alpha: "ottrip-alpha",
      prod: "ottrip",
      local: "ottrip-local",
    }),
    version: "1.2.0",
    orientation: "portrait",
    icon: `./assets/${switchProfile({
      dev: "icon-dev.png",
      alpha: "icon-alpha.png",
      prod: "icon.png",
      local: "icon-dev.png",
    })}`,
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    // Apple App ID(Sign in with Apple)는 아래 번들 ID와 1:1로 맞춤
    // local → OttripLocal | dev → OttripDev | alpha → OttripAlpha | prod → Ottrip
    ios: {
      usesAppleSignIn: true,
      supportsTablet: false,
      bundleIdentifier: `com.ottrip.app.${switchProfile({
        dev: "OttripDev",
        alpha: "OttripAlpha",
        prod: "Ottrip",
        local: "OttripLocal",
      })}`,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: `com.ottrip.app.${switchProfile({
        dev: "OttripDev",
        alpha: "OttripAlpha",
        prod: "Ottrip",
        local: "OttripLocal",
      })}`,
    },
    web: {
      favicon: "./assets/favicon.png",
      name: switchProfile({
        dev: "Ottrip Dev",
        alpha: "Ottrip Alpha",
        prod: "OTTRIP",
      }),
    },
    plugins: commonPlugins,
  };
};
