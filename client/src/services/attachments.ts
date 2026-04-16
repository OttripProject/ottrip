import {
  Attachment,
  AttachmentConfirmRequest,
  AttachmentEntityType,
  LocalFile,
  PresignedUploadRequest,
  PresignedUploadResponse,
} from '../types/api';
import { fetch as expoFetch } from 'expo/fetch';
import { File as FsFile } from 'expo-file-system';
import { Platform } from 'react-native';
import api from './api';

/** 기기 로그 검색용 (Console / Xcode에서 `ATTACH_UPLOAD` 필터) */
export const ATTACH_UPLOAD_LOG_PREFIX = '[ATTACH_UPLOAD]';

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

async function readLocalFileAsBlob(uri: string): Promise<Blob> {
  const localRes = await fetch(uri);
  attachLog('R2: local fetch done', {
    status: localRes.status,
    ok: localRes.ok,
    type: localRes.type,
  });
  if (!localRes.ok) {
    const t = await localRes.text().catch(() => '');
    throw new Error(`Local file fetch failed: ${localRes.status} ${t.slice(0, 200)}`);
  }
  const blob = await localRes.blob();
  attachLog('R2: blob ready', {
    blobSize: blob.size,
    blobType: blob.type,
  });
  return blob;
}

export const attachmentsApi = {
  getPresignedUploadUrl: async (
    request: PresignedUploadRequest,
  ): Promise<PresignedUploadResponse> => {
    attachLog('presigned: request start', {
      planId: request.planId,
      entityType: request.entityType,
      entityId: request.entityId,
      fileName: request.fileName,
      contentType: request.contentType,
      fileSize: request.fileSize,
    });
    try {
      const response = await api.post('/private/attachments/presigned-upload', {
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
      let uploadHost = '';
      try {
        uploadHost = new URL(out.uploadUrl).host;
      } catch {
        /* ignore */
      }
      attachLog('presigned: OK', {
        fileKey: out.fileKey,
        uploadHost,
        publicUrl: out.publicUrl,
        expiresIn: out.expiresIn,
      });
      return out;
    } catch (err) {
      attachLogError('presigned: API error', err);
      throw err;
    }
  },

  uploadToR2: async (uploadUrl: string, file: LocalFile): Promise<void> => {
    const uri = file.uri ?? '';
    attachLog('R2: local file read start', {
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      uriPrefix: uri.slice(0, 96),
    });

    let body: Blob | FsFile;
    const useFsFile =
      Platform.OS !== 'web' &&
      (uri.startsWith('file:') || uri.startsWith('content:'));

    if (useFsFile) {
      try {
        const fsFile = new FsFile(uri);
        if (fsFile.exists) {
          body = fsFile;
          attachLog('R2: body = expo-file-system File', {
            fsName: fsFile.name,
            exists: fsFile.exists,
          });
        } else {
          body = await readLocalFileAsBlob(uri);
        }
      } catch (err) {
        attachLog('R2: FsFile path failed, fallback blob', { err: String(err) });
        body = await readLocalFileAsBlob(uri);
      }
    } else {
      try {
        body = await readLocalFileAsBlob(uri);
      } catch (err) {
        attachLogError('R2: local file → blob failed', err);
        throw err;
      }
    }

    let putHost = '';
    let putPathPreview = '';
    try {
      const u = new URL(uploadUrl);
      putHost = u.host;
      putPathPreview = u.pathname.slice(0, 72);
    } catch {
      /* ignore */
    }
    attachLog('R2: PUT start (expo/fetch)', {
      host: putHost,
      pathPreview: putPathPreview,
      contentType: file.mimeType,
      contentLength: file.size,
    });

    let putRes: Response;
    try {
      putRes = await expoFetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimeType,
          'Content-Length': file.size.toString(),
        },
        body: body as BodyInit,
      });
    } catch (err) {
      attachLogError('R2: PUT network error', err);
      throw err;
    }

    const errBody =
      putRes.status >= 400 ? await putRes.text().catch(() => '') : '';
    attachLog('R2: PUT done', {
      status: putRes.status,
      ok: putRes.ok,
      errBodyPreview: errBody ? errBody.slice(0, 300) : undefined,
    });

    if (!putRes.ok) {
      const msg = `R2 PUT failed HTTP ${putRes.status}: ${errBody.slice(0, 200)}`;
      attachLogError('R2: PUT failed', new Error(msg));
      throw new Error(msg);
    }
  },

  confirmUpload: async (request: AttachmentConfirmRequest): Promise<Attachment> => {
    attachLog('confirm: request start', {
      planId: request.planId,
      entityType: request.entityType,
      entityId: request.entityId,
      fileKey: request.fileKey,
      fileName: request.fileName,
    });
    try {
      const response = await api.post('/private/attachments/confirm', {
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
      attachLog('confirm: OK', {
        attachmentId: row.id,
        fileUrl: row.fileUrl,
      });
      return row;
    } catch (err) {
      attachLogError('confirm: API error', err);
      throw err;
    }
  },

  getAttachments: async (
    planId: number,
    entityType: AttachmentEntityType,
    entityId: number,
  ): Promise<Attachment[]> => {
    const response = await api.get('/private/attachments', {
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

function snakeToCamelAttachment(data: any): Attachment {
  return {
    id: data.id,
    entityType: data.entity_type,
    entityId: data.entity_id,
    fileName: data.file_name,
    fileUrl: data.file_url,
    contentType: data.content_type,
    fileSize: data.file_size,
    planId: data.plan_id,
    uploadedBy: data.uploaded_by,
    createdAt: data.created_at,
  };
}
