import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";

export default function App() {
  const env = loadPublicEnv();
  // 간단한 런타임 확인 로그(웹 콘솔)
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("EXPO_PUBLIC_API_URL:", env.EXPO_PUBLIC_API_URL);
  }
  return (
    <AuthProvider>
      <DateProvider>
        <QueryProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </QueryProvider>
      </DateProvider>
    </AuthProvider>
  );
}
