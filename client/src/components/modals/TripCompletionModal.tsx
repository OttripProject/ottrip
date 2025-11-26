import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CheckIcon from '../../../assets/check_blue.svg';

interface TripCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export default function TripCompletionModal({
  visible,
  onClose,
  title,
  description,
}: TripCompletionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.completionOverlay} onPress={onClose}>
        <View style={styles.completionCard}>
          <View style={styles.completionIconWrapper}>
            <CheckIcon width={20} height={20} />
          </View>
          <Text style={styles.completionTitle}>{title}</Text>
          <Text style={styles.completionDescription}>{description}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  completionOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completionCard: {
    width: 320,
    maxWidth: '90%',
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  completionIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  completionTitle: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: 'center',
  },
  completionDescription: {
    ...textStyles.body4,
    color: colors.gray700,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});


