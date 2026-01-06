import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const env = loadPublicEnv();
  
  // 웹과 네이티브 모두 폰트 로딩 필요
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
  });

  if (fontError) {
    console.error('폰트 로딩 실패:', fontError);
  }

  // 폰트 로딩 대기 (웹/네이티브 모두)
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DateProvider>
          <QueryProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </QueryProvider>
        </DateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
