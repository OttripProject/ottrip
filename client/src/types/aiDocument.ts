/** 서버 `ItemType` / `DocumentUploadAnalyzeResponse` (camelCase)와 맞춤 */

export type AiDocumentItemType =
  | "flight"
  | "itinerary"
  | "accommodation"
  | "expense";

export interface AiDocumentFieldMetaEntry {
  certainty: "high" | "medium" | "low";
  editable: boolean;
}

export interface AiDocumentDraftPayload {
  values: Record<string, unknown>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
}

export type AiDocumentItemDraft =
  | { itemType: "flight"; payload: AiDocumentDraftPayload }
  | { itemType: "itinerary"; payload: AiDocumentDraftPayload }
  | { itemType: "accommodation"; payload: AiDocumentDraftPayload }
  | { itemType: "expense"; payload: AiDocumentDraftPayload };

export interface DocumentUploadAnalyzeResponse {
  success: boolean;
  inferredItemType: AiDocumentItemType | null;
  draft: AiDocumentItemDraft | null;
  error: string | null;
}
