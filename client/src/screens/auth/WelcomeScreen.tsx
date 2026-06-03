import Card from "@/ui/components/Card";
import GradientBackground from "@/ui/components/GradientBackground";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
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
            <Text style={styles.title}>오티트립에 오신 걸 환영해요!🎉</Text>
            <Text style={styles.subtitle}>
              오티트립에서 여러분의 여행을 계획하고 즐겨보세요.
            </Text>
            <Pressable
              onPress={() => {
                // @ts-ignore
                navigation.reset({ index: 0, routes: [{ name: "OTTRIP" }] });
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>시작하기🚀</Text>
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
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    position: "absolute",
    left: 40,
    top: 48,
    width: 400,
    height: 26,
    ...textStyles.h4,
    textAlign: "center",
  },
  subtitle: {
    position: "absolute",
    left: 99,
    top: 84,
    width: 300,
    height: 22,
    ...textStyles.body3,
    color: colors.gray700,
    textAlign: "center",
  },
  button: {
    position: "absolute",
    left: 40,
    bottom: 48,
    width: 400,
    height: 56,
    backgroundColor: colors.black,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
