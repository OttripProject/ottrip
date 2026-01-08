import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/useMe';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import LogoutModal from '@/components/modals/LogoutModal';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { data: profile, isLoading } = useMe();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setLogoutModalOpen(false);
    logout();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>프로필</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>이메일</Text>
            <Text style={styles.value}>{profile?.email ?? ''}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>닉네임</Text>
            <Text style={styles.value}>{profile?.nickname ?? ''}</Text>
          </View>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={() => setLogoutModalOpen(true)}
        >
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      <LogoutModal
        visible={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    ...textStyles.h2,
    color: colors.black,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    paddingVertical: 12,
  },
  label: {
    ...textStyles.body3,
    color: colors.gray600,
    marginBottom: 8,
  },
  value: {
    ...textStyles.body1,
    color: colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 8,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.warning,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
