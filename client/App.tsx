import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const env = loadPublicEnv();
  
  // 웹에서는 런타임 폰트 로딩 필요 (플러그인 방식이 웹에서 제대로 작동하지 않음)
  // 네이티브(iOS/Android)에서는 app.config.ts의 expo-font 플러그인이 자동으로 처리
  // 실제 사용 중인 폰트만 로드하여 성능 최적화
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'web'
      ? {
          // Pretendard 폰트 (실제 사용 중인 것만)
          'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
          'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
          // Poppins 폰트 (실제 사용 중인 것만)
          'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
        }
      : {}
  );

  // 폰트 로딩 에러 처리 (웹에서만)
  if (fontError) {
    console.error('폰트 로딩 실패:', fontError);
  }

  // 웹에서만 폰트 로딩 대기
  if (Platform.OS === 'web' && !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
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
