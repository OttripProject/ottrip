import type { StyleProp, ViewStyle } from 'react-native';

import type { Attachment, LocalFile } from '@/types/api';

export interface AttachmentSectionProps {
  pendingFiles: LocalFile[];
  onPickImage: () => void;
  onPickDocument: () => void;
  onRemoveFile: (index: number) => void;
  existingAttachments?: Attachment[];
  onRemoveExisting?: (attachmentId: number) => void | Promise<void>;
  isLoadingExisting?: boolean;
  isUploading?: boolean;
  style?: StyleProp<ViewStyle>;
  showTopDivider?: boolean;
  disabled?: boolean;
  /** true면 헤더의「추가」·빈 상태 점선 영역을 숨김(읽기 전용 모드) */
  hideAddControls?: boolean;
  isGuest?: boolean;
  /**
   * 웹: `<input type="file">`로 선택한 파일을 `LocalFile`로 변환해 한 번에 전달.
   * 네이티브에서는 미사용.
   */
  onAppendPendingFiles?: (files: LocalFile[]) => void;
  /** 웹 AI 분석 버튼 클릭 시 (선택된 파일이 있을 때만 호출). 미연결이면 no-op. */
  onAiAnalyzePress?: () => void;
}
