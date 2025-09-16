import { z } from "zod";

/**
 * Public environment variables exposed to the client runtime.
 * Extend or modify as your project requires.
 */
export const envSchema = z.object({
  /** OTA update channel (dev | prod) */
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod"]).default("dev"),
  /** API URL for backend server */
  EXPO_PUBLIC_API_URL: z.string().min(1, "EXPO_PUBLIC_API_URL is required"),
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
export const loadPublicEnv = (): PublicEnv =>
  envSchema.parse({
    EXPO_PUBLIC_CHANNEL: process.env.EXPO_PUBLIC_CHANNEL,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
    EXPO_PUBLIC_BUILD_NUMBER: process.env.EXPO_PUBLIC_BUILD_NUMBER,
  });
