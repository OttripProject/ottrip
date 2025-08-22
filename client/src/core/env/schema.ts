import { z } from "zod";

/**
 * Public environment variables exposed to the client runtime.
 * Extend or modify as your project requires.
 */
export const envSchema = z.object({
  /** OTA update channel (dev | prod) */
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod"]).default("dev"),
  /** API URL for backend server */
  EXPO_PUBLIC_API_URL: z.string().default("http://localhost:8080"),
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
