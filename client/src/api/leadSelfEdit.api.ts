import axios from "axios";
import type { FrontDeskLeadDetail } from "@/api/frontdesk.api";

function resolveBaseUrl(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_API_URL || "";
  }
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.");
  return isLocal ? "" : import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
}

const selfEditClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 60000,
});

function tokenConfig(token: string) {
  return {
    params: { token },
    headers: { "X-Lead-Edit-Token": token },
  };
}

export interface LeadSelfEditResponse {
  success: boolean;
  data: FrontDeskLeadDetail;
  expiresAt: string;
  message?: string;
}

export const leadSelfEditApi = {
  getMe: (token: string): Promise<LeadSelfEditResponse> =>
    selfEditClient.get("/api/lead-registration/self/me", tokenConfig(token)).then((r) => r.data),

  updateMe: (token: string, body: Record<string, unknown>): Promise<LeadSelfEditResponse> =>
    selfEditClient.patch("/api/lead-registration/self/me", body, tokenConfig(token)).then((r) => r.data),
};
