import { z } from "zod";

export const envSchema = z.object({
  EXPO_PUBLIC_CHANNEL: z.enum(["dev", "prod", "local"]).default("local"),
  EXPO_PUBLIC_API_URL: z
    .string()
    .default("http://localhost:8080"),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(""),
  EXPO_PUBLIC_APP_VERSION: z.string().optional(),
  EXPO_PUBLIC_BUILD_NUMBER: z.string().optional(),
});

export type PublicEnv = z.infer<typeof envSchema>;
export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  throw new Error("Invalid environment variables");
};

export const loadPublicEnv = (): PublicEnv =>
  envSchema.parse({
    EXPO_PUBLIC_CHANNEL: process.env.EXPO_PUBLIC_CHANNEL,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
    EXPO_PUBLIC_BUILD_NUMBER: process.env.EXPO_PUBLIC_BUILD_NUMBER,
  });
