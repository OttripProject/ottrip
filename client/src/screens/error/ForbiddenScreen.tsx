import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ForbiddenScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>해당 여행 일정의 권한이 없어요.</Text>
      <Text style={styles.subtitle}>권한을 요청해서 여행 일정을 같이 만들어 가보세요!</Text>
      <Pressable
        onPress={() => {
          // @ts-ignore
          navigation.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>OTTRIP 홈으로 이동</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4b5563',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
  },
});


