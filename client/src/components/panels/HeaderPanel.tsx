import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMe } from '@/hooks/useMe';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import RightArrowProfileIcon from '../../../assets/right_arrow_profile.svg';

export default function HeaderPanel() {
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
            style={styles.userPill}
          >
            <Text style={styles.userText} numberOfLines={1} ellipsizeMode="tail">
              {profile?.isGuest ? '게스트' : (profile?.nickname ?? '프로필')}
            </Text>
            <RightArrowProfileIcon width={16} height={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    marginTop: 16,
    marginHorizontal: 32,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    ...textStyles.h4,
    fontWeight: typography.weight.bold,
    color: colors.black,
  },
  userPill: {
    height: 32,
    borderRadius: 40,
    backgroundColor: colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    minWidth: 84,
    maxWidth: 220,
  },
  userText: {
    ...textStyles.body4,
    fontWeight: typography.weight.semibold,
    color: colors.black,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 6,
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
    paddingLeft: 16 
  },
  userContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 0,
  },
});
