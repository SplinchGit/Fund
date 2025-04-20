// Inside the createCampaign function:
const backendApiEndpoint = import.meta.env.VITE_AMPLIFY_API;

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

  // REMOVE THIS LINE - Cannot access secret API URL directly from frontend
  // const API_BASE = import.meta.env.VITE_API_URL as string;

  export async function createCampaign(
    payload: CampaignPayload
  ): Promise<CampaignResponse> {

    // 1. Get YOUR backend API endpoint (this one IS safe to get from env vars)
    const backendApiEndpoint = import.meta.env.VITE_AMPLIFY_API; // Or however you access VITE_AMPLIFY_API

    if (!backendApiEndpoint) {
        console.error("Backend API endpoint (VITE_AMPLIFY_API) is not configured!");
        throw new Error("Configuration error: Backend endpoint missing.");
    }

    // 2. Call YOUR backend endpoint, sending the payload
    //    Let's assume your backend has a route like '/createCampaign' to handle this
    const res = await fetch(`${backendApiEndpoint}/createCampaign`, { // <-- Calling YOUR backend now
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any necessary auth headers here (like a JWT token)
        // 'Authorization': `Bearer ${yourAuthToken}`
      },
      body: JSON.stringify(payload),
    });

    // 3. Handle the response from YOUR backend
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Error response from backend:", err);
      throw new Error(err.message || "Failed to create campaign via backend");
    }
    return res.json(); // Return the response YOUR backend sends
  }