import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TERMS, TermsKey } from '@/constants/terms';

export default function TermsDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const key = (route.params?.key || 'tos') as TermsKey;
  const doc = TERMS[key];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{doc.title}</Text>
        <Pressable 
          style={styles.closeButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.contentBox}>
        <Text style={styles.content}>{doc.content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  closeButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#f3f4f6', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 12
  },
  closeButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  contentBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  content: { fontSize: 14, color: '#111827', lineHeight: 22 },
});


