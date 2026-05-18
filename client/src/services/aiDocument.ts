import type {
  AiDocumentDraftPayloadAccommodation,
  AiDocumentDraftPayloadExpense,
  AiDocumentDraftPayloadFlight,
  AiDocumentDraftPayloadItinerary,
  AiDocumentFieldMetaEntry,
  AiDocumentItemDraft,
  AiDocumentItemType,
  DocumentUploadAnalyzeResponse,
} from "../types/api";
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

/** 프록시/중간 계층에서 객체가 JSON 문자열로 한 번 더 감싸진 경우 */
function tryParseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return value;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return value;
  }
}

function normalizeDraftPayload(raw: unknown): {
  values: Record<string, unknown>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
} {
  const unwrapped = tryParseJsonIfString(raw);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    return { values: {}, fieldMeta: {} };
  }
  const p = unwrapped as Record<string, unknown>;
  let valuesRaw: unknown = p.values ?? p.Values;
  valuesRaw = tryParseJsonIfString(valuesRaw);
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
  const rawType = d.itemType ?? d.item_type ?? d.ItemType;
  const itemType =
    typeof rawType === "string" ? rawType.trim().toLowerCase() : "";
  if (
    itemType !== "flight" &&
    itemType !== "itinerary" &&
    itemType !== "accommodation" &&
    itemType !== "expense"
  ) {
    return null;
  }
  const payloadRaw = tryParseJsonIfString(d.payload ?? d.Payload);
  const payload = normalizeDraftPayload(payloadRaw);
  switch (itemType) {
    case "flight":
      return {
        itemType: "flight",
        payload: payload as AiDocumentDraftPayloadFlight,
      };
    case "itinerary":
      return {
        itemType: "itinerary",
        payload: payload as AiDocumentDraftPayloadItinerary,
      };
    case "accommodation":
      return {
        itemType: "accommodation",
        payload: payload as AiDocumentDraftPayloadAccommodation,
      };
    case "expense":
      return {
        itemType: "expense",
        payload: payload as AiDocumentDraftPayloadExpense,
      };
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
  const nested =
    o.data && typeof o.data === "object" && !Array.isArray(o.data)
      ? (o.data as Record<string, unknown>)
      : null;

  const success = Boolean(
    o.success ?? o.Success ?? nested?.success ?? nested?.Success,
  );
  const err =
    o.error ?? o.Error ?? nested?.error ?? nested?.Error;
  const inferredRaw =
    o.inferredItemType ??
    o.inferred_item_type ??
    o.InferredItemType ??
    nested?.inferredItemType ??
    nested?.inferred_item_type ??
    nested?.InferredItemType;
  const inferredNorm =
    typeof inferredRaw === "string" ? inferredRaw.trim().toLowerCase() : "";
  let inferredItemType: AiDocumentItemType | null = null;
  if (
    inferredNorm === "flight" ||
    inferredNorm === "itinerary" ||
    inferredNorm === "accommodation" ||
    inferredNorm === "expense"
  ) {
    inferredItemType = inferredNorm as AiDocumentItemType;
  }

  const draftSource =
    o.draft ??
    o.Draft ??
    nested?.draft ??
    nested?.Draft;

  const draft = normalizeItemDraft(draftSource);

  return {
    success,
    inferredItemType,
    draft,
    error: typeof err === "string" ? err : null,
  };
}

/** FastAPI 400/422 등 본문이 표준 분석 스키마가 아닐 때 */
function normalizeAnalyzeHttpError(
  status: number,
  data: unknown,
): DocumentUploadAnalyzeResponse {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const detail = o.detail ?? o.Detail;
    if (typeof detail === "string" && detail.trim()) {
      return {
        success: false,
        inferredItemType: null,
        draft: null,
        error: detail.trim(),
      };
    }
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in (item as object)) {
            return String((item as { msg?: unknown }).msg ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length > 0) {
        return {
          success: false,
          inferredItemType: null,
          draft: null,
          error: parts.join("; "),
        };
      }
    }
  }
  return {
    success: false,
    inferredItemType: null,
    draft: null,
    error:
      status === 422
        ? "요청 형식이 올바르지 않습니다. (422)"
        : "요청을 처리하지 못했습니다.",
  };
}

/**
 * 업로드 파일 OCR + AI 1-call 분석.
 * 서버가 HTTP 400/422를 주어도 throw 하지 않고 동일 스키마로 반환한다.
 */
export async function analyzeDocumentUpload(
  file: AnalyzeUploadFileInput,
  options?: { filename?: string },
): Promise<DocumentUploadAnalyzeResponse> {
  const form = new FormData();
  const fallbackName = options?.filename ?? "upload";
  appendAnalyzeUploadFile(form, file, fallbackName);

  const response = await api.post<unknown>("/private/ai/analyze-upload", form, {
    timeout: 120_000,
    validateStatus: status =>
      status === 200 || status === 400 || status === 422,
    transformRequest: [
      (data, headers) => {
        if (typeof FormData !== "undefined" && data instanceof FormData) {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return data;
      },
    ],
  });

  const { status, data } = response;
  if (status === 200) {
    return normalizeAnalyzeResponse(data);
  }
  const parsed = normalizeAnalyzeResponse(data);
  return parsed.error ? parsed : normalizeAnalyzeHttpError(status, data);
}

export const aiDocumentApi = {
  analyzeUpload: analyzeDocumentUpload,
};
