import {
  FileSystemUploadType,
  cacheDirectory,
  copyAsync,
  getInfoAsync,
  uploadAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";
import type {
  Attachment,
  AttachmentConfirmRequest,
  AttachmentEntityType,
  LocalFile,
  PresignedUploadRequest,
  PresignedUploadResponse,
} from "../types/api";
import api from "./api";

export type PreparedUpload =
  | { platform: "web"; blob: Blob; byteLength: number }
  | { platform: "native"; fileUri: string; byteLength: number };

function ensureNativeR2UploadArgs(uploadUrl: string, fileUri: string): void {
  const u = uploadUrl.trim();
  const f = fileUri.trim();
  if (!u) {
    throw new Error("R2 uploadUrl이 비어 있습니다.");
  }
  try {
    new URL(u);
  } catch (e) {
    throw new Error(`R2 uploadUrl 파싱 실패: ${String(e)}`);
  }
  if (!f.startsWith("file://")) {
    throw new Error("R2 로컬 fileUri는 file:// 로 시작해야 합니다.");
  }
}

export async function prepareAttachmentUpload(
  file: LocalFile,
): Promise<PreparedUpload> {
  const uri = file.uri ?? "";

  if (Platform.OS === "web") {
    const localRes = await fetch(uri);
    if (!localRes.ok) {
      const t = await localRes.text().catch(() => "");
      throw new Error(
        `Local file fetch failed: ${localRes.status} ${t.slice(0, 200)}`,
      );
    }
    const blob = await localRes.blob();
    return { platform: "web", blob, byteLength: blob.size };
  }

  let fileUri = uri;
  if (!uri.startsWith("file://")) {
    const dir = cacheDirectory;
    if (!dir) {
      throw new Error(
        "cacheDirectory가 없어 비-file URI를 스테이징할 수 없습니다.",
      );
    }
    const nameParts = file.name.split(".");
    const ext =
      nameParts.length > 1
        ? (nameParts[nameParts.length - 1] ?? "jpg").toLowerCase()
        : "jpg";
    const dest = `${dir}ottrip_upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
    await copyAsync({ from: uri, to: dest });
    fileUri = dest;
  }

  const info = await getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error("업로드할 파일이 존재하지 않습니다.");
  }
  return { platform: "native", fileUri, byteLength: info.size };
}

export const attachmentsApi = {
  getPresignedUploadUrl: async (
    request: PresignedUploadRequest,
  ): Promise<PresignedUploadResponse> => {
    const response = await api.post("/private/attachments/presigned-upload", {
      plan_id: request.planId,
      entity_type: request.entityType,
      entity_id: request.entityId,
      file_name: request.fileName,
      content_type: request.contentType,
      file_size: request.fileSize,
    });
    const d = response.data as Record<string, unknown>;
    const out: PresignedUploadResponse = {
      uploadUrl: String(d.uploadUrl ?? d.upload_url ?? ""),
      fileKey: String(d.fileKey ?? d.file_key ?? ""),
      publicUrl: String(d.publicUrl ?? d.public_url ?? ""),
      expiresIn: Number(d.expiresIn ?? d.expires_in ?? 0),
    };
    if (!out.uploadUrl || !out.fileKey) {
      throw new Error("Presigned 응답에 uploadUrl 또는 fileKey가 없습니다.");
    }
    return out;
  },

  prepareAttachmentUpload,

  uploadToR2: async (
    uploadUrl: string,
    prepared: PreparedUpload,
    contentType: string,
  ): Promise<void> => {
    const byteLength = prepared.byteLength;
    const putHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(byteLength),
    };

    if (prepared.platform === "web") {
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: putHeaders,
        body: prepared.blob,
      });
      const errBody =
        putRes.status >= 400 ? await putRes.text().catch(() => "") : "";
      if (!putRes.ok) {
        throw new Error(
          `R2 PUT failed HTTP ${putRes.status}: ${errBody.slice(0, 200)}`,
        );
      }
      return;
    }

    const localUri = prepared.fileUri.trim();
    ensureNativeR2UploadArgs(uploadUrl, localUri);

    const response = await uploadAsync(uploadUrl.trim(), localUri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: putHeaders,
    });
    if (response.status >= 400) {
      throw new Error(
        `R2 PUT failed HTTP ${response.status}: ${response.body?.slice(0, 200) ?? ""}`,
      );
    }
  },

  confirmUpload: async (
    request: AttachmentConfirmRequest,
  ): Promise<Attachment> => {
    const response = await api.post("/private/attachments/confirm", {
      plan_id: request.planId,
      entity_type: request.entityType,
      entity_id: request.entityId,
      file_key: request.fileKey,
      file_name: request.fileName,
      content_type: request.contentType,
      file_size: request.fileSize,
      public_url: request.publicUrl,
    });
    return snakeToCamelAttachment(response.data);
  },

  getAttachments: async (
    planId: number,
    entityType: AttachmentEntityType,
    entityId: number,
  ): Promise<Attachment[]> => {
    const response = await api.get("/private/attachments", {
      params: {
        plan_id: planId,
        entity_type: entityType,
        entity_id: entityId,
      },
    });
    return response.data.map(snakeToCamelAttachment);
  },

  deleteAttachment: async (attachmentId: number): Promise<void> => {
    await api.delete(`/private/attachments/${attachmentId}`);
  },
};

function snakeToCamelAttachment(data: Record<string, unknown>): Attachment {
  const g = (snake: string, camel: string) => data[snake] ?? data[camel];
  return {
    id: g("id", "id") as number,
    entityType: g("entity_type", "entityType") as Attachment["entityType"],
    entityId: g("entity_id", "entityId") as number,
    fileName: g("file_name", "fileName") as string,
    fileUrl: g("file_url", "fileUrl") as string,
    contentType: g("content_type", "contentType") as string,
    fileSize: g("file_size", "fileSize") as number,
    planId: g("plan_id", "planId") as number,
    uploadedBy: g("uploaded_by", "uploadedBy") as number,
    createdAt: g("created_at", "createdAt") as string,
  };
}
