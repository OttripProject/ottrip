import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import TodayScreen from './TodayScreen.native';
import WeeklyScreen from './WeeklyScreen.native';

const Stack = createStackNavigator();

// 테스트용 메뉴 화면
function MobileTestMenu({ navigation }: any) {
  return (
    <View style={styles.menuContainer}>
      <Text style={styles.menuTitle}>모바일 화면 테스트</Text>
      <Text style={styles.menuSubtitle}>개발 중인 모바일 전용 화면</Text>
      
      <View style={styles.menuButtons}>
        <Pressable
          style={styles.menuButton}
          onPress={() => navigation.navigate('TodayScreen')}
        >
          <Text style={styles.buttonEmoji}>📅</Text>
          <Text style={styles.buttonText}>오늘 화면</Text>
          <Text style={styles.buttonDesc}>현재 진행 중 활동 중심</Text>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => navigation.navigate('WeeklyScreen')}
        >
          <Text style={styles.buttonEmoji}>📆</Text>
          <Text style={styles.buttonText}>주간 일정 화면</Text>
          <Text style={styles.buttonDesc}>주간 타임라인 뷰</Text>
        </Pressable>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          💡 현재는 하드코딩된 샘플 데이터를 사용합니다.{'\n'}
          실제 API 연동은 다음 단계에서 진행됩니다.
        </Text>
      </View>
    </View>
  );
}

export default function MobileTestNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MobileTestMenu" component={MobileTestMenu} />
      <Stack.Screen name="TodayScreen" component={TodayScreen} />
      <Stack.Screen name="WeeklyScreen" component={WeeklyScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  menuTitle: {
    ...textStyles.h1,
    color: colors.black,
    marginBottom: 8,
  },
  menuSubtitle: {
    ...textStyles.body2,
    color: colors.gray600,
    marginBottom: 40,
  },
  menuButtons: {
    gap: 16,
  },
  menuButton: {
    backgroundColor: colors.gray50,
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  buttonEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  buttonText: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 4,
  },
  buttonDesc: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  note: {
    marginTop: 40,
    padding: 16,
    backgroundColor: colors.blue50,
    borderRadius: 12,
  },
  noteText: {
    ...textStyles.body3,
    color: colors.blue700,
    lineHeight: 20,
  },
});

