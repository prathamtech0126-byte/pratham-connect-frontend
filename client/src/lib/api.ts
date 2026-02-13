import axios, { InternalAxiosRequestConfig } from "axios";

// IMPORTANT: Use relative URLs when running on localhost (dev/preview) to leverage Vite proxy
// Only use full URL when actually deployed to a production server
// This ensures preview mode (localhost:4173) uses the proxy instead of direct calls
let API_BASE_URL = "";

if (typeof window !== "undefined") {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  if (isLocalhost) {
    // Use proxy when on localhost (dev/preview mode)
    API_BASE_URL = "";
  } else {
    // Use full URL when deployed to production
    API_BASE_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
  }
} else {
  // SSR fallback
  API_BASE_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
}

// Debug: Log the API base URL
if (typeof window !== "undefined") {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  // console.log("[API] Environment:", {
  //   PROD: import.meta.env.PROD,
  //   DEV: import.meta.env.DEV,
  //   MODE: import.meta.env.MODE,
  //   VITE_API_URL: import.meta.env.VITE_API_URL,
  //   CurrentOrigin: window.location.origin,
  //   Hostname: window.location.hostname,
  //   IsLocalhost: isLocalhost,
  // });
  // console.log("[API] Full API URL will be:", API_BASE_URL ? `${API_BASE_URL}/api/...` : "relative URLs (proxy)");
  // console.log("[API] ⚠️ If you see direct Render.com URLs, the proxy is not being used!");
}

let inMemoryToken: string | null = null;
let csrfToken: string | null = null;

// Debug helper to check state (remove in production)
// if (typeof window !== "undefined") {
//   (window as any).__debugAuth = () => {
//     console.log("--- Auth Security Check ---");
//     console.log(
//       "In-Memory Token:",
//       inMemoryToken ? "✅ Stored (Safe)" : "❌ Not found",
//     );
//     console.log(
//       "Local Storage 'accessToken':",
//       localStorage.getItem("accessToken") ? "⚠️ Warning: Found" : "✅ Clean",
//     );
//     console.log("All Cookies:", document.cookie || "None");
//     console.log("---------------------------");
//   };
// }

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

/** Store CSRF token from login/refresh response; sent as X-CSRF-Token on mutating requests */
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 90000, // 90 seconds - increased for Render.com free tier spin-up time
});

// Helper to get/set/remove cookies if needed, but primarily using in-memory token
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

api.defaults.withCredentials = true;

// Request interceptor: add Bearer token and CSRF token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    // Send CSRF token on mutating requests (backend requireCsrf expects cookie + this header)
    const method = (config.method || "get").toLowerCase();
    if (csrfToken && config.headers && ["post", "put", "delete", "patch"].includes(method)) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
    return config;
  },
  (error) => {
    // console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (res) => {
    // console.log("[API] Response:", {
    //   status: res.status,
    //   url: res.config.url,
    // });
    return res;
  },
  async (error) => {
    // console.error("[API] Response error:", {
    //   message: error.message,
    //   code: error.code,
    //   status: error.response?.status,
    //   url: error.config?.url,
    //   baseURL: error.config?.baseURL,
    //   fullURL: error.config ? `${error.config.baseURL || ""}${error.config.url || ""}` : "unknown",
    //   responseData: error.response?.data,
    // });

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
        const newCsrf = res.data.csrfToken ?? res.data.csrf_token ?? null;

        if (newAccessToken) setInMemoryToken(newAccessToken);
        if (newCsrf) setCsrfToken(newCsrf);

        return api(originalRequest);
      } catch (refreshError: any) {
        // ✅ Only logout on real auth errors, not network errors
        const isAuthError = refreshError.response?.status === 401 || refreshError.response?.status === 403;
        const isNetworkError =
          refreshError.code === 'ECONNABORTED' ||
          refreshError.code === 'ETIMEDOUT' ||
          refreshError.code === 'ERR_NETWORK' ||
          refreshError.code === 'ECONNREFUSED' ||
          !refreshError.response;

        if (isAuthError) {
          setInMemoryToken(null);
          setCsrfToken(null);
          localStorage.removeItem("auth_user");

          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        } else if (isNetworkError) {
          // Network error - don't logout, just reject the original request
          // User can retry manually or wait for next automatic refresh
          // console.log("[API] Token refresh failed with network error (non-fatal)");
          // Don't logout, just reject the request
        } else {
          // Other errors - don't logout
          // console.log("[API] Token refresh failed with other error (non-fatal)");
        }

        // Reject the original request in all cases
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
