import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from "wouter";
import api from '@/lib/api';

export type UserRole = 'superadmin' | 'manager' | 'counsellor' | 'director';

interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
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

import { setInMemoryToken } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize user from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Initial State: Assume we are loading
      setIsLoading(true);

      const storedUser = localStorage.getItem('auth_user');
      
      // 2. Optimization: If no user info in storage, we know we're logged out
      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      try {
        // 3. The Refresh Call: This is the key part that happens on reload
        console.log("App Reloaded: Attempting to restore session via refresh token...");
        const response = await api.post('/api/users/refresh');
        
        if (response.data && response.data.accessToken) {
          setInMemoryToken(response.data.accessToken);
          // Only set user once we have the token
          setUser(JSON.parse(storedUser));
          console.log("Session restored successfully");
        }
      } catch (error: any) {
        console.error("Session restoration failed:", error.response?.status);
        
        // 4. Critical Decision: Only log out on definitive auth failure
        if (error.response?.status === 401 || error.response?.status === 403) {
          setUser(null);
          setInMemoryToken(null);
          localStorage.removeItem('auth_user');
        } else {
          // Network/Server error: Let's assume the session is still valid locally
          // so the user can see the UI while the server/network recovers
          setUser(JSON.parse(storedUser));
        }
      } finally {
        // 5. Completion: Now that the refresh is done, ProtectedRoute can safely decide
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (role: UserRole, accessToken?: string) => {
    setIsLoading(true);
    if (accessToken) {
      setInMemoryToken(accessToken);
    }
    const newUser = MOCK_USERS[role] || {
      id: 'temp-' + Date.now(),
      username: 'user',
      name: 'User',
      role: role
    };
    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    localStorage.removeItem('accessToken');
    setIsLoading(false);
    setLocation('/');
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
