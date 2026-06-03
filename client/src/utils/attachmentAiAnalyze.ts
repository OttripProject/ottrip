import { Platform } from "react-native";

import type { AnalyzeUploadFileInput } from "@/services/aiDocument";
import type { Attachment, LocalFile } from "@/types/api";
import {
  type AiAttachmentAnalyzeSelection,
  pendingAiFileKey,
} from "@/ui/components/attachmentSection.types";

export async function buildAnalyzeUploadPayload(
  selection: AiAttachmentAnalyzeSelection,
  ctx: { pendingFiles: LocalFile[]; existingAttachments: Attachment[] },
): Promise<{ file: AnalyzeUploadFileInput; filename: string }> {
  if (selection.kind === "pending") {
    const local = ctx.pendingFiles.find(
      f => pendingAiFileKey(f) === selection.key,
    );
    if (!local) {
      throw new Error("선택한 파일을 찾을 수 없습니다.");
    }

    // 웹: LocalFile.uri는 blob: URL이라 RN용 { uri, name, type }를 FormData에 넣으면
    // 실제 파일 바이너리가 안 올라가고 FastAPI `UploadFile = File(...)`가 422를 냅니다.
    if (Platform.OS === "web" && typeof fetch !== "undefined") {
      const res = await fetch(local.uri);
      if (!res.ok) {
        throw new Error(`선택한 파일을 불러오지 못했습니다. (${res.status})`);
      }
      const blob = await res.blob();
      const mime =
        blob.type && blob.type !== "application/octet-stream"
          ? blob.type
          : local.mimeType || "application/octet-stream";
      const name = local.name || "upload";
      if (typeof File !== "undefined") {
        return {
          file: new File([blob], name, { type: mime }),
          filename: name,
        };
      }
      return { file: blob, filename: name };
    }

    return {
      file: {
        uri: local.uri,
        name: local.name || "upload",
        type: local.mimeType || "application/octet-stream",
      },
      filename: local.name || "upload",
    };
  }

  const att = ctx.existingAttachments.find(a => a.id === selection.id);
  if (!att) {
    throw new Error("선택한 첨부를 찾을 수 없습니다.");
  }

  const res = await fetch(att.fileUrl);
  if (!res.ok) {
    throw new Error(`첨부 파일을 불러오지 못했습니다. (${res.status})`);
  }
  const blob = await res.blob();
  const mime =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : att.contentType || "application/octet-stream";

  if (typeof File !== "undefined") {
    return {
      file: new File([blob], att.fileName, { type: mime }),
      filename: att.fileName,
    };
  }

  return { file: blob, filename: att.fileName };
}
