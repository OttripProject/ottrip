import type {
  AiDocumentFieldMetaEntry,
  AiDocumentItemDraft,
  AiDocumentItemType,
  DocumentUploadAnalyzeResponse,
} from "../types/aiDocument";
import api from "./api";

/** 웹 `File`/`Blob` 또는 RN `FormData`에 넣는 파일 객체 */
export type AnalyzeUploadFileInput =
  | File
  | Blob
  | { uri: string; name: string; type: string };

function appendAnalyzeUploadFile(
  form: FormData,
  file: AnalyzeUploadFileInput,
  fallbackName: string,
): void {
  if (typeof File !== "undefined" && file instanceof File) {
    form.append("file", file);
    return;
  }
  if (file instanceof Blob) {
    form.append("file", file, fallbackName);
    return;
  }
  form.append("file", {
    uri: file.uri,
    name: file.name || fallbackName,
    type: file.type || "application/octet-stream",
  } as unknown as Blob);
}

function coerceFieldMetaEntry(raw: unknown): AiDocumentFieldMetaEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const certainty = o.certainty ?? o.Certainty;
  const editable = o.editable ?? o.Editable;
  if (
    certainty !== "high" &&
    certainty !== "medium" &&
    certainty !== "low"
  ) {
    return null;
  }
  if (typeof editable !== "boolean") return null;
  return { certainty, editable };
}

function normalizeDraftPayload(raw: unknown): {
  values: Record<string, unknown>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
} {
  if (!raw || typeof raw !== "object") {
    return { values: {}, fieldMeta: {} };
  }
  const p = raw as Record<string, unknown>;
  const valuesRaw = p.values ?? p.Values;
  const metaRaw = p.fieldMeta ?? p.field_meta ?? p.FieldMeta;

  const values =
    valuesRaw && typeof valuesRaw === "object" && !Array.isArray(valuesRaw)
      ? (valuesRaw as Record<string, unknown>)
      : {};

  const fieldMeta: Record<string, AiDocumentFieldMetaEntry> = {};
  if (metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)) {
    for (const [k, v] of Object.entries(metaRaw as Record<string, unknown>)) {
      const entry = coerceFieldMetaEntry(v);
      if (entry) fieldMeta[k] = entry;
    }
  }

  return { values, fieldMeta };
}

function normalizeItemDraft(raw: unknown): AiDocumentItemDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const itemType = (d.itemType ?? d.item_type) as string | undefined;
  if (
    itemType !== "flight" &&
    itemType !== "itinerary" &&
    itemType !== "accommodation" &&
    itemType !== "expense"
  ) {
    return null;
  }
  const payload = normalizeDraftPayload(d.payload);
  switch (itemType) {
    case "flight":
      return { itemType: "flight", payload };
    case "itinerary":
      return { itemType: "itinerary", payload };
    case "accommodation":
      return { itemType: "accommodation", payload };
    case "expense":
      return { itemType: "expense", payload };
    default:
      return null;
  }
}

function normalizeAnalyzeResponse(
  data: unknown,
): DocumentUploadAnalyzeResponse {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      inferredItemType: null,
      draft: null,
      error: "응답 형식이 올바르지 않습니다.",
    };
  }
  const o = data as Record<string, unknown>;
  const success = Boolean(o.success ?? o.Success);
  const err = o.error ?? o.Error;
  const inferredRaw = o.inferredItemType ?? o.inferred_item_type;
  let inferredItemType: AiDocumentItemType | null = null;
  if (
    inferredRaw === "flight" ||
    inferredRaw === "itinerary" ||
    inferredRaw === "accommodation" ||
    inferredRaw === "expense"
  ) {
    inferredItemType = inferredRaw;
  }

  const draft = normalizeItemDraft(o.draft ?? o.Draft);

  return {
    success,
    inferredItemType,
    draft,
    error: typeof err === "string" ? err : null,
  };
}

/**
 * 업로드 파일 OCR + AI 1-call 분석.
 * 서버가 HTTP 400을 주어도 본문이 있으면 throw 하지 않고 동일 스키마로 반환한다.
 */
export async function analyzeDocumentUpload(
  file: AnalyzeUploadFileInput,
  options?: { filename?: string },
): Promise<DocumentUploadAnalyzeResponse> {
  const form = new FormData();
  const fallbackName = options?.filename ?? "upload";
  appendAnalyzeUploadFile(form, file, fallbackName);

  const response = await api.post<unknown>("/private/ai/analyze-upload", form, {
    validateStatus: status => status === 200 || status === 400,
    transformRequest: [
      (data, headers) => {
        if (typeof FormData !== "undefined" && data instanceof FormData) {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return data;
      },
    ],
  });

  return normalizeAnalyzeResponse(response.data);
}

export const aiDocumentApi = {
  analyzeUpload: analyzeDocumentUpload,
};
