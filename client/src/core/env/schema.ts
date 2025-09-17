import { z } from "zod";

/**
 * Public environment variables exposed to the client runtime.
 * Extend or modify as your project requires.
 */
export const envSchema = z.object({
  /** OTA update channel (dev | prod) */
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod"]).default("dev"),
  /** API URL for backend server */
  EXPO_PUBLIC_API_URL: z
    .string()
    .default("https://ottrip.onrender.com"),
  /** Google OAuth Client ID for web */
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(""),
  /** App version for debugging */
  EXPO_PUBLIC_APP_VERSION: z.string().optional(),
  /** Build number for debugging */
  EXPO_PUBLIC_BUILD_NUMBER: z.string().optional(),
});

export type PublicEnv = z.infer<typeof envSchema>;
/**
 * Environment variables validation helper
 */
export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  console.error("❌ Invalid environment variables:", result.error.format());
  throw new Error("Invalid environment variables");
};

// Cloudflare Pages 빌드 환경에서 process.env 전체 파싱 시 인라인 누락을 방지하기 위해
// 필요한 키만 명시적으로 전달하여 파싱합니다.
export const loadPublicEnv = (): PublicEnv =>
  envSchema.parse({
    EXPO_PUBLIC_CHANNEL: process.env.EXPO_PUBLIC_CHANNEL,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
    EXPO_PUBLIC_BUILD_NUMBER: process.env.EXPO_PUBLIC_BUILD_NUMBER,
  });
