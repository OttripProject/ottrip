import { useState } from 'react';

import { Attachment, AttachmentEntityType, LocalFile } from '../types/api';
import { attachmentsApi } from '../services/attachments';

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
    if (files.length === 0) return [];

    setIsUploading(true);
    try {
      const results = await Promise.all(
        files.map(async file => {
          const { uploadUrl, fileKey, publicUrl } =
            await attachmentsApi.getPresignedUploadUrl({
              planId,
              entityType,
              entityId,
              fileName: file.name,
              contentType: file.mimeType,
              fileSize: file.size,
            });

          await attachmentsApi.uploadToR2(uploadUrl, file);

          return attachmentsApi.confirmUpload({
            planId,
            entityType,
            entityId,
            fileKey,
            fileName: file.name,
            contentType: file.mimeType,
            fileSize: file.size,
            publicUrl,
          });
        }),
      );
      return results;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadFiles };
};
