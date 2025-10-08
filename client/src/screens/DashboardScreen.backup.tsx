import { useIsWideScreen } from "@/hooks/useIsWideScreen";
import DashboardSplit from "@/screens/DashboardSplit";
import DashboardStack from "@/screens/DashboardStack";
import { View, StyleSheet, Pressable, Text, Alert, Platform } from "react-native";
import HeaderBar from "@/components/HeaderBar";
import { useNavigation } from "@react-navigation/native";
// import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import api from "@/services/api";

export default function DashboardScreen() {
  const isWide = useIsWideScreen();
  const navigation = useNavigation();
  // const { logout } = useAuth();
  // 이미 로그인된 사용자가 초대 링크(#invite=...)로 진입한 경우 자동 수락 처리
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#invite=')) {
      const token = hash.replace('#invite=', '');
      const accept = async () => {
        try {
          await api.post(`/private/plans/invitations/${token}/accept`);
          Alert.alert('완료', '초대를 수락했습니다.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('plans-refresh'));
          }
        } catch (e: any) {
          const msg = e?.response?.data?.detail || '초대 수락에 실패했습니다.';
          Alert.alert('오류', msg);
        } finally {
          // 해시 제거
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      accept();
    }
  }, []);
  
  const goToTripDetail = () => {
    // @ts-ignore
    navigation.navigate('TripDetail', { tripId: 1 });
  };
  
  return (
    <View style={styles.container}>
      <HeaderBar />
      {isWide ? <DashboardSplit /> : <DashboardStack />}
      {/* 로그아웃 버튼 제거 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutButton: {
    // removed
  },
  logoutText: {
    // removed
  },
});
