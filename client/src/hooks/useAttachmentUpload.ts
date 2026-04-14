import { useState } from 'react';

import { Attachment, AttachmentEntityType, LocalFile } from '../types/api';
import {
  attachmentsApi,
  ATTACH_UPLOAD_LOG_PREFIX,
} from '../services/attachments';

interface UseAttachmentUploadOptions {
  planId: number;
  entityType: AttachmentEntityType;
}

interface UseAttachmentUploadReturn {
  isUploading: boolean;
  uploadFiles: (files: LocalFile[], entityId: number) => Promise<Attachment[]>;
}

export const useAttachmentUpload = ({
  planId,
  entityType,
}: UseAttachmentUploadOptions): UseAttachmentUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (
    files: LocalFile[],
    entityId: number,
  ): Promise<Attachment[]> => {
    if (files.length === 0) {
      console.log(`${ATTACH_UPLOAD_LOG_PREFIX} uploadFiles: no files, skip`);
      return [];
    }

    console.log(`${ATTACH_UPLOAD_LOG_PREFIX} uploadFiles: start`, {
      fileCount: files.length,
      planId,
      entityType,
      entityId,
      names: files.map(f => f.name),
    });

    setIsUploading(true);
    try {
      const results = await Promise.all(
        files.map(async (file, index) => {
          const tag = `[${index + 1}/${files.length}]`;
          try {
            console.log(
              `${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: presigned`,
              { name: file.name },
            );
            const { uploadUrl, fileKey, publicUrl } =
              await attachmentsApi.getPresignedUploadUrl({
                planId,
                entityType,
                entityId,
                fileName: file.name,
                contentType: file.mimeType,
                fileSize: file.size,
              });

            console.log(
              `${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: R2 PUT`,
              { name: file.name, fileKey },
            );
            await attachmentsApi.uploadToR2(uploadUrl, file);

            console.log(
              `${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: confirm`,
              { name: file.name, fileKey },
            );
            const attachment = await attachmentsApi.confirmUpload({
              planId,
              entityType,
              entityId,
              fileKey,
              fileName: file.name,
              contentType: file.mimeType,
              fileSize: file.size,
              publicUrl,
            });
            console.log(
              `${ATTACH_UPLOAD_LOG_PREFIX} ${tag} pipeline OK`,
              { attachmentId: attachment.id, name: file.name },
            );
            return attachment;
          } catch (err) {
            console.error(
              `${ATTACH_UPLOAD_LOG_PREFIX} ${tag} pipeline FAILED`,
              { name: file.name },
              err,
            );
            throw err;
          }
        }),
      );
      console.log(`${ATTACH_UPLOAD_LOG_PREFIX} uploadFiles: all OK`, {
        attachmentIds: results.map(r => r.id),
      });
      return results;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadFiles };
};
