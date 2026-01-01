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

import { setInMemoryToken } from '@/lib/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      // FORCE CLEAR for this debugging session
      // localStorage.removeItem('auth_user'); 
      
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          if (userData.id && String(userData.id).length > 10) {
            console.log("⚠ Detected legacy timestamp ID, clearing localStorage");
            localStorage.removeItem('auth_user');
          } else {
            console.log("✓ User restored from localStorage:", userData.username);
            setUser(userData);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem('auth_user');
        }
      }

      try {
        const res = await api.post("/api/users/refresh", {}, { withCredentials: true, timeout: 5000 });
        if (cancelled) return;

        const { accessToken, role, userId, username, name } = res.data;
        setInMemoryToken(accessToken);

        const mappedRole = (role === "admin" ? "superadmin" : role) as UserRole;
        const userData: User = {
          id: String(userId || '1'), // FALLBACK TO '1' INSTEAD OF TIMESTAMP
          username: username || 'user',
          name: name || 'User',
          role: mappedRole,
        };

        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } catch (err: any) {
        if (!cancelled) {
          setUser(null);
          setInMemoryToken(null);
          localStorage.removeItem('auth_user');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const login = (role: UserRole, userData?: Partial<User>) => {
    setIsLoading(true);
    
    // Use backend user data if provided, otherwise use mock user
    const newUser: User = userData && userData.id 
      ? { ...userData, role } as User
      : MOCK_USERS[role] || {
          id: 'temp-' + Date.now(),
          username: 'user',
          name: 'User',
          role: role
        };
    
    setUser(newUser);
    console.log("Storing user to localStorage:", JSON.stringify(newUser));
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    console.log("Verified localStorage:", localStorage.getItem('auth_user'));
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
