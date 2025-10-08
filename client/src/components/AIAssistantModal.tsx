import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ModalLayout from './ModalLayout';

export default function AIAssistantModal() {
  return (
    <ModalLayout style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>AI Assistant</Text>
        <Text style={styles.subText}>Coming Soon...</Text>
      </View>
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
});
