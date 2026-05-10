import { Alert, Platform } from 'react-native';

/** RN Web에서 `Alert.alert`가 동작하지 않는 경우가 있어 웹은 `window` 사용 */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function showDestructiveConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  labels: { cancel: string; confirm: string } = {
    cancel: '취소',
    confirm: '삭제',
  },
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.confirm, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showPickFileType(
  title: string,
  message: string,
  onPickImage: () => void,
  onPickDocument: () => void,
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    showMessage(
      title,
      `${message}\n\n웹에서는 onAppendPendingFiles 연결 후 파일 선택창을 사용해 주세요.`,
    );
    return;
  }
  Alert.alert(title, message, [
    { text: '사진', onPress: onPickImage },
    { text: 'PDF 문서', onPress: onPickDocument },
    { text: '취소', style: 'cancel' },
  ]);
}
