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
import api, { getApiClientDebugContext } from "./api";

export const ATTACH_UPLOAD_LOG_PREFIX = "[ATTACH_UPLOAD]";

/** Metro/Xcode에서 `console.log`(객체 2번째 인자)가 안 보이는 경우가 있어 warn + 한 줄 직렬화 사용 */
export const ATTACH_UPLOAD_DEBUG_PREFIX = "[ATTACH_UPLOAD_DEBUG]";

export function attachDebugLog(
  step: string,
  payload?: Record<string, unknown>,
) {
  try {
    const body = payload !== undefined ? JSON.stringify(payload) : "";
    const line =
      payload !== undefined
        ? `${ATTACH_UPLOAD_DEBUG_PREFIX} ${step} | ${body}`
        : `${ATTACH_UPLOAD_DEBUG_PREFIX} ${step}`;
    console.warn(line);
  } catch {
    console.warn(`${ATTACH_UPLOAD_DEBUG_PREFIX} ${step} (serialize failed)`);
  }
}

/** iOS 등: `file:///var/mobile/Containers/.../IMG_x.jpg` 형태인지 확인용 */
function logLocalUriForDebug(context: string, uri: string) {
  const trimmed = uri ?? "";
  const looksLikeIosFile =
    trimmed.startsWith("file:///") && trimmed.includes("/var/mobile/");
  attachDebugLog(`local file URI (${context})`, {
    uri: trimmed,
    length: trimmed.length,
    startsWithFileTripleSlash: trimmed.startsWith("file:///"),
    looksLikeIosFilePath: looksLikeIosFile,
    isFileScheme: /^file:\/\//i.test(trimmed),
  });
}

function attachLog(step: string, payload?: Record<string, unknown>) {
  if (payload !== undefined) {
    console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${step}`, payload);
  } else {
    console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${step}`);
  }
}

function attachLogError(step: string, err: unknown) {
  console.error(`${ATTACH_UPLOAD_LOG_PREFIX} ${step}`, err);
}

function logPresignedUrlVsPutHeaders(
  uploadUrl: string,
  putContentType: string,
  putContentLength: string,
) {
  try {
    const u = new URL(uploadUrl);
    const signedHeaders =
      u.searchParams.get("X-Amz-SignedHeaders") ??
      u.searchParams.get("x-amz-signedheaders") ??
      "";
    attachDebugLog("presigned URL vs PUT (헤더·서명 일치 확인)", {
      host: u.host,
      pathPrefix: u.pathname.slice(0, 96),
      xAmzSignedHeaders: signedHeaders,
      signedHeadersIncludesContentType: /content-type/i.test(signedHeaders),
      putContentType,
      putContentLength,
      note: "R2(S3 호환): 프리사인에 포함된 Content-Type·Content-Length와 PUT이 같아야 합니다.",
    });
  } catch (e) {
    attachDebugLog("presigned URL 파싱 실패", { err: String(e) });
  }
}

/** 웹: Blob / 네이티브: file:// (필요 시 캐시로 복사) + 서버 프리사인과 동일한 바이트 길이 */
export type PreparedUpload =
  | { platform: "web"; blob: Blob; byteLength: number }
  | { platform: "native"; fileUri: string; byteLength: number };

/**
 * 업로드 직전에 로컬 파일 크기를 확정하고, 네이티브는 네트워크로 보낼 `file://` URI를 준비합니다.
 * (RN fetch에 ArrayBuffer/FsFile을 body로 넣지 않음)
 */
export async function prepareAttachmentUpload(
  file: LocalFile,
): Promise<PreparedUpload> {
  const uri = file.uri ?? "";

  if (Platform.OS === "web") {
    const localRes = await fetch(uri);
    attachLog("prepareUpload: web local fetch", {
      status: localRes.status,
      ok: localRes.ok,
    });
    if (!localRes.ok) {
      const t = await localRes.text().catch(() => "");
      throw new Error(
        `Local file fetch failed: ${localRes.status} ${t.slice(0, 200)}`,
      );
    }
    const blob = await localRes.blob();
    attachLog("prepareUpload: web = Blob", { byteLength: blob.size });
    return { platform: "web", blob, byteLength: blob.size };
  }

  logLocalUriForDebug("prepareAttachmentUpload", uri);

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
    attachLog("prepareUpload: copied to cache file://", {
      destPreview: dest.slice(0, 96),
    });
  }

  const info = await getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error("업로드할 파일이 존재하지 않습니다.");
  }
  attachLog("prepareUpload: native file:// + size", {
    byteLength: info.size,
    pickerReportedSize: file.size,
  });
  return { platform: "native", fileUri, byteLength: info.size };
}

export const attachmentsApi = {
  getPresignedUploadUrl: async (
    request: PresignedUploadRequest,
  ): Promise<PresignedUploadResponse> => {
    attachLog("presigned: request start", {
      planId: request.planId,
      entityType: request.entityType,
      entityId: request.entityId,
      fileName: request.fileName,
      contentType: request.contentType,
      fileSize: request.fileSize,
    });
    try {
      const response = await api.post("/private/attachments/presigned-upload", {
        plan_id: request.planId,
        entity_type: request.entityType,
        entity_id: request.entityId,
        file_name: request.fileName,
        content_type: request.contentType,
        file_size: request.fileSize,
      });
      const out = {
        uploadUrl: response.data.upload_url,
        fileKey: response.data.file_key,
        publicUrl: response.data.public_url,
        expiresIn: response.data.expires_in,
      };
      let uploadHost = "";
      try {
        uploadHost = new URL(out.uploadUrl).host;
      } catch {
        /* ignore */
      }
      attachLog("presigned: OK", {
        fileKey: out.fileKey,
        uploadHost,
        publicUrl: out.publicUrl,
        expiresIn: out.expiresIn,
      });
      attachDebugLog("presigned: 응답 필드 점검 (넘어온 값 여부)", {
        ...getApiClientDebugContext(),
        hasUploadUrl: Boolean(out.uploadUrl?.length),
        uploadUrlLength: out.uploadUrl?.length ?? 0,
        hasFileKey: Boolean(out.fileKey?.length),
        hasPublicUrl: Boolean(out.publicUrl?.length),
        expiresIn: out.expiresIn,
        uploadHost,
      });
      attachDebugLog(
        "프리사인 요청에 사용한 content_type (이후 PUT Content-Type과 동일해야 함)",
        {
          contentTypeSigned: request.contentType,
        },
      );
      return out;
    } catch (err) {
      attachDebugLog("presigned: 실패 시점 EXPO_PUBLIC / resolved API base", {
        ...getApiClientDebugContext(),
      });
      attachDebugLog(
        "presigned: API 오류 직전 요청 값 (서명·Content-Type 대조용)",
        {
          fileName: request.fileName,
          contentType: request.contentType,
          fileSize: request.fileSize,
        },
      );
      attachLogError("presigned: API error", err);
      throw err;
    }
  },

  prepareAttachmentUpload,

  uploadToR2: async (
    uploadUrl: string,
    prepared: PreparedUpload,
    contentType: string,
  ): Promise<void> => {
    const byteLength = prepared.byteLength;
    let putHost = "";
    let putPathPreview = "";
    try {
      const u = new URL(uploadUrl);
      putHost = u.host;
      putPathPreview = u.pathname.slice(0, 72);
    } catch {
      /* ignore */
    }

    const putHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(byteLength),
    };

    attachLog("R2: PUT start", {
      host: putHost,
      pathPreview: putPathPreview,
      contentType,
      contentLength: byteLength,
      transport:
        prepared.platform === "web" ? "fetch+Blob" : "FileSystem.uploadAsync",
    });
    logPresignedUrlVsPutHeaders(uploadUrl, contentType, String(byteLength));

    if (prepared.platform === "web") {
      let putRes: Response;
      try {
        putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: putHeaders,
          body: prepared.blob,
        });
      } catch (err) {
        attachDebugLog("R2 PUT (web fetch) 예외", {
          ...getApiClientDebugContext(),
          uploadUrl,
          contentType,
          byteLength,
        });
        attachLogError("R2: PUT network error (web)", err);
        throw err;
      }
      const errBody =
        putRes.status >= 400 ? await putRes.text().catch(() => "") : "";
      attachLog("R2: PUT done (web)", {
        status: putRes.status,
        ok: putRes.ok,
        errBodyPreview: errBody ? errBody.slice(0, 300) : undefined,
      });
      if (!putRes.ok) {
        const msg = `R2 PUT failed HTTP ${putRes.status}: ${errBody.slice(0, 200)}`;
        attachLogError("R2: PUT failed (web)", new Error(msg));
        throw new Error(msg);
      }
      return;
    }

    try {
      const response = await uploadAsync(uploadUrl, prepared.fileUri, {
        httpMethod: "PUT",
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: putHeaders,
      });
      attachLog("R2: PUT done (native uploadAsync)", {
        status: response.status,
        errBodyPreview: response.body ? response.body.slice(0, 300) : undefined,
      });
      if (response.status >= 400) {
        const msg = `R2 PUT failed HTTP ${response.status}: ${response.body?.slice(0, 200) ?? ""}`;
        attachLogError("R2: PUT failed (native)", new Error(msg));
        throw new Error(msg);
      }
    } catch (err) {
      attachDebugLog("R2 PUT (native uploadAsync) 예외", {
        ...getApiClientDebugContext(),
        fileUri: prepared.fileUri,
        uploadUrl,
        contentType,
        byteLength,
      });
      attachLogError("R2: PUT error (native)", err);
      throw err;
    }
  },

  confirmUpload: async (
    request: AttachmentConfirmRequest,
  ): Promise<Attachment> => {
    attachLog("confirm: request start", {
      planId: request.planId,
      entityType: request.entityType,
      entityId: request.entityId,
      fileKey: request.fileKey,
      fileName: request.fileName,
    });
    try {
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
      const row = snakeToCamelAttachment(response.data);
      attachLog("confirm: OK", {
        attachmentId: row.id,
        fileUrl: row.fileUrl,
      });
      return row;
    } catch (err) {
      attachDebugLog("confirm: 실패 시점 EXPO_PUBLIC / resolved API base", {
        ...getApiClientDebugContext(),
      });
      attachLogError("confirm: API error", err);
      throw err;
    }
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
  return {
    id: data.id as number,
    entityType: data.entity_type as Attachment["entityType"],
    entityId: data.entity_id as number,
    fileName: data.file_name as string,
    fileUrl: data.file_url as string,
    contentType: data.content_type as string,
    fileSize: data.file_size as number,
    planId: data.plan_id as number,
    uploadedBy: data.uploaded_by as number,
    createdAt: data.created_at as string,
  };
}
