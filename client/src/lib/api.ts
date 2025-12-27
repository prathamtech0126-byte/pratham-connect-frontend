import axios, { InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  " https://fur-enquiries-awareness-nature.trycloudflare.com";

let inMemoryToken: string | null = null;

// Debug helper to check state (remove in production)
if (typeof window !== "undefined") {
  (window as any).__debugAuth = () => {
    console.log("--- Auth Security Check ---");
    console.log("In-Memory Token:", inMemoryToken ? "✅ Stored (Safe)" : "❌ Not found");
    console.log("Local Storage 'accessToken':", localStorage.getItem("accessToken") ? "⚠️ Warning: Found" : "✅ Clean");
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
    const token = inMemoryToken || getCookie("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token using the refresh cookie (HttpOnly, sent automatically)
        const response = await axios.post(
          `${API_BASE_URL}/api/users/refresh`,
          {},
          { 
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            }
          },
        );
        const { accessToken } = response.data;

        // Update in-memory token
        setInMemoryToken(accessToken);
        
        // Update request header and retry
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return axios({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: `Bearer ${accessToken}`
          }
        });
      } catch (refreshError) {
        // If refresh fails, clear state
        setInMemoryToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
