import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { TERMS, TermsKey } from '@/constants/terms';

export default function TermsDetailScreen() {
  const route = useRoute<any>();
  const key = (route.params?.key || 'tos') as TermsKey;
  const doc = TERMS[key];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{doc.title}</Text>
      <ScrollView style={styles.contentBox}>
        <Text style={styles.content}>{doc.content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 12 },
  contentBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  content: { fontSize: 14, color: '#111827', lineHeight: 22 },
});


