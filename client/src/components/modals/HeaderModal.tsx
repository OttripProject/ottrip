import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMe } from '@/hooks/useMe';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';

export default function HeaderModal() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { data: profile } = useMe();

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.brandContainer}>
          <Pressable 
          onPress={() => { 
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'OTTRIP' }],
            });
          }} 
          accessibilityRole="button"
        >
          <Text style={styles.brand}>OTTRIP</Text>
        </Pressable>
        </View>
        <View style={styles.userContainer}>
          <Pressable 
          onPress={() => { 
            (navigation as any).navigate('프로필'); 
          }} 
          accessibilityRole="button"
        >
          <Text style={styles.user}>{profile?.nickname ?? '프로필'}</Text>
        </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    ...textStyles.h4,
    fontWeight: typography.weight.bold,
    color: colors.black,
  },
  user: {
    ...textStyles.body3,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brandContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  userContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
});
