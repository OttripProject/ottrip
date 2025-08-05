import DashboardScreen from "@/screens/DashboardScreen";
import CreateTripScreen from "@/screens/CreateTripScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import TripDetailScreen from "@/screens/TripDetailScreen";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Planner" component={DashboardScreen} />
      <Tab.Screen name="Create" component={CreateTripScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripDetail"
          component={TripDetailScreen}
          options={{ title: "Trip Detail" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
