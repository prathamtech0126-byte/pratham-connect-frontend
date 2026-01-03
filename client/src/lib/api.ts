import axios, { InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://garage-distributors-attitudes-passes.trycloudflare.com";

let inMemoryToken: string | null = null;

// Debug helper to check state (remove in production)
if (typeof window !== "undefined") {
  (window as any).__debugAuth = () => {
    console.log("--- Auth Security Check ---");
    console.log(
      "In-Memory Token:",
      inMemoryToken ? "✅ Stored (Safe)" : "❌ Not found",
    );
    console.log(
      "Local Storage 'accessToken':",
      localStorage.getItem("accessToken") ? "⚠️ Warning: Found" : "✅ Clean",
    );
    console.log("All Cookies:", document.cookie || "None");
    console.log("---------------------------");
  };
}

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 60000,
});

// Helper to get/set/remove cookies if needed, but primarily using in-memory token
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

api.defaults.withCredentials = true;

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // We only attach Bearer token if it exists in memory.
    // If not, we rely on HttpOnly cookies (withCredentials: true).
    if (inMemoryToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !(originalRequest as any)._retry &&
      !originalRequest.url?.includes("/login") &&
      !originalRequest.url?.includes("/refresh")
    ) {
      (originalRequest as any)._retry = true;

      try {
        const res = await api.post("/api/users/refresh");
        const newAccessToken = res.data.accessToken;

        if (newAccessToken) {
          setInMemoryToken(newAccessToken);
        }

        return api(originalRequest);
      } catch {
        setInMemoryToken(null);
        localStorage.removeItem("auth_user");

        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
