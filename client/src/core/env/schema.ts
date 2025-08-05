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
});

export type PublicEnv = z.infer<typeof envSchema>;
