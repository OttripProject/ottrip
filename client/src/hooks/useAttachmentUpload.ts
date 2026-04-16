import { useState } from "react";

import {
  ATTACH_UPLOAD_LOG_PREFIX,
  attachDebugLog,
  attachmentsApi,
} from "../services/attachments";
import type { Attachment, AttachmentEntityType, LocalFile } from "../types/api";

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
            attachDebugLog(
              `${tag} step: prepare upload (URI → Blob 또는 file://)`,
              {
                name: file.name,
                uri: file.uri ?? "",
              },
            );
            const prepared = await attachmentsApi.prepareAttachmentUpload(file);

            console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: presigned`, {
              name: file.name,
              byteLength: prepared.byteLength,
            });
            const { uploadUrl, fileKey, publicUrl } =
              await attachmentsApi.getPresignedUploadUrl({
                planId,
                entityType,
                entityId,
                fileName: file.name,
                contentType: file.mimeType,
                fileSize: prepared.byteLength,
              });

            attachDebugLog(`${tag} Content-Type 일치 (presign ↔ PUT)`, {
              name: file.name,
              mimeTypeForPresignAndPut: file.mimeType ?? "",
              note: "getPresignedUploadUrl의 content_type과 uploadToR2의 Content-Type 헤더가 동일해야 함",
            });
            console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: R2 PUT`, {
              name: file.name,
              fileKey,
            });
            await attachmentsApi.uploadToR2(
              uploadUrl,
              prepared,
              file.mimeType ?? "",
            );

            console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${tag} step: confirm`, {
              name: file.name,
              fileKey,
            });
            const attachment = await attachmentsApi.confirmUpload({
              planId,
              entityType,
              entityId,
              fileKey,
              fileName: file.name,
              contentType: file.mimeType,
              fileSize: prepared.byteLength,
              publicUrl,
            });
            console.log(`${ATTACH_UPLOAD_LOG_PREFIX} ${tag} pipeline OK`, {
              attachmentId: attachment.id,
              name: file.name,
            });
            return attachment;
          } catch (err) {
            attachDebugLog(`${tag} pipeline FAILED (직전 상태)`, {
              name: file.name,
              uri: file.uri ?? "",
              mimeType: file.mimeType ?? "",
            });
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
