import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { LocalFile } from '../types/api';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

/** iOS: avoid NSItemProvider -1000 on public.png — use broad UTIs */
const DOCUMENT_PICKER_TYPES_IOS = ['public.image', 'com.adobe.pdf'] as const;

export const useFilePicker = () => {
  const pickImage = async (): Promise<LocalFile | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is required.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
      ...(Platform.OS === 'ios' && {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }),
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName ?? `image_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    };
  };

  const pickDocument = async (): Promise<LocalFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type:
        Platform.OS === 'ios'
          ? ([...DOCUMENT_PICKER_TYPES_IOS] as string[])
          : ([...ALLOWED_MIME_TYPES] as string[]),
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    };
  };

  return { pickImage, pickDocument };
};
