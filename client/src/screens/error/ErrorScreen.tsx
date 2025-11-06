import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '@/ui/components/GradientBackground';
import Card from '@/ui/components/Card';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

type ErrorScreenProps = {
  title: string;
  subtitle?: string;
  buttonText?: string;
};

export default function ErrorScreen({ title, subtitle, buttonText = 'Ottrip 홈으로 이동' }: ErrorScreenProps) {
  const navigation = useNavigation();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.cardWrapper}>
          <Card 
            variant="basic" 
            alignItems="flex-start"
            width={480}
            minHeight={246}
            maxHeight={246}
          >
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            <Pressable
              onPress={() => {
                // @ts-ignore
                navigation.reset({ index: 0, routes: [{ name: 'OTTRIP' }] });
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
            </Pressable>
          </Card>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    left: 126,
    top: 48,
    width: 227,
    height: 26,
    ...textStyles.h4,
    textAlign: 'center',
  },
  subtitle: {
    position: 'absolute',
    left: 99,
    top: 84,
    width: 281,
    height: 22,
    ...textStyles.body3,
    color: colors.gray700,
    textAlign: 'center',
  },
  button: {
    position: 'absolute',
    left: 40,
    bottom: 48,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});

