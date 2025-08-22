import { useIsWideScreen } from "@/hooks/useIsWideScreen";
import DashboardSplit from "@/screens/DashboardSplit";
import DashboardStack from "@/screens/DashboardStack";
import { View, StyleSheet, Pressable, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardScreen() {
  const isWide = useIsWideScreen();
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const goToTripDetail = () => {
    // @ts-ignore
    navigation.navigate('TripDetail', { tripId: 1 });
  };
  
  return (
    <View style={styles.container}>
      {isWide ? <DashboardSplit /> : <DashboardStack />}
      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          try {
            await logout();
          } catch (e) {
            console.error(e);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="로그아웃"
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
