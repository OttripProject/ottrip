import { AuthProvider } from "@/contexts/AuthContext";
import { DateProvider } from "@/contexts/DateContext";
import QueryProvider from "@/contexts/QueryProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import { loadPublicEnv } from "@/core/env/schema";
import RootNavigator from "@/navigation/RootNavigator";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  const _env = loadPublicEnv();

  const [fontsLoaded, fontError] = useFonts({
    "Pretendard-Regular": require("./assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-SemiBold": require("./assets/fonts/Pretendard-SemiBold.otf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
  });

  if (fontError) {
    console.error("폰트 로딩 실패:", fontError);
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthProvider>
          <DateProvider>
            <QueryProvider>
              <ToastProvider>
                <RootNavigator />
                <StatusBar style="auto" />
              </ToastProvider>
            </QueryProvider>
          </DateProvider>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
