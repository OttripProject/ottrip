import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMe } from '@/hooks/useMe';

export default function HeaderModal() {
  const navigation = useNavigation();
  const { data: profile } = useMe();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => { 
        /* @ts-ignore */ 
        navigation.reset({
          index: 0,
          routes: [{ name: 'OTTRIP' }],
        });
      }} accessibilityRole="button">
        <Text style={styles.brand}>Ottrip</Text>
      </Pressable>
      <Pressable onPress={() => { /* @ts-ignore */ navigation.navigate('프로필'); }} accessibilityRole="button">
        <Text style={styles.user}>{profile?.nickname ?? '프로필'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  user: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
