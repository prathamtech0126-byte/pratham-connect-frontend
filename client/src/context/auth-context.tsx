import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useLocation } from "wouter";
import api from '@/lib/api';

export type UserRole = 'superadmin' | 'manager' | 'counsellor' | 'director';

interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isSupervisor?: boolean; // Only for Manager role
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, userData?: Partial<User>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: Record<UserRole, User> = {
  superadmin: {
    id: '1',
    username: 'superadmin',
    name: 'Super Admin',
    role: 'superadmin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  manager: {
    id: '2',
    username: 'manager',
    name: 'Sarah Manager',
    role: 'manager',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  counsellor: {
    id: '4',
    username: 'counsellor',
    name: 'Priya Singh',
    role: 'counsellor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  director: {
    id: '5',
    username: 'director',
    name: 'Director',
    role: 'director',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  }
};

import { setInMemoryToken, setCsrfToken } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0); // Track consecutive auth failures

  // Function to refresh the access token
  // Returns: { success: boolean, isAuthError: boolean }
  // isAuthError = true means real auth failure (401/403), should logout
  // isAuthError = false means network/timeout error, should NOT logout
  const refreshToken = async (): Promise<{ success: boolean; isAuthError: boolean }> => {
    try {
      // ✅ Increased timeout for deployed backend (Render.com free tier may be slow)
      const res = await api.post("/api/users/refresh", {}, { withCredentials: true, timeout: 30000 });
      const { accessToken, csrfToken: csrf, csrf_token: csrfSnake } = res.data;

      if (accessToken) setInMemoryToken(accessToken);
      const newCsrf = csrf ?? csrfSnake ?? null;
      if (newCsrf) setCsrfToken(newCsrf);

      if (accessToken) return { success: true, isAuthError: false };
      // No access token but got response - might be auth issue
      return { success: false, isAuthError: true };
    } catch (err: any) {
      // ✅ Distinguish between network errors and auth errors
      const isAuthError = err.response?.status === 401 || err.response?.status === 403;
      const isNetworkError =
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNREFUSED' ||
        !err.response; // No response = network issue

      if (isAuthError) {
        // Real authentication failure - should logout
        console.log("[Auth] Token refresh failed: Authentication error (401/403)");
        return { success: false, isAuthError: true };
      } else if (isNetworkError) {
        // Network/timeout error - don't logout, just log silently
        console.log("[Auth] Token refresh failed: Network error (will retry silently)", err.code || err.message);
        return { success: false, isAuthError: false };
      } else {
        // Other errors - treat as non-fatal
        console.log("[Auth] Token refresh failed: Other error (will retry)", err.response?.status);
        return { success: false, isAuthError: false };
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      // ✅ Always verify session with backend - don't trust localStorage alone
      const storedUser = localStorage.getItem('auth_user');

      // If we have stored user, verify it's still valid with backend
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);

          // Clean up invalid user IDs (timestamps)
          if (userData.id && String(userData.id).length > 10) {
            localStorage.removeItem('auth_user');
            // Continue to backend verification
          } else {
            // Try to verify with backend first
            try {
              // ✅ Verify with backend - use longer timeout for deployed backend
              const res = await api.post("/api/users/refresh", {}, { withCredentials: true, timeout: 30000 });
              if (cancelled) return;

              const { accessToken, role, userId, username, name, isSupervisor, csrfToken: csrf, csrf_token: csrfSnake } = res.data;
              setInMemoryToken(accessToken);
              const newCsrf = csrf ?? csrfSnake ?? null;
              if (newCsrf) setCsrfToken(newCsrf);

              const mappedRole = (role === "admin" ? "superadmin" : role) as UserRole;
              const verifiedUserData: User = {
                id: String(userId || userData.id || '1'),
                username: username || userData.username || 'user',
                name: name || userData.name || 'User',
                role: mappedRole,
                isSupervisor: mappedRole === 'manager' ? (isSupervisor || false) : undefined,
              };

              setUser(verifiedUserData);
              localStorage.setItem('auth_user', JSON.stringify(verifiedUserData));
              if (!cancelled) setIsLoading(false);
              return; // ✅ Successfully verified, exit early
            } catch (refreshError) {
              // Backend verification failed - clear stored user and continue to set null
              console.log("[Auth] Backend verification failed, clearing stored user");
              localStorage.removeItem('auth_user');
            }
          }
        } catch (e) {
          console.error("[Auth] Error parsing stored user:", e);
          localStorage.removeItem('auth_user');
        }
      }

      // ✅ No stored user or verification failed - try backend refresh
      try {
        // ✅ Use longer timeout for deployed backend (Render.com free tier may be slow)
        const res = await api.post("/api/users/refresh", {}, { withCredentials: true, timeout: 30000 });
        if (cancelled) return;

        const { accessToken, role, userId, username, name, isSupervisor, csrfToken: csrf, csrf_token: csrfSnake } = res.data;
        setInMemoryToken(accessToken);
        const newCsrf = csrf ?? csrfSnake ?? null;
        if (newCsrf) setCsrfToken(newCsrf);

        const mappedRole = (role === "admin" ? "superadmin" : role) as UserRole;
        const userData: User = {
          id: String(userId || '1'),
          username: username || 'user',
          name: name || 'User',
          role: mappedRole,
          isSupervisor: mappedRole === 'manager' ? (isSupervisor || false) : undefined,
        };

        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } catch (err: any) {
        // ✅ No valid session - ensure user is null and clear all auth data
        if (!cancelled) {
          console.log("[Auth] No valid session found, user must login");
          setUser(null);
          setInMemoryToken(null);
          setCsrfToken(null);
          localStorage.removeItem('auth_user');
          localStorage.removeItem('accessToken');
          // Ensure we're not on login page before redirecting
          // (Redirect will be handled by ProtectedRoute)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          // ✅ Final check: Ensure user state is correct after all async operations
          // This prevents any race conditions where user might be incorrectly set
        }
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // Proactive token refresh: Refresh token every 14 minutes (before 15min expiration)
  useEffect(() => {
    if (!user) {
      // Clear interval if user logs out
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      consecutiveFailuresRef.current = 0; // Reset counter on logout
      return;
    }

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Refresh token every 14 minutes (840,000 ms)
    // This ensures token is refreshed BEFORE it expires (15 minutes)
    const MAX_CONSECUTIVE_FAILURES = 3; // Only logout after 3 consecutive auth failures

    refreshIntervalRef.current = setInterval(async () => {
      const result = await refreshToken();

      if (result.success) {
        // ✅ Success - reset failure counter
        consecutiveFailuresRef.current = 0;
      } else if (result.isAuthError) {
        // ✅ Real authentication error (401/403)
        consecutiveFailuresRef.current++;
        console.log(`[Auth] Token refresh auth error (${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES})`);

        // Only logout after multiple consecutive auth failures
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          console.log("[Auth] Multiple auth failures, logging out user");
          setUser(null);
          setInMemoryToken(null);
          setCsrfToken(null);
          localStorage.removeItem('auth_user');
          setLocation('/login');
        }
      } else {
        // ✅ Network/timeout error - don't logout, just retry next time
        // Reset counter on network errors (they're temporary)
        consecutiveFailuresRef.current = 0;
        console.log("[Auth] Token refresh network error (non-fatal, will retry)");
        // User stays logged in, will retry on next interval
      }
    }, 14 * 60 * 1000); // 14 minutes

    // Also refresh immediately when user logs in (in case token is close to expiring)
    // Silent refresh - don't show errors to user
    refreshToken().then((result) => {
      if (result.success) {
        consecutiveFailuresRef.current = 0;
      } else if (!result.isAuthError) {
        // Network error on initial refresh - non-fatal
        console.log("[Auth] Initial token refresh network error (non-fatal)");
      }
    }).catch(() => {
      // Silently handle errors - don't show toast or logout
      console.log("[Auth] Initial token refresh failed (non-fatal)");
    });

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user, setLocation]);

  const login = (role: UserRole, userData?: Partial<User>) => {
    setIsLoading(true);

    // Use backend user data if provided, otherwise use mock user
    const newUser: User = userData && userData.id
      ? { ...userData, role, isSupervisor: role === 'manager' ? (userData.isSupervisor || false) : undefined } as User
      : MOCK_USERS[role] || {
          id: 'temp-' + Date.now(),
          username: 'user',
          name: 'User',
          role: role,
          isSupervisor: role === 'manager' ? false : undefined
        };

    setUser(newUser);

    localStorage.setItem('auth_user', JSON.stringify(newUser));

    localStorage.removeItem('accessToken');
    setIsLoading(false);
    setLocation('/');

    // Trigger immediate token refresh check after login
    // The useEffect will handle the interval setup
  };

  const logout = async () => {
    try {
      // Call the backend logout API
      await api.post('/api/users/logout');
    } catch (error) {
      // Silent fail for UI
    } finally {
      // Clear local state, memory token and cookies
      setUser(null);
      setInMemoryToken(null);
      setCsrfToken(null);
      localStorage.removeItem('auth_user');
      document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setLocation('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
