import api from "./api";

export interface ChecklistItem {
  id: string;
  name: string;
  reason: string;
  source: string;
  is_checked: boolean;
  is_custom: boolean;
}

export interface ChecklistCategories {
  basic_required: ChecklistItem[];
  schedule_required: ChecklistItem[];
  recommended: ChecklistItem[];
  optional: ChecklistItem[];
}

export interface UserCustomizations {
  added_items: ChecklistItem[];
  hidden_items: string[];
  settings: {
    auto_regenerate: boolean;
    preserve_custom_items: boolean;
  };
}

export interface TravelChecklist {
  current_version: number;
  generated_at: string;
  ai_version: string;
  categories: ChecklistCategories;
  user_customizations: UserCustomizations;
}

export interface ChecklistGenerateResponse {
  success: boolean;
  message: string;
  checklist: TravelChecklist | null;
}

export const checklistApi = {
  async generateChecklist(
    planId: number,
    forceRegenerate = false,
  ): Promise<ChecklistGenerateResponse> {
    const response = await api.post<ChecklistGenerateResponse>(
      "/private/ai/generate-checklist",
      {
        plan_id: planId,
        force_regenerate: forceRegenerate,
      },
    );
    return response.data;
  },

  async getChecklist(planId: number): Promise<ChecklistGenerateResponse> {
    const response = await api.get<ChecklistGenerateResponse>(
      `/private/ai/checklist/${planId}`,
    );
    return response.data;
  },

  async updateChecklist(
    planId: number,
    checklist: TravelChecklist,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.put<{ success: boolean; message: string }>(
      `/private/ai/checklist/${planId}`,
      { checklist },
    );
    return response.data;
  },

  async toggleCheck(
    planId: number,
    checklist: TravelChecklist,
    itemId: string,
  ): Promise<{ success: boolean; message: string }> {
    const categories = { ...checklist.categories };

    Object.keys(categories).forEach(category => {
      const items = categories[category as keyof ChecklistCategories];
      const item = items.find(i => i.id === itemId);
      if (item) {
        item.is_checked = !item.is_checked;
      }
    });

    const updatedChecklist = { ...checklist, categories };
    return this.updateChecklist(planId, updatedChecklist);
  },
};

export default checklistApi;
