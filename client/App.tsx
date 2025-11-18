import RootNavigator from "@/navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import QueryProvider from "@/contexts/QueryProvider";
import { DateProvider } from "@/contexts/DateContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { loadPublicEnv } from "@/core/env/schema";
import Toast from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';

export default function App() {
  const env = loadPublicEnv();
  
  // 폰트 로드 (웹 및 네이티브 모두 지원)
  const [fontsLoaded] = useFonts({
    // Pretendard 폰트
    'Pretendard-Thin': require('./assets/fonts/Pretendard-Thin.otf'),
    'Pretendard-ExtraLight': require('./assets/fonts/Pretendard-ExtraLight.otf'),
    'Pretendard-Light': require('./assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('./assets/fonts/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('./assets/fonts/Pretendard-Black.otf'),
    // Poppins 폰트
    'Poppins-Thin': require('./assets/fonts/Poppins-Thin.ttf'),
    'Poppins-ExtraLight': require('./assets/fonts/Poppins-ExtraLight.ttf'),
    'Poppins-Light': require('./assets/fonts/Poppins-Light.ttf'),
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('./assets/fonts/Poppins-Black.ttf'),
  });

  // 폰트가 로드될 때까지 로딩 표시
  if (!fontsLoaded) {
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
          <Toast />
        </QueryProvider>
      </DateProvider>
    </AuthProvider>
  );
}
