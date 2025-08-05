import "ts-node/register";

import type { ConfigContext, ExpoConfig } from "expo/config";
import { match } from "ts-pattern";
import { z } from "zod";
import { envSchema as publicEnvSchema } from "./src/core/env/schema";

const projectId = "c78be390-3769-4983-be83-9888018dbb02";

export const envSchema = publicEnvSchema.extend({
  EAS_INIT: z.literal("true"),
  DEV_CLIENT: z.coerce.boolean().default(false),
});

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EAS_INIT == null) {
    /**
     * @note EAS에서 env를 가져오기 위해 projectId를 사용하면서 config evaluation이 여러번 되는데,
     * config validation 실패를 막기 위해 env 로딩 전에는 아래 fallback을 사용합니다.
     */
    return {
      ...config,
      name: "Fallback",
      slug: "showbility",
      extra: { eas: { projectId } },
    };
  }

  const { data: env, error } = envSchema.safeParse(process.env);
  if (!env) throw new Error("Env parse fail", { cause: error });

  const PROFILE = match(env)
    .with({ EXPO_PUBLIC_CHANNEL: "prod" }, () => "prod")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: false }, () => "alpha")
    .with({ EXPO_PUBLIC_CHANNEL: "dev", DEV_CLIENT: true }, () => "dev")
    .exhaustive();

  const switchProfile = <T>(map: Record<typeof PROFILE, T>) => map[PROFILE];

  return {
    ...config,
    newArchEnabled: true,
    name: switchProfile({
      dev: "Ottrip Dev",
      alpha: "Ottrip Alpha",
      prod: "Ottrip",
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
    }),
    version: "1.2.0",
    orientation: "portrait",
    icon: `./assets/${switchProfile({
      dev: "icon-dev.png",
      alpha: "icon-alpha.png",
      prod: "icon.png",
    })}`,
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      usesAppleSignIn: true,
      supportsTablet: false,
      bundleIdentifier: `com.ottrip.app.${switchProfile({
        dev: "OttripDev",
        alpha: "OttripAlpha",
        prod: "Ottrip",
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
      })}`,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
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
      "expo-apple-authentication",
      [
        "expo-font",
        {
          fonts: [
            "Pretendard-Thin",
            "Pretendard-ExtraLight",
            "Pretendard-Light",
            "Pretendard-Regular",
            "Pretendard-Medium",
            "Pretendard-SemiBold",
            "Pretendard-Bold",
            "Pretendard-ExtraBold",
            "Pretendard-Black",
          ].map(fontName => `./assets/fonts/${fontName}.otf`),
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "작품 업로드를 위해 사진 접근 권한이 필요해요.",
          cameraPermission: "작품 업로드를 위해 카메라 접근 권한이 필요해요.",
        },
      ],
    ],
  };
};

const conditionalPlugin = (
  condition: boolean,
  value: NonNullable<ExpoConfig["plugins"]>[number],
) => (condition ? [value] : []);
