import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App() {
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
