import "ts-node/register";

import type { ConfigContext, ExpoConfig } from "expo/config";
import { match } from "ts-pattern";
import { z } from "zod";

const projectId = "760d14be-9546-4b34-bb91-d0348bceaaf9";

const BUNDLE_ID_BY_PROFILE = {
  prod: "ottripofficial.ottrip",
  alpha: "ottripofficial.ottrip.alpha",
} as const;

const PHOTO_LIBRARY_USAGE_DESCRIPTION =
  "이미지를 첨부하기 위해 사진 라이브러리에 접근합니다.";

const envSchema = z.object({
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod", "local"]).default("local"),
  DEV_CLIENT: z.coerce.boolean().default(false),
  EXPO_PUBLIC_GOOGLE_CLIENT_IOS_URL: z.string().optional(),
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_IOS_URL;

  const getPlugins = (): ExpoConfig["plugins"] => {
    const basePlugins: NonNullable<ExpoConfig["plugins"]> = [
      "expo-asset",
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-build-properties",
        {
          android: {
            extraMavenRepos: [
              "https://devrepo.kakao.com/nexus/content/groups/public/",
            ],
          },
          ios: {
            extraPods: [
              { name: "GoogleUtilities", modular_headers: true },
              { name: "RecaptchaInterop", modular_headers: true },
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
      [
        "expo-image-picker",
        {
          photosPermission: PHOTO_LIBRARY_USAGE_DESCRIPTION,
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? "",
          iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? "",
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

  if (process.env.EAS_INIT == null) {
    const bundleId = BUNDLE_ID_BY_PROFILE.alpha;
    return {
      ...config,
      name: "오티트립",
      slug: "ottrip",
      extra: { eas: { projectId } },
      plugins: commonPlugins,
      ios: {
        ...(config as ExpoConfig).ios,
        bundleIdentifier: bundleId,
        infoPlist: {
          ...((config as ExpoConfig).ios?.infoPlist as
            | Record<string, unknown>
            | undefined),
          NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_USAGE_DESCRIPTION,
        },
      },
      android: {
        ...(config as ExpoConfig).android,
        package: bundleId,
        googleServicesFile: "./google-services.json",
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
      },
    };
  }

  const { data: env, error } = envSchema.safeParse(process.env);
  if (!env) {
    console.error(
      "❌ 환경 변수 검증 실패 상세 사유:",
      JSON.stringify(error.format(), null, 2),
    );
    throw new Error("Env parse fail", { cause: error });
  }

  const PROFILE = match(env)
    .with({ EXPO_PUBLIC_CHANNEL: "prod" }, () => "prod")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: false }, () => "alpha")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: true }, () => "dev")
    .with({ EXPO_PUBLIC_CHANNEL: "local" }, () => "local")
    .exhaustive();

  const switchProfile = <T>(map: Record<typeof PROFILE, T>) => map[PROFILE];

  const bundleId = switchProfile(BUNDLE_ID_BY_PROFILE);

  return {
    ...config,
    newArchEnabled: true,
    name: switchProfile({
      dev: "오티트립 Dev",
      alpha: "오티트립 Alpha",
      prod: "오티트립",
      local: "오티트립 Local",
    }),
    slug: "ottrip",
    owner: "ottrip",
    extra: { eas: { projectId } },
    updates: {
      url: `https://u.expo.dev/${projectId}`,
    },
    runtimeVersion: "1.0.0",
    scheme: switchProfile({
      dev: "ottrip-dev",
      alpha: "ottrip-alpha",
      prod: "ottrip",
      local: "ottrip-local",
    }),
    version: "1.0.3",
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
    ios: {
      usesAppleSignIn: true,
      supportsTablet: false,
      bundleIdentifier: bundleId,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_USAGE_DESCRIPTION,
      },
    },
    android: {
      package: bundleId,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
      name: switchProfile({
        dev: "오티트립 Dev",
        alpha: "오티트립 Alpha",
        prod: "오티트립",
      }),
    },
    plugins: commonPlugins,
  };
};
