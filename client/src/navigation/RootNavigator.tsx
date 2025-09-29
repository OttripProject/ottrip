import DashboardScreen from "@/screens/DashboardScreen";
import InviteAcceptScreen from "@/screens/InviteAcceptScreen";
import LoginScreen from "@/screens/LoginScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import TermsConsentScreen from "@/screens/TermsConsentScreen";
import RegisterProfileScreen from "@/screens/RegisterProfileScreen";
import TermsDetailScreen from "@/screens/TermsDetailScreen";
import HeaderBar from "@/components/HeaderBar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4285F4" />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // 인증된 사용자
          <>
            <Stack.Screen name="OTTRIP" component={DashboardScreen} />
            <Stack.Screen name="PROFILE" component={ProfileScreen} />
            <Stack.Screen name="INVITE_ACCEPT" component={InviteAcceptScreen} />
          </>
        ) : (
          // 미인증 사용자 + 가입 플로우
          <>
            <Stack.Screen name="OTTRIP LOGIN" component={LoginScreen} />
            <Stack.Screen name="REGISTER_TERMS" component={TermsConsentScreen} />
            <Stack.Screen name="REGISTER_PROFILE" component={RegisterProfileScreen} />
            <Stack.Screen name="TERMS_DETAIL" component={TermsDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
