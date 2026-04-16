import {
  Attachment,
  AttachmentConfirmRequest,
  AttachmentEntityType,
  LocalFile,
  PresignedUploadRequest,
  PresignedUploadResponse,
} from '../types/api';
import { File as FsFile } from 'expo-file-system';
import { Platform } from 'react-native';
import api from './api';

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

async function resolveR2PutBody(
  file: LocalFile,
): Promise<{ body: BodyInit; byteLength: number }> {
  const uri = file.uri ?? '';

  if (Platform.OS === 'web') {
    const localRes = await fetch(uri);
    attachLog('R2: web local fetch', {
      status: localRes.status,
      ok: localRes.ok,
    });
    if (!localRes.ok) {
      const t = await localRes.text().catch(() => '');
      throw new Error(`Local file fetch failed: ${localRes.status} ${t.slice(0, 200)}`);
    }
    const blob = await localRes.blob();
    attachLog('R2: web PUT body = Blob', { byteLength: blob.size });
    return { body: blob, byteLength: blob.size };
  }

  const tryFs =
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('assets-library:');

  if (tryFs) {
    try {
      const fsFile = new FsFile(uri);
      if (fsFile.exists) {
        attachLog('R2: native PUT body = expo-file-system File', {
          byteLength: fsFile.size,
          pickerReportedSize: file.size,
        });
        return { body: fsFile as BodyInit, byteLength: fsFile.size };
      }
    } catch (err) {
      attachLog('R2: FsFile open failed, fallback ArrayBuffer', {
        err: String(err),
      });
    }
  }

  const localRes = await fetch(uri);
  attachLog('R2: local fetch → ArrayBuffer', {
    status: localRes.status,
    ok: localRes.ok,
  });
  if (!localRes.ok) {
    const t = await localRes.text().catch(() => '');
    throw new Error(`Local file fetch failed: ${localRes.status} ${t.slice(0, 200)}`);
  }
  const ab = await localRes.arrayBuffer();
  attachLog('R2: native PUT body = ArrayBuffer', { byteLength: ab.byteLength });
  return { body: ab, byteLength: ab.byteLength };
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

  resolveR2PutBody,

  uploadToR2: async (
    uploadUrl: string,
    body: BodyInit,
    contentType: string,
    byteLength: number,
  ): Promise<void> => {
    let putHost = '';
    let putPathPreview = '';
    try {
      const u = new URL(uploadUrl);
      putHost = u.host;
      putPathPreview = u.pathname.slice(0, 72);
    } catch {
      /* ignore */
    }
    attachLog('R2: PUT start (global fetch, no expo/fetch)', {
      host: putHost,
      pathPreview: putPathPreview,
      contentType,
      contentLength: byteLength,
    });

    let putRes: Response;
    try {
      putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(byteLength),
        },
        body,
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
