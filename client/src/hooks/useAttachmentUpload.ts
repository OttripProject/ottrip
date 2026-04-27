import { useState } from "react";

import { attachmentsApi } from "../services/attachments";
import type { Attachment, AttachmentEntityType, LocalFile } from "../types/api";
import { handleGuestPromptError } from "../utils/guestPrompt";

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
      return [];
    }

    setIsUploading(true);
    try {
      const results = await Promise.all(
        files.map(async file => {
          const prepared = await attachmentsApi.prepareAttachmentUpload(file);
          const { uploadUrl, fileKey, publicUrl } =
            await attachmentsApi.getPresignedUploadUrl({
              planId,
              entityType,
              entityId,
              fileName: file.name,
              contentType: file.mimeType,
              fileSize: prepared.byteLength,
            });
          await attachmentsApi.uploadToR2(
            uploadUrl,
            prepared,
            file.mimeType ?? "",
          );
          return attachmentsApi.confirmUpload({
            planId,
            entityType,
            entityId,
            fileKey,
            fileName: file.name,
            contentType: file.mimeType,
            fileSize: prepared.byteLength,
            publicUrl,
          });
        }),
      );
      return results;
    } catch (error) {
      handleGuestPromptError(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadFiles };
};
