import { useIsWideScreen } from "@/hooks/useIsWideScreen";
import DashboardSplit from "@/screens/DashboardSplit";
import DashboardStack from "@/screens/DashboardStack";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function DashboardScreen() {
  const isWide = useIsWideScreen();
  const navigation = useNavigation();
  
  const goToTripDetail = () => {
    // @ts-ignore
    navigation.navigate('TripDetail', { tripId: 1 });
  };
  
  return (
    <View style={styles.container}>
      {isWide ? <DashboardSplit /> : <DashboardStack />}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
