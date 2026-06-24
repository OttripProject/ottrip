import type { StyleProp, ViewStyle } from "react-native";

import type { Attachment, LocalFile } from "@/types/api";

export type AiAttachmentAnalyzeSelection =
  | { kind: "pending"; key: string }
  | { kind: "existing"; id: number };

export function pendingAiFileKey(file: LocalFile): string {
  return `${file.name}:${file.uri}`;
}

export interface AttachmentSectionProps {
  variant?: "expense";
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
  onAiAnalyzePress?: (selection: AiAttachmentAnalyzeSelection) => void;
  isAiAnalyzing?: boolean;
  onCancelAiAnalyze?: () => void;
  analyzeError?: string | null;
  onRetryAnalyze?: () => void;
  isAiAnalyzeSuccess?: boolean;
  isAiAnalyzePartial?: boolean;
  analyzePartialMessage?: string;
}
