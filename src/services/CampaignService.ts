export interface CampaignPayload {
    title: string;
    goal: number;
    ownerId: string;
    description?: string;
    image?: string;
    verified?: boolean;
    status?: string;
  }
  
  export interface CampaignResponse {
    success: boolean;
    id: string;
    createdAt: string;
  }
  
  const API_BASE = import.meta.env.VITE_API_URL as string;
  
  export async function createCampaign(
    payload: CampaignPayload
  ): Promise<CampaignResponse> {
    const res = await fetch(`${API_BASE}/createCampaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create campaign");
    }
    return res.json();
  }
  