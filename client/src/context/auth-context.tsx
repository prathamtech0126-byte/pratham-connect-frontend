import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLocation } from "wouter";

export type UserRole = 'superadmin' | 'manager' | 'team_lead' | 'counsellor' | 'director';

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
  team_lead: {
    id: '3',
    username: 'lead',
    name: 'Tom Lead',
    role: 'team_lead',
    avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const login = (role: UserRole) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUser(MOCK_USERS[role]);
      setIsLoading(false);
      setLocation('/');
    }, 800);
  };

  const logout = () => {
    setUser(null);
    setLocation('/login');
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
