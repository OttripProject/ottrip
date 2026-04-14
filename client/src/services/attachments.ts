import {
  Attachment,
  AttachmentConfirmRequest,
  AttachmentEntityType,
  LocalFile,
  PresignedUploadRequest,
  PresignedUploadResponse,
} from '../types/api';
import api from './api';

export const attachmentsApi = {
  getPresignedUploadUrl: async (
    request: PresignedUploadRequest,
  ): Promise<PresignedUploadResponse> => {
    const response = await api.post('/private/attachments/presigned-upload', {
      plan_id: request.planId,
      entity_type: request.entityType,
      entity_id: request.entityId,
      file_name: request.fileName,
      content_type: request.contentType,
      file_size: request.fileSize,
    });
    return {
      uploadUrl: response.data.upload_url,
      fileKey: response.data.file_key,
      publicUrl: response.data.public_url,
      expiresIn: response.data.expires_in,
    };
  },

  uploadToR2: async (uploadUrl: string, file: LocalFile): Promise<void> => {
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': file.size.toString(),
      },
      body: await fetch(file.uri).then(r => r.blob()),
    });
  },

  confirmUpload: async (request: AttachmentConfirmRequest): Promise<Attachment> => {
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
    return snakeToCamelAttachment(response.data);
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
