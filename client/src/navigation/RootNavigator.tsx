import DashboardScreen from "@/screens/DashboardScreen";
import LoginScreen from "@/screens/LoginScreen";
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
          </>
        ) : (
          // 미인증 사용자
          <Stack.Screen name="OTTRIP LOGIN" component={LoginScreen} />
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
