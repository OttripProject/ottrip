import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";

export default function App() {
  const env = loadPublicEnv();
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
