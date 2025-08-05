import { Text, View } from 'react-native';
import Button from '@/components/Button';
import { useHello } from '@/hooks/useHello';

export default function HomeScreen() {
  const { data, isLoading } = useHello();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{isLoading ? 'Loading...' : JSON.stringify(data)}</Text>
      <Button title="Refetch" onPress={() => {}} />
    </View>
  );
}
